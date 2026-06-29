// ─────────────────────────────────────────────────────────────────────────────
// computeOutstandingBalance
//
// Single source of truth for "how much is still owed on this invoice".
// Formula: remaining = invoice.totalAmount - totalPaid - totalConfirmedCreditNotes
//
// Confirmed Credit Notes (any status other than CANCELLED) reduce the balance the
// same way a Payment does — they represent goods returned, so the counterparty owes
// less. CreditNote does not store a precomputed total, so each line's total is
// derived as displayQuantity * unitPrice, matching how Invoice.totalAmount is summed
// from its lines elsewhere in this codebase.
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceForBalance {
  totalAmount: { toString(): string } | number;
  payments: { amount: { toString(): string } | number }[];
  creditNotes?: {
    lines: {
      displayQuantity: { toString(): string } | number;
      unitPrice: { toString(): string } | number;
    }[];
  }[];
}

export function computeOutstandingBalance(invoice: InvoiceForBalance): number {
  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const totalConfirmedCreditNotes = (invoice.creditNotes ?? []).reduce((sum, cn) => {
    const creditNoteTotal = cn.lines.reduce(
      (lineSum, l) => lineSum + Number(l.displayQuantity) * Number(l.unitPrice),
      0
    );
    return sum + creditNoteTotal;
  }, 0);

  return Number(invoice.totalAmount) - totalPaid - totalConfirmedCreditNotes;
}
