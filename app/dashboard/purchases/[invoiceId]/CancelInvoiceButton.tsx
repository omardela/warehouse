"use client";

import { useActionState } from "react";
import { cancelPurchaseInvoiceAction } from "../actions";

type State = { error: string } | void;

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    cancelPurchaseInvoiceAction,
    undefined
  );

  return (
    <div>
      {state && typeof state === "object" && "error" in state ? (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            background: "rgba(147,0,10,0.15)",
            border: "1px solid rgba(147,0,10,0.3)",
            color: "#ffb4ab",
            fontSize: "12px",
            marginBottom: "8px",
            maxWidth: "340px",
          }}
        >
          {state.error}
        </div>
      ) : null}
      <form action={formAction}>
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,180,171,0.3)",
            background: "rgba(255,180,171,0.08)",
            color: "#ffb4ab",
            fontSize: "13px",
            fontWeight: 500,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
          onClick={(e) => {
            if (!confirm("Are you sure you want to cancel this invoice? This action cannot be undone.")) {
              e.preventDefault();
            }
          }}
        >
          {pending ? "Cancelling…" : "Cancel Invoice"}
        </button>
      </form>
    </div>
  );
}
