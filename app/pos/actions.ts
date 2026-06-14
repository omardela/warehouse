"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { recordMovement } from "@/core/inventory/record-movement";
import { resolveBaseQuantity } from "@/core/inventory/resolve-base-quantity";

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
// Schema
// ---------------------------------------------------------------------------

const cartLineSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  unitId: z.string().min(1, "Unit ID is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unitPrice: z.number().positive("Unit price must be greater than 0"),
});

const cartSchema = z
  .array(cartLineSchema)
  .min(1, "Cart must contain at least one item");

// ---------------------------------------------------------------------------
// completeSaleAction
// ---------------------------------------------------------------------------

export async function completeSaleAction(
  _prevState: PosActionState,
  formData: FormData
): Promise<PosActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "pos.sales.create");
  } catch {
    return { error: "You do not have permission to process POS sales." };
  }

  // Parse cart JSON from formData
  const cartRaw = formData.get("cart");
  if (!cartRaw || typeof cartRaw !== "string") {
    return { error: "Cart data is missing." };
  }

  let cartParsed: unknown;
  try {
    cartParsed = JSON.parse(cartRaw);
  } catch {
    return { error: "Invalid cart data format." };
  }

  const validated = cartSchema.safeParse(cartParsed);
  if (!validated.success) {
    // Zod v4 uses .issues; fall back to flatten for compat with older versions
    const issues = validated.error.issues ?? [];
    const firstError = issues[0]?.message ?? "Invalid cart data.";
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
      return { error: `Product not found: ${line.productId}` };
    }
  }

  // Process each cart item sequentially — each recordMovement has its own transaction
  // so that every balance check sees the updated state from the previous call.
  for (const line of cart) {
    const product = productMap.get(line.productId)!;
    try {
      const baseQuantity = await resolveBaseQuantity(
        db,
        line.productId,
        product.defaultUnitId,
        line.unitId,
        line.quantity
      );
      await recordMovement({
        warehouseId: session.warehouseId,
        productId: line.productId,
        unitId: line.unitId,
        quantity: line.quantity,
        baseQuantity,
        movementType: "SALE_OUT",
        actorId: session.employeeId,
        referenceType: "POS_SALE",
        notes: "POS sale",
        allowNegative: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stock error";
      // Return a user-friendly error referencing the product name
      if (msg.toLowerCase().includes("insufficient")) {
        return { error: `Out of stock: ${product.name}` };
      }
      return { error: `Failed to deduct stock for ${product.name}: ${msg}` };
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

  // Create CONFIRMED Invoice (type: SALE) — walk-in customer, so customerId is null
  const invoice = await db.invoice.create({
    data: {
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
      referenceType: "POS_SALE",
    },
    warehouseId: session.warehouseId,
  });

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
  };
}
