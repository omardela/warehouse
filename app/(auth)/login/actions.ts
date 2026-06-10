"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/core/auth/session";

type LoginResult = { error: string } | never;

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<LoginResult> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "Invalid email or password" };
  }

  // Look up employee — must not be archived
  const employee = await db.employee.findFirst({
    where: {
      email,
      archivedAt: null,
    },
  });

  // Verify password (always run compare to prevent timing side-channel)
  const passwordMatches = employee
    ? await bcrypt.compare(password, employee.passwordHash)
    : false;

  if (!employee || !passwordMatches) {
    // Log failed attempt if the employee record was found
    if (employee) {
      await db.auditLog.create({
        data: {
          actorId: employee.id,
          action: "auth.login_failed",
          entityType: "Employee",
          entityId: employee.id,
        },
      });
    }
    return { error: "Invalid email or password" };
  }

  // Fetch warehouse to get orgId
  const warehouse = await db.warehouse.findUnique({
    where: { id: employee.warehouseId },
    select: { organizationId: true },
  });

  if (!warehouse) {
    return { error: "Invalid email or password" };
  }

  // Fetch the first WarehouseRole for this warehouse to get roleId
  const warehouseRole = await db.warehouseRole.findFirst({
    where: { warehouseId: employee.warehouseId },
    select: { roleTemplateId: true },
  });

  const roleId = warehouseRole?.roleTemplateId ?? "";

  // Sign JWT (HS256)
  const token = await new SignJWT({
    employeeId: employee.id,
    warehouseId: employee.warehouseId,
    orgId: warehouse.organizationId,
    roleId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SEVEN_DAYS_IN_SECONDS}s`)
    .sign(getSecret());

  // Set HTTP-only session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SEVEN_DAYS_IN_SECONDS,
  });

  // TODO: replace with audit utility from issue #003
  await db.auditLog.create({
    data: {
      actorId: employee.id,
      action: "auth.login",
      entityType: "Employee",
      entityId: employee.id,
      after: { email: employee.email },
    },
  });

  redirect("/dashboard");
}
