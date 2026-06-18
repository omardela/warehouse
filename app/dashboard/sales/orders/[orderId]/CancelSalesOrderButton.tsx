"use client";

import { useRef } from "react";
import { cancelSalesOrderAction } from "../actions";

export function CancelSalesOrderButton({ salesOrderId }: { salesOrderId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={cancelSalesOrderAction} style={{ display: "inline" }}>
      <input type="hidden" name="salesOrderId" value={salesOrderId} />
      <button
        type="button"
        style={{
          padding: "8px 16px",
          borderRadius: "8px",
          border: "1px solid rgba(255,180,171,0.3)",
          background: "rgba(255,180,171,0.08)",
          color: "#ffb4ab",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
        }}
        onClick={() => {
          if (confirm("Are you sure you want to cancel this sales order? This action cannot be undone.")) {
            formRef.current?.requestSubmit();
          }
        }}
      >
        Cancel Order
      </button>
    </form>
  );
}
