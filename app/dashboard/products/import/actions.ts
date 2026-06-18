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
// Column definitions (kept here so the page and actions agree on field keys)
// ---------------------------------------------------------------------------

export const PRODUCT_IMPORT_COLUMNS: ImportColumnDef[] = [
  { key: "name", label: "Product Name", required: true, aliases: ["productname", "product"] },
  { key: "sku", label: "SKU", required: true, aliases: ["productsku", "code"] },
  { key: "category", label: "Category", required: false, aliases: ["categoryname"] },
  { key: "baseUnit", label: "Base Unit", required: false, aliases: ["unit", "baseunitname", "unitsymbol"] },
  { key: "barcode", label: "Barcode", required: false, aliases: ["upc", "ean"] },
  { key: "description", label: "Description", required: false, aliases: ["desc", "notes"] },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ProductRowInput {
  name: string;
  sku: string;
  category: string;
  baseUnit: string;
  barcode: string;
  description: string;
}

function toRowInput(values: Record<string, string>): ProductRowInput {
  return {
    name: values.name ?? "",
    sku: values.sku ?? "",
    category: values.category ?? "",
    baseUnit: values.baseUnit ?? "",
    barcode: values.barcode ?? "",
    description: values.description ?? "",
  };
}

async function loadReferenceData(orgId: string) {
  const [categories, units] = await Promise.all([
    db.productCategory.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
    db.productUnit.findMany({ where: { archivedAt: null }, select: { id: true, name: true, symbol: true, isBase: true } }),
    // Note: existing SKUs are checked separately because uniqueness is global,
    // not scoped to the org (Product.sku has a global @unique constraint).
  ]);
  const fallbackUnit = units.find((u) => u.isBase) ?? units[0] ?? null;
  return { categories, units, fallbackUnit };
}

function findCategoryId(categories: { id: string; name: string }[], name: string): string | null {
  if (!name) return null;
  const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return match ? match.id : null;
}

function findUnitId(units: { id: string; name: string; symbol: string }[], value: string): string | null {
  if (!value) return null;
  const match = units.find(
    (u) => u.name.toLowerCase() === value.toLowerCase() || u.symbol.toLowerCase() === value.toLowerCase()
  );
  return match ? match.id : null;
}

async function buildValidatedRows(
  rows: Record<string, string>[],
  orgId: string
): Promise<{
  validated: ValidatedRow[];
  categories: { id: string; name: string }[];
  units: { id: string; name: string; symbol: string; isBase: boolean }[];
  fallbackUnit: { id: string; name: string; symbol: string; isBase: boolean } | null;
}> {
  const { categories, units, fallbackUnit } = await loadReferenceData(orgId);

  const existingSkus = new Set(
    (
      await db.product.findMany({
        select: { sku: true },
      })
    ).map((p) => p.sku.toLowerCase())
  );

  const categoryNames = categories.map((c) => c.name).join(", ") || "(no categories defined)";
  const unitNames = units.map((u) => `${u.name} (${u.symbol})`).join(", ") || "(no units defined)";

  const skusSeenInFile = new Map<string, number>(); // lowercased sku -> first row number

  const validated: ValidatedRow[] = rows.map((rawValues, idx) => {
    const rowNumber = idx + 1;
    const input = toRowInput(rawValues);
    const errors: ImportRowError[] = [];

    if (!input.name.trim()) {
      errors.push({ field: "name", message: "Product name is required." });
    } else if (input.name.length > 200) {
      errors.push({ field: "name", message: "Product name must be 200 characters or fewer." });
    }

    const skuTrimmed = input.sku.trim();
    if (!skuTrimmed) {
      errors.push({ field: "sku", message: "SKU is required." });
    } else {
      const skuLower = skuTrimmed.toLowerCase();
      if (existingSkus.has(skuLower)) {
        errors.push({ field: "sku", message: `Duplicate SKU: "${skuTrimmed}" already exists.` });
      } else if (skusSeenInFile.has(skuLower)) {
        errors.push({
          field: "sku",
          message: `Duplicate SKU within file: also used on row ${skusSeenInFile.get(skuLower)}.`,
        });
      } else {
        skusSeenInFile.set(skuLower, rowNumber);
      }
    }

    if (input.category.trim() && !findCategoryId(categories, input.category.trim())) {
      errors.push({
        field: "category",
        message: `Unknown category "${input.category.trim()}". Valid categories: ${categoryNames}.`,
      });
    }

    if (input.baseUnit.trim()) {
      if (!findUnitId(units, input.baseUnit.trim())) {
        errors.push({
          field: "baseUnit",
          message: `Unknown unit "${input.baseUnit.trim()}". Valid units: ${unitNames}.`,
        });
      }
    } else if (!fallbackUnit) {
      errors.push({
        field: "baseUnit",
        message: `Base unit is required: no default unit is configured for this organization. Valid units: ${unitNames}.`,
      });
    }

    if (input.barcode.length > 100) {
      errors.push({ field: "barcode", message: "Barcode must be 100 characters or fewer." });
    }

    return {
      rowNumber,
      values: rawValues,
      errors,
    };
  });

  return { validated, categories, units, fallbackUnit };
}

export async function validateProductImportAction(
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

  const { validated } = await buildValidatedRows(rows, session.orgId);
  const errorCount = validated.filter((r) => r.errors.length > 0).length;

  return {
    rows: validated,
    validCount: validated.length - errorCount,
    errorCount,
  };
}

export async function commitProductImportAction(
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

  const { validated, categories, units, fallbackUnit } = await buildValidatedRows(rows, session.orgId);

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
      const categoryId = input.category.trim() ? findCategoryId(categories, input.category.trim()) : null;
      const unitId = input.baseUnit.trim() ? findUnitId(units, input.baseUnit.trim()) : null;

      const resolvedUnitId = unitId ?? fallbackUnit?.id;
      if (!resolvedUnitId) {
        throw new Error(
          `Row ${row.rowNumber}: no base unit specified and no default unit is configured for this organization.`
        );
      }

      const product = await tx.product.create({
        data: {
          name: input.name.trim(),
          sku: input.sku.trim(),
          description: input.description.trim() || null,
          barcode: input.barcode.trim() || null,
          categoryId: categoryId ?? null,
          defaultUnitId: resolvedUnitId,
          organizationId: session.orgId,
        },
        select: { id: true },
      });
      createdIds.push(product.id);
    }
    return createdIds;
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "settings.import.products",
    entityType: "Product",
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
