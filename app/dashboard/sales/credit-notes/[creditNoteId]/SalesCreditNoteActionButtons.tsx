"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  confirmSalesCreditNoteAction,
  cancelSalesCreditNoteAction,
  type CreditNoteActionState,
} from "../actions";

type Action = (prevState: CreditNoteActionState, formData: FormData) => Promise<CreditNoteActionState>;

function ActionForm({
  creditNoteId,
  action,
  label,
  pendingLabel,
  buttonStyle,
  confirmPrompt,
}: {
  creditNoteId: string;
  action: Action;
  label: string;
  pendingLabel: string;
  buttonStyle: React.CSSProperties;
  confirmPrompt?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CreditNoteActionState, FormData>(action, null);

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
        <input type="hidden" name="creditNoteId" value={creditNoteId} />
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

export function SalesCreditNoteActionButtons({
  creditNoteId,
  isDraft,
}: {
  creditNoteId: string;
  isDraft: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
      <Link
        href={`/dashboard/sales/credit-notes/${creditNoteId}/print`}
        target="_blank"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "8px 16px",
          borderRadius: "8px",
          border: "1px solid #222a3e",
          background: "#171f33",
          color: "#dbe2fd",
          fontSize: "13px",
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Print
      </Link>
      {isDraft && (
        <>
          <ActionForm
            creditNoteId={creditNoteId}
            action={confirmSalesCreditNoteAction}
            label="Confirm Credit Note"
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
          <ActionForm
            creditNoteId={creditNoteId}
            action={cancelSalesCreditNoteAction}
            label="Cancel Credit Note"
            pendingLabel="Cancelling…"
            confirmPrompt="Are you sure you want to cancel this credit note? This action cannot be undone."
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
        </>
      )}
    </div>
  );
}
