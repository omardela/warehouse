"use client";

import { useRef } from "react";
import { cancelPurchaseCreditNoteAction } from "../actions";

export function CancelCreditNoteButton({ creditNoteId }: { creditNoteId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={cancelPurchaseCreditNoteAction} style={{ display: "inline" }}>
      <input type="hidden" name="creditNoteId" value={creditNoteId} />
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
          if (confirm("Are you sure you want to cancel this credit note? This action cannot be undone.")) {
            formRef.current?.requestSubmit();
          }
        }}
      >
        Cancel Credit Note
      </button>
    </form>
  );
}
