"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { getSession, SESSION_COOKIE_NAME } from "@/core/auth/session";

const SEVEN_DAYS = 7 * 24 * 60 * 60;

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return new TextEncoder().encode(s);
}

export async function switchWarehouseAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const targetId = formData.get("warehouseId");
  if (!targetId || typeof targetId !== "string") return;

  if (targetId === session.warehouseId) redirect("/dashboard");

  // Verify the warehouse belongs to the same org and is active
  const warehouse = await db.warehouse.findUnique({
    where: { id: targetId },
    select: { id: true, organizationId: true, archivedAt: true },
  });

  if (!warehouse || warehouse.organizationId !== session.orgId || warehouse.archivedAt) {
    return;
  }

  // Find the employee's role template in the target warehouse
  const warehouseRole = await db.warehouseRole.findFirst({
    where: { warehouseId: targetId, roleTemplateId: session.roleId },
    select: { id: true, roleTemplateId: true },
  });

  if (!warehouseRole) {
    // No matching role in the target warehouse — cannot switch
    return;
  }

  const token = await new SignJWT({
    employeeId: session.employeeId,
    warehouseId: targetId,
    orgId: session.orgId,
    roleId: warehouseRole.roleTemplateId,
    warehouseRoleId: warehouseRole.id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SEVEN_DAYS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SEVEN_DAYS,
  });

  redirect("/dashboard");
}
