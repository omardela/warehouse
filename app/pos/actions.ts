"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { recordMovement } from "@/core/inventory/record-movement";
import { resolveBaseQuantity } from "@/core/inventory/resolve-base-quantity";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
import { getNextDocumentNumber } from "@/core/documents/get-next-document-number";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CartLineInput = {
  productId: string;
  unitId: string;
  quantity: number;
  unitPrice: number;
};

export type PosActionState =
  | {
      success: true;
      invoiceId: string;
      total: number;
      itemCount: number;
      paymentMethod: string;
      lines: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
    }
  | { error: string }
  | null;

// ---------------------------------------------------------------------------
// completeSaleAction
// ---------------------------------------------------------------------------

export async function completeSaleAction(
  _prevState: PosActionState,
  formData: FormData
): Promise<PosActionState> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.pos.errors;

  const cartLineSchema = z.object({
    productId: z.string().min(1, t.productIdRequired),
    unitId: z.string().min(1, t.unitIdRequired),
    quantity: z.number().positive(t.quantityPositive),
    unitPrice: z.number().positive(t.unitPricePositive),
  });

  const cartSchema = z.array(cartLineSchema).min(1, t.cartMinOneItem);

  const session = await getSession();
  if (!session) return { error: t.unauthorized };

  try {
    await requirePermission(session, "pos.sales.create");
  } catch {
    return { error: t.noPermission };
  }

  // Parse cart JSON from formData
  const cartRaw = formData.get("cart");
  if (!cartRaw || typeof cartRaw !== "string") {
    return { error: t.cartMissing };
  }

  // Parse and validate payment method
  const paymentMethodRaw = formData.get("paymentMethod");
  const VALID_METHODS = ["CASH", "CARD", "BANK_TRANSFER"] as const;
  type PaymentMethodType = typeof VALID_METHODS[number];
  if (!paymentMethodRaw || !VALID_METHODS.includes(paymentMethodRaw as PaymentMethodType)) {
    return { error: t.invalidPaymentMethod };
  }
  const paymentMethod = paymentMethodRaw as PaymentMethodType;

  let cartParsed: unknown;
  try {
    cartParsed = JSON.parse(cartRaw);
  } catch {
    return { error: t.cartInvalidFormat };
  }

  const validated = cartSchema.safeParse(cartParsed);
  if (!validated.success) {
    // Zod v4 uses .issues; fall back to flatten for compat with older versions
    const issues = validated.error.issues ?? [];
    const firstError = issues[0]?.message ?? t.cartInvalid;
    return { error: firstError };
  }

  const cart = validated.data;

  // Fetch product names for error messages and receipt lines
  const productIds = [...new Set(cart.map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, defaultUnitId: true },
  });


  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validate all products belong to this org's warehouse
  for (const line of cart) {
    if (!productMap.has(line.productId)) {
      return {
        error: t.productNotFound.replace("{productId}", line.productId),
      };
    }
  }

  // Build invoice line data
  const lineData = cart.map((line) => {
    const totalPrice = line.quantity * line.unitPrice;
    return {
      productId: line.productId,
      unitId: line.unitId,
      quantity: new Prisma.Decimal(line.quantity),
      unitPrice: new Prisma.Decimal(line.unitPrice.toFixed(2)),
      totalPrice: new Prisma.Decimal(totalPrice.toFixed(2)),
      discount: null,
    };
  });

  const totalAmount = lineData.reduce(
    (sum, l) => sum + Number(l.totalPrice),
    0
  );

  const sideEffectCallbacks: Array<() => Promise<{ lowStockTriggered: boolean }>> = [];
  let invoice: {
    id: string;
    lines: Array<{
      productId: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    }>;
  };
  let deliveryNoteId: string;

  try {
    const result = await db.$transaction(async (tx) => {
      // Create CONFIRMED Invoice (type: SALE) — walk-in customer, so customerId is null
      const invoiceNumber = await getNextDocumentNumber(
        session.orgId,
        "SALES_INVOICE",
        new Date().getFullYear(),
        tx
      );
      const invoice = await tx.invoice.create({
        data: {
          number: invoiceNumber,
          type: "SALE",
          status: "CONFIRMED",
          warehouseId: session.warehouseId,
          customerId: null,
          supplierId: null,
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          notes: "POS sale",
          actorId: session.employeeId,
          confirmedAt: new Date(),
          lines: {
            create: lineData,
          },
        },
        select: {
          id: true,
          lines: {
            select: {
              productId: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      });

      // Create the implicit Delivery Note for this POS sale
      const dnNumber = await getNextDocumentNumber(
        session.orgId,
        "DELIVERY_NOTE",
        new Date().getFullYear(),
        tx
      );
      const deliveryNote = await tx.deliveryNote.create({
        data: {
          number: dnNumber,
          salesOrderId: null,
          invoiceId: invoice.id,
          warehouseId: session.warehouseId,
          dispatchedById: session.employeeId,
          note: `Implicit delivery note for POS sale (invoice ${invoice.id})`,
        },
      });

      // Process each cart item sequentially within the same transaction
      for (const line of cart) {
        const product = productMap.get(line.productId)!;
        try {
          const baseQuantity = await resolveBaseQuantity(
            tx,
            line.productId,
            product.defaultUnitId,
            line.unitId,
            line.quantity
          );

          await tx.deliveryNoteLine.create({
            data: {
              deliveryNoteId: deliveryNote.id,
              salesOrderLineId: null,
              productId: line.productId,
              unitId: line.unitId,
              displayQuantity: line.quantity,
              baseQuantity,
            },
          });

          const { runSideEffects } = await recordMovement({
            warehouseId: session.warehouseId,
            productId: line.productId,
            unitId: line.unitId,
            quantity: line.quantity,
            baseQuantity,
            movementType: "SALE_OUT",
            actorId: session.employeeId,
            referenceType: "DeliveryNote",
            referenceId: deliveryNote.id,
            notes: `Delivery note ${deliveryNote.id} (POS sale)`,
            allowNegative: false,
            tx,
          });
          sideEffectCallbacks.push(runSideEffects);
        } catch (err) {
          const msg = err instanceof Error ? err.message : t.stockError;
          // Build the same friendly error message as before, then throw so
          // Prisma rolls back the whole transaction.
          if (msg.toLowerCase().includes("insufficient")) {
            throw new Error(t.outOfStock.replace("{productName}", product.name));
          }
          throw new Error(
            t.stockDeductionFailed
              .replace("{productName}", product.name)
              .replace("{message}", msg)
          );
        }
      }

      // Record payment — POS sales are always settled at point of sale
      const paymentNumber = await getNextDocumentNumber(
        session.orgId,
        "PAYMENT",
        new Date().getFullYear(),
        tx
      );
      await tx.payment.create({
        data: {
          number: paymentNumber,
          invoiceId: invoice.id,
          amount: new Prisma.Decimal(totalAmount.toFixed(2)),
          method: paymentMethod,
          paidAt: new Date(),
          actorId: session.employeeId,
        },
      });

      return { invoice, deliveryNote };
    });

    invoice = result.invoice;
    deliveryNoteId = result.deliveryNote.id;

    // Run deferred recordMovement side effects now that the transaction has committed
    for (const runSideEffects of sideEffectCallbacks) {
      await runSideEffects();
    }

    await writeAuditLog({
      actorId: session.employeeId,
      action: "pos.sale.create",
      entityType: "Invoice",
      entityId: invoice.id,
      after: {
        type: "SALE",
        status: "CONFIRMED",
        warehouseId: session.warehouseId,
        totalAmount: totalAmount.toFixed(2),
        lineCount: cart.length,
        referenceType: "DeliveryNote",
        referenceId: deliveryNoteId,
        paymentMethod,
        paymentAmount: totalAmount.toFixed(2),
      },
      warehouseId: session.warehouseId,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : t.stockError };
  }

  // Build response lines with product names
  const responseLines = invoice.lines.map((l) => {
    const product = productMap.get(l.productId);
    return {
      productId: l.productId,
      productName: product?.name ?? l.productId,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      totalPrice: Number(l.totalPrice),
    };
  });

  return {
    success: true,
    invoiceId: invoice.id,
    total: totalAmount,
    itemCount: cart.length,
    lines: responseLines,
    paymentMethod,
  };
}
