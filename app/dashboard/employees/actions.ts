"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { isOwnerRole } from "@/core/auth/owner-guard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmployeeActionState =
  | { success: true; employeeId: string }
  | { success: true }
  | { error: string }
  | null;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createEmployeeSchema = z.object({
  name: z.string().min(1, "Full name is required").max(100),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255),
  warehouseRoleId: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const updateRoleSchema = z.object({
  employeeId: z.string().min(1),
  warehouseRoleId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// createEmployeeAction
// ---------------------------------------------------------------------------

export async function createEmployeeAction(
  _prevState: EmployeeActionState,
  formData: FormData
): Promise<EmployeeActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "employees.employee.create");
  } catch {
    return { error: "You do not have permission to create employees." };
  }

  const rawRole = formData.get("warehouseRoleId");
  const parsed = createEmployeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    warehouseRoleId:
      typeof rawRole === "string" && rawRole.trim() !== "" ? rawRole.trim() : undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const firstError =
      errors.name?.[0] ??
      errors.email?.[0] ??
      errors.password?.[0] ??
      errors.warehouseRoleId?.[0] ??
      "Invalid form data";
    return { error: firstError };
  }

  const { name, email, warehouseRoleId, password } = parsed.data;

  // Check for duplicate email
  const existing = await db.employee.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { error: "An employee with this email already exists." };
  }

  // If a role is provided, verify it belongs to this warehouse and is not Owner
  if (warehouseRoleId) {
    const role = await db.warehouseRole.findUnique({
      where: { id: warehouseRoleId },
      select: { warehouseId: true, roleTemplate: { select: { name: true } } },
    });
    if (!role || role.warehouseId !== session.warehouseId) {
      return { error: "Selected role is not valid for this warehouse." };
    }
    if (isOwnerRole(role.roleTemplate.name)) {
      return { error: "The Owner role cannot be assigned to new employees." };
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const employee = await db.employee.create({
    data: {
      name,
      email,
      passwordHash,
      warehouseId: session.warehouseId,
      warehouseRoleId: warehouseRoleId ?? null,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "employees.employee.create",
    entityType: "Employee",
    entityId: employee.id,
    after: { name, email, warehouseRoleId: warehouseRoleId ?? null },
  });

  revalidatePath("/dashboard/employees");

  return { success: true, employeeId: employee.id };
}

// ---------------------------------------------------------------------------
// updateEmployeeRoleAction
// ---------------------------------------------------------------------------

export async function updateEmployeeRoleAction(
  _prevState: EmployeeActionState,
  formData: FormData
): Promise<EmployeeActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "employees.employee.update");
  } catch {
    return { error: "You do not have permission to assign roles." };
  }

  const rawRole = formData.get("warehouseRoleId");
  const parsed = updateRoleSchema.safeParse({
    employeeId: formData.get("employeeId"),
    warehouseRoleId:
      typeof rawRole === "string" && rawRole.trim() !== "" ? rawRole.trim() : undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid form data." };
  }

  const { employeeId, warehouseRoleId } = parsed.data;

  // Verify employee belongs to this warehouse
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      warehouseId: true,
      warehouseRoleId: true,
      name: true,
      warehouseRole: { select: { roleTemplate: { select: { name: true } } } },
    },
  });

  if (!employee || employee.warehouseId !== session.warehouseId) {
    return { error: "Employee not found." };
  }

  if (isOwnerRole(employee.warehouseRole?.roleTemplate.name)) {
    return { error: "The Owner's role assignment is system-protected and cannot be changed." };
  }

  // If a role is provided, verify it belongs to this warehouse and is not the Owner role
  if (warehouseRoleId) {
    const role = await db.warehouseRole.findUnique({
      where: { id: warehouseRoleId },
      select: { warehouseId: true, roleTemplate: { select: { name: true } } },
    });
    if (!role || role.warehouseId !== session.warehouseId) {
      return { error: "Selected role is not valid for this warehouse." };
    }
    if (isOwnerRole(role.roleTemplate.name)) {
      return { error: "The Owner role cannot be assigned to other employees." };
    }
  }

  await db.employee.update({
    where: { id: employeeId },
    data: { warehouseRoleId: warehouseRoleId ?? null },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "employees.employee.update",
    entityType: "Employee",
    entityId: employeeId,
    before: { warehouseRoleId: employee.warehouseRoleId },
    after: { warehouseRoleId: warehouseRoleId ?? null },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${employeeId}`);

  return { success: true };
}

// ---------------------------------------------------------------------------
// archiveEmployeeAction
// ---------------------------------------------------------------------------

export async function archiveEmployeeAction(
  _prevState: EmployeeActionState,
  formData: FormData
): Promise<EmployeeActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "employees.employee.archive");
  } catch {
    return { error: "You do not have permission to archive employees." };
  }

  const employeeId = formData.get("employeeId");
  if (!employeeId || typeof employeeId !== "string") {
    return { error: "Employee ID is required." };
  }

  // Prevent self-archiving
  if (employeeId === session.employeeId) {
    return { error: "You cannot archive your own account." };
  }

  // Verify employee belongs to this warehouse and is not already archived
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      warehouseId: true,
      archivedAt: true,
      name: true,
      warehouseRole: { select: { roleTemplate: { select: { name: true } } } },
    },
  });

  if (!employee || employee.warehouseId !== session.warehouseId) {
    return { error: "Employee not found." };
  }

  if (isOwnerRole(employee.warehouseRole?.roleTemplate.name)) {
    return { error: "The Owner account cannot be archived." };
  }

  if (employee.archivedAt !== null) {
    return { error: "Employee is already archived." };
  }

  const now = new Date();

  await db.employee.update({
    where: { id: employeeId },
    data: { archivedAt: now },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "employees.employee.archive",
    entityType: "Employee",
    entityId: employeeId,
    after: { archivedAt: now.toISOString() },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${employeeId}`);

  return { success: true };
}
