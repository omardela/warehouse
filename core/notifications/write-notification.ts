import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { emitter } from "@/core/realtime/emitter";

interface WriteNotificationOptions {
  warehouseId: string;
  type: string;
  payload: Prisma.InputJsonValue;
  summary: string;
}

export async function writeNotification({
  warehouseId,
  type,
  payload,
  summary,
}: WriteNotificationOptions): Promise<void> {
  try {
    const notification = await db.notification.create({
      data: { warehouseId, type, payload },
      select: { id: true },
    });
    try {
      emitter.emit(warehouseId, {
        type: "notification.new",
        payload: { notificationId: notification.id, type, summary },
      });
    } catch {
      // SSE emit failure must not propagate
    }
  } catch {
    // Notification failure must never break the caller
  }
}
