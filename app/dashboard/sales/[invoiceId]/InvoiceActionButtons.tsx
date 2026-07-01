"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SalesActionState } from "../actions";

type Action = (prevState: SalesActionState, formData: FormData) => Promise<SalesActionState>;

interface InvoiceActionButtonsProps {
  invoiceId: string;
  status: string;
  canConfirm: boolean;
  canCancel: boolean;
  confirmAction: Action;
  cancelAction: Action;
}

function ActionForm({
  invoiceId,
  action,
  label,
  pendingLabel,
  buttonStyle,
  onConfirmPrompt,
}: {
  invoiceId: string;
  action: Action;
  label: string;
  pendingLabel: string;
  buttonStyle: React.CSSProperties;
  onConfirmPrompt?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SalesActionState, FormData>(action, null);

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
            maxWidth: "320px",
          }}
        >
          {state.error}
        </div>
      )}
      <form action={formAction}>
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (onConfirmPrompt && !confirm(onConfirmPrompt)) {
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

export function InvoiceActionButtons({
  invoiceId,
  status,
  canConfirm,
  canCancel,
  confirmAction,
  cancelAction,
}: InvoiceActionButtonsProps) {
  const confirmBtnStyle: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: "8px",
    background: "#0062ff",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 600,
    border: "none",
  };

  const cancelBtnStyle: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid rgba(255,180,171,0.3)",
    background: "rgba(147,0,10,0.1)",
    color: "#ffb4ab",
    fontSize: "13px",
    fontWeight: 500,
  };

  if (status === "DRAFT") {
    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {canConfirm && (
          <ActionForm
            invoiceId={invoiceId}
            action={confirmAction}
            label="Confirm Invoice"
            pendingLabel="Confirming…"
            buttonStyle={confirmBtnStyle}
            onConfirmPrompt="Confirm this invoice? This will deduct stock for all line items. This action cannot be undone."
          />
        )}
        {canCancel && (
          <ActionForm
            invoiceId={invoiceId}
            action={cancelAction}
            label="Cancel Invoice"
            pendingLabel="Cancelling…"
            buttonStyle={cancelBtnStyle}
            onConfirmPrompt="Cancel this draft invoice?"
          />
        )}
      </div>
    );
  }

  if (status === "CONFIRMED") {
    return null;
  }

  // CANCELLED — no actions
  return null;
}
