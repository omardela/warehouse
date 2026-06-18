"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { MovementType } from "@prisma/client";
import { resolveBaseQuantity } from "@/core/inventory/resolve-base-quantity";
import { recordMovement } from "@/core/inventory/record-movement";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreditNoteActionState =
  | { success: true; creditNoteId?: string }
  | { error: string; fieldErrors?: Record<string, string[]> }
  | null;

// ─── Create Purchase Credit Note ───────────────────────────────────────────

const lineSchema = z.object({
  invoiceLineId: z.string().min(1, "Invoice line is required"),
  quantity: z.coerce.number({ message: "Quantity must be a number" }).min(0, "Quantity cannot be negative"),
});

const createCreditNoteSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  note: z.string().max(2000).optional(),
  lines: z.array(lineSchema).min(1, "At least one line item is required"),
});

export async function createPurchaseCreditNoteAction(
  _prevState: CreditNoteActionState,
  formData: FormData
): Promise<CreditNoteActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "purchases.creditnotes.create");
  } catch {
    return { error: "You do not have permission to create purchase credit notes." };
  }

  const invoiceId = (formData.get("invoiceId") as string)?.trim();
  const lineCount = parseInt((formData.get("lineCount") as string) ?? "0", 10);
  const linesRaw = [];
  for (let i = 0; i < lineCount; i++) {
    const invoiceLineId = (formData.get(`line_invoiceLineId_${i}`) as string)?.trim();
    const quantity = formData.get(`line_quantity_${i}`) as string;
    if (invoiceLineId && quantity) {
      linesRaw.push({ invoiceLineId, quantity });
    }
  }

  const rawNote = (formData.get("note") as string)?.trim();

  const parsed = createCreditNoteSchema.safeParse({
    invoiceId,
    note: rawNote || undefined,
    lines: linesRaw,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstMessage =
      parsed.error.flatten().formErrors[0] ||
      Object.values(fieldErrors).flat()[0] ||
      "Validation failed";
    return { error: firstMessage, fieldErrors };
  }

  const { lines, note } = parsed.data;

  // Filter out zero-quantity lines (staff only return some of the lines)
  const nonZeroLines = lines.filter((l) => l.quantity > 0);
  if (nonZeroLines.length === 0) {
    return { error: "Enter a return quantity for at least one line." };
  }

  const invoice = await db.invoice.findUnique({
    where: { id: parsed.data.invoiceId },
    include: {
      lines: {
        include: {
          product: { select: { id: true, defaultUnitId: true } },
        },
      },
      creditNotes: {
        where: { status: { not: "CANCELLED" } },
        include: { lines: true },
      },
    },
  });

  if (!invoice) return { error: "Purchase invoice not found." };
  if (invoice.warehouseId !== session.warehouseId) return { error: "Access denied." };
  if (invoice.type !== "PURCHASE") return { error: "Not a purchase invoice." };
  if (invoice.status !== "CONFIRMED") {
    return { error: "Credit notes can only be raised against a confirmed purchase invoice." };
  }

  const invoiceLineMap = new Map(invoice.lines.map((l) => [l.id, l]));

  // Sum already-returned quantities per invoice line from prior (non-cancelled) credit notes.
  // CreditNoteLine doesn't store the source invoice line id directly, so we match by
  // productId + unitId — sufficient given an invoice cannot repeat product+unit across lines
  // in practice, and this matches how the form pre-fills one credit-note line per invoice line.
  const alreadyReturnedByProductUnit = new Map<string, number>();
  for (const cn of invoice.creditNotes) {
    for (const cnLine of cn.lines) {
      const key = `${cnLine.productId}__${cnLine.unitId}`;
      alreadyReturnedByProductUnit.set(
        key,
        (alreadyReturnedByProductUnit.get(key) ?? 0) + Number(cnLine.displayQuantity)
      );
    }
  }

  // Validate each return line against the invoice line's quantity minus already-returned
  for (const rl of nonZeroLines) {
    const invLine = invoiceLineMap.get(rl.invoiceLineId);
    if (!invLine) return { error: "One or more lines do not belong to this invoice." };
    const key = `${invLine.productId}__${invLine.unitId}`;
    const alreadyReturned = alreadyReturnedByProductUnit.get(key) ?? 0;
    const available = Number(invLine.quantity) - alreadyReturned;
    if (rl.quantity > available + 0.000001) {
      return {
        error: `Return quantity exceeds the available (not yet returned) quantity for one or more lines.`,
      };
    }
  }

  const creditNote = await db.$transaction(async (tx) => {
    const cn = await tx.creditNote.create({
      data: {
        type: "PURCHASE",
        status: "DRAFT",
        organizationId: session.orgId,
        warehouseId: session.warehouseId,
        originalInvoiceId: invoice.id,
        note: note || null,
        createdById: session.employeeId,
      },
      select: { id: true },
    });

    for (const rl of nonZeroLines) {
      const invLine = invoiceLineMap.get(rl.invoiceLineId)!;
      const baseQty = await resolveBaseQuantity(
        tx,
        invLine.productId,
        invLine.product.defaultUnitId,
        invLine.unitId,
        rl.quantity
      );

      await tx.creditNoteLine.create({
        data: {
          creditNoteId: cn.id,
          productId: invLine.productId,
          unitId: invLine.unitId,
          displayQuantity: rl.quantity,
          baseQuantity: baseQty,
          unitPrice: invLine.unitPrice,
        },
      });
    }

    return cn;
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "purchases.creditnotes.create",
    entityType: "CreditNote",
    entityId: creditNote.id,
    after: { type: "PURCHASE", status: "DRAFT", originalInvoiceId: invoice.id, lines: nonZeroLines.length },
  });

  revalidatePath("/dashboard/purchases/credit-notes");
  revalidatePath(`/dashboard/purchases/${invoice.id}`);
  return { success: true, creditNoteId: creditNote.id };
}

