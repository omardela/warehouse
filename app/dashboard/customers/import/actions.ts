"use server";

import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import type {
  CommitImportResult,
  ImportColumnDef,
  ImportRowError,
  ValidatedRow,
  ValidateImportResult,
} from "@/app/dashboard/_components/csv-import/types";

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

export const CUSTOMER_IMPORT_COLUMNS: ImportColumnDef[] = [
  { key: "name", label: "Name", required: true, aliases: ["customername", "company", "companyname"] },
  { key: "email", label: "Email", required: false, aliases: ["emailaddress"] },
  { key: "phone", label: "Phone", required: false, aliases: ["phonenumber", "tel"] },
  { key: "address", label: "Address", required: false, aliases: [] },
  { key: "paymentTerms", label: "Payment Terms", required: false, aliases: ["terms"] },
  { key: "creditLimit", label: "Credit Limit", required: false, aliases: ["creditlimitamount", "limit"] },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PAYMENT_TERMS = ["COD", "NET_15", "NET_30", "NET_60", "NET_90"] as const;
type PaymentTermsValue = (typeof VALID_PAYMENT_TERMS)[number];

interface CustomerRowInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  creditLimit: string;
}

function toRowInput(values: Record<string, string>): CustomerRowInput {
  return {
    name: values.name ?? "",
    email: values.email ?? "",
    phone: values.phone ?? "",
    address: values.address ?? "",
    paymentTerms: values.paymentTerms ?? "",
    creditLimit: values.creditLimit ?? "",
  };
}

function normalizePaymentTerms(value: string): PaymentTermsValue | null {
  if (!value.trim()) return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const match = VALID_PAYMENT_TERMS.find((t) => t === normalized);
  return match ?? null;
}

function buildValidatedRows(rows: Record<string, string>[]): ValidatedRow[] {
  return rows.map((rawValues, idx) => {
    const rowNumber = idx + 1;
    const input = toRowInput(rawValues);
    const errors: ImportRowError[] = [];

    if (!input.name.trim()) {
      errors.push({ field: "name", message: "Name is required." });
    } else if (input.name.length > 200) {
      errors.push({ field: "name", message: "Name must be 200 characters or fewer." });
    }

    if (input.email.trim() && !EMAIL_RE.test(input.email.trim())) {
      errors.push({ field: "email", message: `Invalid email address: "${input.email.trim()}".` });
    }

    if (input.paymentTerms.trim() && !normalizePaymentTerms(input.paymentTerms)) {
      errors.push({
        field: "paymentTerms",
        message: `Invalid payment terms "${input.paymentTerms.trim()}". Valid values: ${VALID_PAYMENT_TERMS.join(", ")}.`,
      });
    }

    if (input.creditLimit.trim()) {
      const num = Number(input.creditLimit.trim());
      if (Number.isNaN(num) || num <= 0) {
        errors.push({ field: "creditLimit", message: "Credit limit must be a positive number." });
      }
    }

    return { rowNumber, values: rawValues, errors };
  });
}

export async function validateCustomerImportAction(
  rows: Record<string, string>[]
): Promise<ValidateImportResult> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  await requirePermission(session, "settings.import");

  if (rows.length === 0) {
    return { rows: [], validCount: 0, errorCount: 0 };
  }
  if (rows.length > 5000) {
    throw new Error("Import file has too many rows (max 5000 per file).");
  }

  const validated = buildValidatedRows(rows);
  const errorCount = validated.filter((r) => r.errors.length > 0).length;

  return {
    rows: validated,
    validCount: validated.length - errorCount,
    errorCount,
  };
}

export async function commitCustomerImportAction(
  rows: Record<string, string>[],
  skipErrors: boolean
): Promise<CommitImportResult> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  await requirePermission(session, "settings.import");

  if (rows.length === 0) {
    throw new Error("No rows to import.");
  }
  if (rows.length > 5000) {
    throw new Error("Import file has too many rows (max 5000 per file).");
  }

  const validated = buildValidatedRows(rows);
  const errorRows = validated.filter((r) => r.errors.length > 0);
  const validRows = validated.filter((r) => r.errors.length === 0);

  if (errorRows.length > 0 && !skipErrors) {
    throw new Error(
      `Cannot import: ${errorRows.length} row(s) have validation errors. Resolve them or choose "skip errors".`
    );
  }

  if (validRows.length === 0) {
    throw new Error("No valid rows to import.");
  }

  const created = await db.$transaction(async (tx) => {
    const createdIds: string[] = [];
    for (const row of validRows) {
      const input = toRowInput(row.values);
      const paymentTerms = normalizePaymentTerms(input.paymentTerms);
      const creditLimit = input.creditLimit.trim() ? Number(input.creditLimit.trim()) : null;

      const customer = await tx.customer.create({
        data: {
          name: input.name.trim(),
          email: input.email.trim() || null,
          phone: input.phone.trim() || null,
          address: input.address.trim() || null,
          paymentTerms: paymentTerms ?? null,
          creditLimit: creditLimit != null ? creditLimit : null,
          organizationId: session.orgId,
        },
        select: { id: true },
      });
      createdIds.push(customer.id);
    }
    return createdIds;
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "settings.import.customers",
    entityType: "Customer",
    entityId: created[0] ?? "bulk-import",
    after: { importedCount: created.length, skippedCount: errorRows.length },
  });

  return {
    imported: created.length,
    skipped: errorRows.length,
    errors: errorRows.map((r) => ({
      rowNumber: r.rowNumber,
      values: r.values,
      message: r.errors.map((e) => e.message).join("; "),
    })),
  };
}
