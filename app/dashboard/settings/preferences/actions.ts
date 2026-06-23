"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { LOCALES, LOCALE_COOKIE_NAME, LOCALE_COOKIE_MAX_AGE } from "@/core/i18n/locale";

export type PreferencesActionState = { success: true } | { error: string } | null;

const updateLocaleSchema = z.object({
  locale: z.enum(LOCALES),
});

export async function updateLocaleAction(
  _prevState: PreferencesActionState,
  formData: FormData
): Promise<PreferencesActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const parsed = updateLocaleSchema.safeParse({ locale: formData.get("locale") });
  if (!parsed.success) {
    return { error: "Invalid language selection." };
  }

  const { locale } = parsed.data;

  await db.employee.update({
    where: { id: session.employeeId },
    data: { locale },
  });

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });

  revalidatePath("/", "layout");

  return { success: true };
}
