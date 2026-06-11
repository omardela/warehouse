"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { writeAuditLog } from "@/core/audit/write-audit-log";

const orgSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
});

export type OrgActionState = { success: true } | { error: string } | null;

export async function updateOrganizationAction(
  _prevState: OrgActionState,
  formData: FormData
): Promise<OrgActionState> {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.flatten().fieldErrors.name?.[0];
    return { error: firstError ?? "Invalid form data" };
  }

  const { name } = parsed.data;

  const existing = await db.organization.findUnique({
    where: { id: session.orgId },
    select: { name: true },
  });

  if (!existing) {
    return { error: "Organization not found" };
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
