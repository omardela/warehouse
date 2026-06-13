import { getSession } from "@/core/auth/session";
import { emitter } from "@/core/realtime/emitter";

export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 30_000;

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { warehouseId } = session;

  let controller: ReadableStreamDefaultController<Uint8Array>;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      emitter.subscribe(warehouseId, controller);

      // Send an initial comment so the browser registers the connection
      const heartbeat = new TextEncoder().encode(": heartbeat\n\n");
      try {
        controller.enqueue(heartbeat);
      } catch {
        // ignore
      }

      // Keep-alive heartbeat every 30 seconds
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(heartbeat);
        } catch {
          cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);
    },

    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    if (heartbeatTimer !== undefined) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
    try {
      emitter.unsubscribe(warehouseId, controller);
    } catch {
      // ignore
    }
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