// ─── Confirm Purchase Credit Note ──────────────────────────────────────────

export async function confirmPurchaseCreditNoteAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const creditNoteId = formData.get("creditNoteId") as string;
  if (!creditNoteId) return;

  try {
    await requirePermission(session, "purchases.creditnotes.create");
  } catch {
    throw new Error("You do not have permission to confirm purchase credit notes.");
  }

  const creditNote = await db.creditNote.findUnique({
    where: { id: creditNoteId },
    include: {
      lines: {
        include: {
          unit: { select: { id: true } },
        },
      },
    },
  });

  if (!creditNote) throw new Error("Credit note not found.");
  if (creditNote.warehouseId !== session.warehouseId) throw new Error("Access denied.");
  if (creditNote.type !== "PURCHASE") throw new Error("Not a purchase credit note.");
  if (creditNote.status !== "DRAFT") throw new Error("Only draft credit notes can be confirmed.");

  const beforeStatus = creditNote.status;

  await db.creditNote.update({
    where: { id: creditNoteId },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });

  for (const line of creditNote.lines) {
    await recordMovement({
      warehouseId: session.warehouseId,
      productId: line.productId,
      unitId: line.unitId,
      quantity: Number(line.displayQuantity),
      baseQuantity: Number(line.baseQuantity),
      movementType: MovementType.RETURN_OUT,
      actorId: session.employeeId,
      referenceId: creditNote.id,
      referenceType: "CreditNote",
      notes: `Purchase return against credit note`,
    });
  }

  await writeAuditLog({
    actorId: session.employeeId,
    action: "purchases.creditnotes.confirm",
    entityType: "CreditNote",
    entityId: creditNoteId,
    before: { status: beforeStatus },
    after: { status: "CONFIRMED", confirmedAt: new Date().toISOString() },
  });

  revalidatePath("/dashboard/purchases/credit-notes");
  revalidatePath(`/dashboard/purchases/credit-notes/${creditNoteId}`);
  revalidatePath("/dashboard/inventory/stock");
  redirect(`/dashboard/purchases/credit-notes/${creditNoteId}`);
}

// ─── Cancel Purchase Credit Note ───────────────────────────────────────────

export async function cancelPurchaseCreditNoteAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const creditNoteId = formData.get("creditNoteId") as string;
  if (!creditNoteId) return;

  try {
    await requirePermission(session, "purchases.creditnotes.create");
  } catch {
    throw new Error("You do not have permission to cancel purchase credit notes.");
  }

  const creditNote = await db.creditNote.findUnique({
    where: { id: creditNoteId },
    select: { id: true, status: true, warehouseId: true, type: true },
  });

  if (!creditNote) throw new Error("Credit note not found.");
  if (creditNote.warehouseId !== session.warehouseId) throw new Error("Access denied.");
  if (creditNote.type !== "PURCHASE") throw new Error("Not a purchase credit note.");
  if (creditNote.status !== "DRAFT") {
    throw new Error("Only draft credit notes can be cancelled; confirmed credit notes are immutable.");
  }

  const beforeStatus = creditNote.status;

  await db.creditNote.update({
    where: { id: creditNoteId },
    data: { status: "CANCELLED" },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "purchases.creditnotes.cancel",
    entityType: "CreditNote",
    entityId: creditNoteId,
    before: { status: beforeStatus },
    after: { status: "CANCELLED" },
  });

  revalidatePath("/dashboard/purchases/credit-notes");
  revalidatePath(`/dashboard/purchases/credit-notes/${creditNoteId}`);
  redirect(`/dashboard/purchases/credit-notes/${creditNoteId}`);
}
