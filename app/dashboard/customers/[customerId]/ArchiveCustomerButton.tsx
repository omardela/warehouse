"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CustomerActionState } from "../actions";
import { useTranslations } from "@/providers/locale-context";

type ArchiveAction = (
  prevState: CustomerActionState,
  formData: FormData
) => Promise<CustomerActionState>;

export function ArchiveCustomerButton({
  customerId,
  action,
}: {
  customerId: string;
  action: ArchiveAction;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<CustomerActionState, FormData>(action, null);

  useEffect(() => {
    if (state && "success" in state) {
      router.push("/dashboard/customers");
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="customerId" value={customerId} />
      {state && "error" in state && (
        <div style={{ fontSize: "12px", color: "#ffb4ab", marginBottom: "8px" }}>{state.error}</div>
      )}
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!confirm(t.customers.archive.confirmMessage)) {
            e.preventDefault();
          }
        }}
        style={{
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid rgba(255,180,171,0.3)",
          background: "rgba(147,0,10,0.1)",
          color: "#ffb4ab",
          fontSize: "13px",
          fontWeight: 500,
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? t.customers.archive.archiving : t.customers.archive.archiveCustomer}
      </button>
    </form>
  );
}
