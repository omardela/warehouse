"use client";

import { useEffect, useRef, useState } from "react";
import type { SSEEvent } from "@/core/realtime/emitter";

const SSE_URL = "/api/realtime/events";
const MAX_BACKOFF_MS = 30_000;

export function useRealtime() {
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [connected, setConnected] = useState(false);

  // Keep a ref so the reconnect logic always sees the latest attempt number
  const attemptRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // SSE must only run in the browser
    if (typeof window === "undefined") return;

    let cancelled = false;

    function connect() {
      if (cancelled) return;

      const es = new EventSource(SSE_URL);
      esRef.current = es;

      es.onopen = () => {
        if (cancelled) {
          es.close();
          return;
        }
        attemptRef.current = 0;
        setConnected(true);
      };

      es.onmessage = (e: MessageEvent<string>) => {
        if (cancelled) return;
        try {
          const event = JSON.parse(e.data) as SSEEvent;
          setLastEvent(event);
        } catch {
          // malformed frame — ignore
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setConnected(false);

        if (cancelled) return;

        // Exponential backoff: 1s, 2s, 4s … capped at 30s
        const delay = Math.min(
          1_000 * Math.pow(2, attemptRef.current),
          MAX_BACKOFF_MS
        );
        attemptRef.current += 1;

        timerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setConnected(false);
    };
  }, []);

  return { lastEvent, connected };
}
