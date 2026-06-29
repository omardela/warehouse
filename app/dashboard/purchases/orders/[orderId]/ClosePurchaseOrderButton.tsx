"use client";

import { useRef } from "react";
import { closePurchaseOrderAction } from "../actions";

export function ClosePurchaseOrderButton({ purchaseOrderId }: { purchaseOrderId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={closePurchaseOrderAction} style={{ display: "inline" }}>
      <input type="hidden" name="purchaseOrderId" value={purchaseOrderId} />
      <button
        type="button"
        style={{
          padding: "8px 16px",
          borderRadius: "8px",
          border: "1px solid rgba(245,158,11,0.3)",
          background: "rgba(245,158,11,0.08)",
          color: "#f59e0b",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
        }}
        onClick={() => {
          if (
            confirm(
              "Are you sure you want to close this purchase order? The remaining quantity will never be received, and this action cannot be undone."
            )
          ) {
            formRef.current?.requestSubmit();
          }
        }}
      >
        Close Order
      </button>
    </form>
  );
}
