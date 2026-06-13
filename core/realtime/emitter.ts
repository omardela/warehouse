/**
 * Server-side SSE connection manager (singleton).
 *
 * Keyed by warehouseId so that events are only delivered to clients
 * connected to the relevant warehouse.
 *
 * Uses globalThis to survive hot-reloads in development — same pattern
 * as lib/db.ts.
 */

export type SSEEvent =
  | {
      type: "stock.updated";
      payload: {
        productId: string;
        warehouseId: string;
        newBalance: number;
      };
    }
  | {
      type: "notification.new";
      payload: {
        notificationId: string;
        type: string;
        summary: string;
      };
    };

class SSEEmitter {
  private subscribers = new Map<string, Set<ReadableStreamDefaultController>>();

  subscribe(
    warehouseId: string,
    controller: ReadableStreamDefaultController
  ): void {
    let set = this.subscribers.get(warehouseId);
    if (!set) {
      set = new Set();
      this.subscribers.set(warehouseId, set);
    }
    set.add(controller);
  }

  unsubscribe(
    warehouseId: string,
    controller: ReadableStreamDefaultController
  ): void {
    const set = this.subscribers.get(warehouseId);
    if (!set) return;
    set.delete(controller);
    if (set.size === 0) {
      this.subscribers.delete(warehouseId);
    }
  }

  emit(warehouseId: string, event: SSEEvent): void {
    const set = this.subscribers.get(warehouseId);
    if (!set || set.size === 0) return;

    const message = `data: ${JSON.stringify(event)}\n\n`;
    const encoded = new TextEncoder().encode(message);

    const dead: ReadableStreamDefaultController[] = [];

    for (const controller of set) {
      try {
        controller.enqueue(encoded);
      } catch {
        // Controller is closed / errored — mark for removal
        dead.push(controller);
      }
    }

    for (const controller of dead) {
      set.delete(controller);
    }
    if (set.size === 0) {
      this.subscribers.delete(warehouseId);
    }
  }
}

// ── Singleton via globalThis (survives Next.js hot-reload) ────────────────────

const globalWithEmitter = globalThis as unknown as {
  __sseEmitter: SSEEmitter | undefined;
};

export const emitter: SSEEmitter =
  globalWithEmitter.__sseEmitter ?? new SSEEmitter();

if (process.env.NODE_ENV !== "production") {
  globalWithEmitter.__sseEmitter = emitter;
}
