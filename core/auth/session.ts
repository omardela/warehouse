import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "__session";

export type SessionPayload = {
  employeeId: string;
  warehouseId: string;
  orgId: string;
  roleId: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, getSecret());

    const session: SessionPayload = {
      employeeId: payload.employeeId as string,
      warehouseId: payload.warehouseId as string,
      orgId: payload.orgId as string,
      roleId: payload.roleId as string,
    };

    if (
      !session.employeeId ||
      !session.warehouseId ||
      !session.orgId ||
      !session.roleId
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
