"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary, type Dictionary } from "@/core/i18n/get-dictionary";

export type SupplierActionState =
  | { success: true; supplierId?: string }
  | { error: string; fieldErrors?: Record<string, string[]> }
  | null;

function buildSupplierSchema(t: Dictionary) {
  return z.object({
    name: z.string().min(1, t.suppliers.errors.nameRequired).max(200),
    email: z.string().email(t.suppliers.errors.invalidEmail).optional().or(z.literal("")),
    phone: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
  });
}

export async function createSupplierAction(
  _prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const session = await getSession();
  const t = getDictionary(await getLocale());
  if (!session) return { error: t.suppliers.errors.unauthorized };

  try {
    await requirePermission(session, "suppliers.supplier.create");
  } catch {
    return { error: t.suppliers.errors.noCreatePermission };
  }

  const rawEmail = (formData.get("email") as string)?.trim();
  const parsed = buildSupplierSchema(t).safeParse({
    name: formData.get("name"),
    email: rawEmail || undefined,
    phone: (formData.get("phone") as string)?.trim() || undefined,
    address: (formData.get("address") as string)?.trim() || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstMessage = Object.values(fieldErrors).flat()[0] ?? t.suppliers.errors.validationFailed;
    return { error: firstMessage, fieldErrors };
  }

  const { name, email, phone, address } = parsed.data;

  const supplier = await db.supplier.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      organizationId: session.orgId,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "suppliers.supplier.create",
    entityType: "Supplier",
    entityId: supplier.id,
    after: { name, email, phone, address },
  });

  revalidatePath("/dashboard/suppliers");
  return { success: true, supplierId: supplier.id };
}

export async function updateSupplierAction(
  _prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const session = await getSession();
  const t = getDictionary(await getLocale());
  if (!session) return { error: t.suppliers.errors.unauthorized };

  try {
    await requirePermission(session, "suppliers.supplier.update");
  } catch {
    return { error: t.suppliers.errors.noUpdatePermission };
  }

  const supplierId = formData.get("supplierId") as string;
  if (!supplierId) return { error: t.suppliers.errors.supplierIdRequired };

  const rawEmail = (formData.get("email") as string)?.trim();
  const parsed = buildSupplierSchema(t).safeParse({
    name: formData.get("name"),
    email: rawEmail || undefined,
    phone: (formData.get("phone") as string)?.trim() || undefined,
    address: (formData.get("address") as string)?.trim() || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstMessage = Object.values(fieldErrors).flat()[0] ?? t.suppliers.errors.validationFailed;
    return { error: firstMessage, fieldErrors };
  }

  const { name, email, phone, address } = parsed.data;

  const existing = await db.supplier.findUnique({
    where: { id: supplierId },
    select: { organizationId: true, name: true, email: true, phone: true, address: true },
  });

  if (!existing || existing.organizationId !== session.orgId) {
    return { error: t.suppliers.errors.supplierNotFound };
  }

  await db.supplier.update({
    where: { id: supplierId },
    data: {
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
    },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "suppliers.supplier.update",
    entityType: "Supplier",
    entityId: supplierId,
    before: { name: existing.name, email: existing.email, phone: existing.phone, address: existing.address },
    after: { name, email, phone, address },
  });

  revalidatePath("/dashboard/suppliers");
  revalidatePath(`/dashboard/suppliers/${supplierId}`);
  return { success: true };
}

export async function archiveSupplierAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const supplierId = formData.get("supplierId") as string;
  if (!supplierId) return;

  const existing = await db.supplier.findUnique({
    where: { id: supplierId },
    select: { organizationId: true, archivedAt: true, name: true },
  });

  if (!existing || existing.organizationId !== session.orgId) return;

  const isArchived = !!existing.archivedAt;

  await db.supplier.update({
    where: { id: supplierId },
    data: { archivedAt: isArchived ? null : new Date() },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "suppliers.supplier.archive",
    entityType: "Supplier",
    entityId: supplierId,
    before: { archivedAt: existing.archivedAt?.toISOString() ?? null },
    after: { archivedAt: isArchived ? null : new Date().toISOString() },
  });

  revalidatePath("/dashboard/suppliers");
  revalidatePath(`/dashboard/suppliers/${supplierId}`);
}
