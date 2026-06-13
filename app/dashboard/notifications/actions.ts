"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";

export async function markNotificationReadAction(id: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await db.notification.updateMany({
    where: {
      id,
      warehouseId: session.warehouseId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await db.notification.updateMany({
    where: {
      warehouseId: session.warehouseId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
}
