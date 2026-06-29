"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  confirmSalesOrderAction,
  cancelSalesOrderAction,
  closeSalesOrderAction,
  type SalesOrderActionState,
} from "../actions";

type Action = (prevState: SalesOrderActionState, formData: FormData) => Promise<SalesOrderActionState>;

function ActionForm({
  salesOrderId,
  action,
  label,
  pendingLabel,
  buttonStyle,
  confirmPrompt,
}: {
  salesOrderId: string;
  action: Action;
  label: string;
  pendingLabel: string;
  buttonStyle: React.CSSProperties;
  confirmPrompt?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SalesOrderActionState, FormData>(action, null);

  useEffect(() => {
    if (state && "success" in state) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <div>
      {state && "error" in state && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            background: "rgba(147,0,10,0.15)",
            border: "1px solid rgba(147,0,10,0.3)",
            color: "#ffb4ab",
            fontSize: "12px",
            marginBottom: "8px",
            maxWidth: "360px",
          }}
        >
          {state.error}
        </div>
      )}
      <form action={formAction}>
        <input type="hidden" name="salesOrderId" value={salesOrderId} />
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (confirmPrompt && !confirm(confirmPrompt)) {
              e.preventDefault();
            }
          }}
          style={{
            ...buttonStyle,
            opacity: pending ? 0.7 : 1,
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          {pending ? pendingLabel : label}
        </button>
      </form>
    </div>
  );
}

export function SalesOrderActionButtons({
  salesOrderId,
  canConfirm,
  canCancel,
  canClose,
}: {
  salesOrderId: string;
  canConfirm: boolean;
  canCancel: boolean;
  canClose: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
      {canConfirm && (
        <ActionForm
          salesOrderId={salesOrderId}
          action={confirmSalesOrderAction}
          label="Confirm Order"
          pendingLabel="Confirming…"
          buttonStyle={{
            padding: "8px 20px",
            borderRadius: "8px",
            background: "#0062ff",
            border: "none",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
          }}
        />
      )}
      {canCancel && (
        <ActionForm
          salesOrderId={salesOrderId}
          action={cancelSalesOrderAction}
          label="Cancel Order"
          pendingLabel="Cancelling…"
          confirmPrompt="Are you sure you want to cancel this sales order? This action cannot be undone."
          buttonStyle={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,180,171,0.3)",
            background: "rgba(255,180,171,0.08)",
            color: "#ffb4ab",
            fontSize: "13px",
            fontWeight: 500,
          }}
        />
      )}
      {canClose && (
        <ActionForm
          salesOrderId={salesOrderId}
          action={closeSalesOrderAction}
          label="Close Order"
          pendingLabel="Closing…"
          confirmPrompt="Are you sure you want to close this sales order? The remaining quantity will never be fulfilled. This action cannot be undone."
          buttonStyle={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(140,144,162,0.3)",
            background: "rgba(140,144,162,0.08)",
            color: "#8c90a2",
            fontSize: "13px",
            fontWeight: 500,
          }}
        />
      )}
    </div>
  );
}
