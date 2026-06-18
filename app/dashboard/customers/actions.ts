"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomerActionState =
  | { success: true; customerId: string }
  | { success: true }
  | { error: string }
  | null;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const paymentTermsEnum = z.enum(["COD", "NET_15", "NET_30", "NET_60", "NET_90"]);

const creditLimitField = z
  .union([z.coerce.number({ error: "Credit limit must be a number" }).min(0, "Credit limit must be non-negative"), z.literal("")])
  .optional()
  .transform((val) => (val === "" || val == null ? undefined : val));

const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(200),
  email: z.string().email("Invalid email address").max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  paymentTerms: paymentTermsEnum.optional().or(z.literal("")),
  creditLimit: creditLimitField,
});

const updateCustomerSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1, "Customer name is required").max(200),
  email: z.string().email("Invalid email address").max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  paymentTerms: paymentTermsEnum.optional().or(z.literal("")),
  creditLimit: creditLimitField,
});

// ---------------------------------------------------------------------------
// createCustomerAction
// ---------------------------------------------------------------------------

export async function createCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "customers.customer.create");
  } catch {
    return { error: "You do not have permission to create customers." };
  }

  const raw = {
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    paymentTerms: formData.get("paymentTerms") || undefined,
    creditLimit: formData.get("creditLimit") || undefined,
  };

  const parsed = createCustomerSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      error:
        errors.name?.[0] ??
        errors.email?.[0] ??
        errors.paymentTerms?.[0] ??
        errors.creditLimit?.[0] ??
        "Invalid form data",
    };
  }

  const { name, email, phone, address, paymentTerms, creditLimit } = parsed.data;

  const customer = await db.customer.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      paymentTerms: paymentTerms || null,
      creditLimit: creditLimit != null ? new Prisma.Decimal(creditLimit.toFixed(2)) : null,
      organizationId: session.orgId,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "customers.customer.create",
    entityType: "Customer",
    entityId: customer.id,
    after: {
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      paymentTerms: paymentTerms || null,
      creditLimit: creditLimit != null ? creditLimit.toFixed(2) : null,
    },
  });

  revalidatePath("/dashboard/customers");

  return { success: true, customerId: customer.id };
}

// ---------------------------------------------------------------------------
// updateCustomerAction
// ---------------------------------------------------------------------------

export async function updateCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "customers.customer.update");
  } catch {
    return { error: "You do not have permission to update customers." };
  }

  const parsed = updateCustomerSchema.safeParse({
    customerId: formData.get("customerId"),
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    paymentTerms: formData.get("paymentTerms") || undefined,
    creditLimit: formData.get("creditLimit") || undefined,
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      error:
        errors.name?.[0] ??
        errors.email?.[0] ??
        errors.paymentTerms?.[0] ??
        errors.creditLimit?.[0] ??
        "Invalid form data",
    };
  }

  const { customerId, name, email, phone, address, paymentTerms, creditLimit } = parsed.data;

  const existing = await db.customer.findUnique({
    where: { id: customerId },
    select: {
      organizationId: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      paymentTerms: true,
      creditLimit: true,
    },
  });

  if (!existing || existing.organizationId !== session.orgId) {
    return { error: "Customer not found." };
  }

  await db.customer.update({
    where: { id: customerId },
    data: {
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      paymentTerms: paymentTerms || null,
      creditLimit: creditLimit != null ? new Prisma.Decimal(creditLimit.toFixed(2)) : null,
    },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "customers.customer.update",
    entityType: "Customer",
    entityId: customerId,
    before: {
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      address: existing.address,
      paymentTerms: existing.paymentTerms,
      creditLimit: existing.creditLimit != null ? existing.creditLimit.toFixed(2) : null,
    },
    after: {
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      paymentTerms: paymentTerms || null,
      creditLimit: creditLimit != null ? creditLimit.toFixed(2) : null,
    },
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}`);

  return { success: true };
}

// ---------------------------------------------------------------------------
// archiveCustomerAction
// ---------------------------------------------------------------------------

export async function archiveCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "customers.customer.archive");
  } catch {
    return { error: "You do not have permission to archive customers." };
  }

  const customerId = formData.get("customerId");
  if (!customerId || typeof customerId !== "string") {
    return { error: "Customer ID is required." };
  }

  const existing = await db.customer.findUnique({
    where: { id: customerId },
    select: { organizationId: true, archivedAt: true, name: true },
  });

  if (!existing || existing.organizationId !== session.orgId) {
    return { error: "Customer not found." };
  }

  if (existing.archivedAt !== null) {
    return { error: "Customer is already archived." };
  }

  const now = new Date();

  await db.customer.update({
    where: { id: customerId },
    data: { archivedAt: now },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "customers.customer.archive",
    entityType: "Customer",
    entityId: customerId,
    after: { archivedAt: now.toISOString() },
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}`);

  return { success: true };
}
