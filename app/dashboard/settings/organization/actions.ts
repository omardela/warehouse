"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";

export type OrgActionState = { success: true } | { error: string } | null;

export async function updateOrganizationAction(
  _prevState: OrgActionState,
  formData: FormData
): Promise<OrgActionState> {
  const session = await getSession();
  const dict = getDictionary(await getLocale()).employees.organization;
  if (!session) {
    return { error: dict.unauthorized };
  }

  try {
    await requirePermission(session, "settings.org.update");
  } catch {
    return { error: dict.noPermissionUpdate };
  }

  const orgSchema = z.object({
    name: z.string().min(1, dict.nameRequired).max(100),
  });

  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.flatten().fieldErrors.name?.[0];
    return { error: firstError ?? dict.invalidFormData };
  }

  const { name } = parsed.data;

  const existing = await db.organization.findUnique({
    where: { id: session.orgId },
    select: { name: true },
  });

  if (!existing) {
    return { error: dict.organizationNotFound };
  }

  await db.organization.update({
    where: { id: session.orgId },
    data: { name },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "warehouse.update",
    entityType: "Organization",
    entityId: session.orgId,
    before: { name: existing.name },
    after: { name },
  });

  return { success: true };
}
