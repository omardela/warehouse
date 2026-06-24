"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { resolveBaseQuantity } from "@/core/inventory/resolve-base-quantity";
import { recordMovement } from "@/core/inventory/record-movement";

// ─── Types ──────────────────────────────────────────────────────────────────

export type StockTransferActionState =
  | { success: true; transferId?: string }
  | { error: string; fieldErrors?: Record<string, string[]> }
  | null;

// ─── Validation ─────────────────────────────────────────────────────────────

const lineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  unitId: z.string().min(1, "Unit is required"),
  quantity: z.coerce
    .number({ message: "Quantity must be a number" })
    .positive("Quantity must be positive"),
});

const createTransferSchema = z
  .object({
    sourceWarehouseId: z.string().min(1, "Source warehouse is required"),
    destinationWarehouseId: z.string().min(1, "Destination warehouse is required"),
    note: z.string().max(2000).optional(),
    lines: z.array(lineSchema).min(1, "At least one line item is required"),
  })
  .refine((data) => data.sourceWarehouseId !== data.destinationWarehouseId, {
    message: "Source and destination warehouses must differ.",
    path: ["destinationWarehouseId"],
  });

// ─── Create Stock Transfer ─────────────────────────────────────────────────

export async function createStockTransferAction(
  _prevState: StockTransferActionState,
  formData: FormData
): Promise<StockTransferActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "inventory.transfers.create");
  } catch {
    return { error: "You do not have permission to create stock transfers." };
  }

  const lineCount = parseInt((formData.get("lineCount") as string) ?? "0", 10);
  const linesRaw = [];
  for (let i = 0; i < lineCount; i++) {
    const productId = (formData.get(`line_productId_${i}`) as string)?.trim();
    const unitId = (formData.get(`line_unitId_${i}`) as string)?.trim();
    const quantity = formData.get(`line_quantity_${i}`) as string;
    if (productId && unitId && quantity) {
      linesRaw.push({ productId, unitId, quantity });
    }
  }

  const rawNote = (formData.get("note") as string)?.trim();

  const parsed = createTransferSchema.safeParse({
    sourceWarehouseId: formData.get("sourceWarehouseId"),
    destinationWarehouseId: formData.get("destinationWarehouseId"),
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

  const { sourceWarehouseId, destinationWarehouseId, note, lines } = parsed.data;

  // Validate both warehouses belong to the user's organization
  const warehouses = await db.warehouse.findMany({
    where: {
      id: { in: [sourceWarehouseId, destinationWarehouseId] },
      organizationId: session.orgId,
      archivedAt: null,
    },
    select: { id: true },
  });
  if (warehouses.length !== 2) {
    return { error: "Source or destination warehouse is invalid or not in your organization." };
  }

  // Validate products belong to org, and fetch defaultUnitId for base-quantity conversion
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, organizationId: session.orgId },
    select: { id: true, defaultUnitId: true },
  });
  if (products.length !== productIds.length) {
    return { error: "One or more products are invalid." };
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  const sideEffectCallbacks: Array<() => Promise<{ lowStockTriggered: boolean }>> = [];

  try {
    const transfer = await db.$transaction(async (tx) => {
      // Resolve base quantities for each line first
      const resolvedLines = [];
      for (const line of lines) {
        const product = productMap.get(line.productId);
        if (!product) throw new Error("Product not found.");
        const baseQuantity = await resolveBaseQuantity(
          tx,
          line.productId,
          product.defaultUnitId,
          line.unitId,
          line.quantity
        );
        resolvedLines.push({ ...line, baseQuantity });
      }

      // Validate source has sufficient stock per line (aggregate by product in case of duplicate lines)
      const baseQtyByProduct = new Map<string, number>();
      for (const line of resolvedLines) {
        baseQtyByProduct.set(
          line.productId,
          (baseQtyByProduct.get(line.productId) ?? 0) + line.baseQuantity
        );
      }

      for (const [productId, requiredQty] of baseQtyByProduct) {
        const balance = await tx.inventoryBalance.findUnique({
          where: { warehouseId_productId: { warehouseId: sourceWarehouseId, productId } },
          select: { currentQuantity: true },
        });
        const currentQty = balance ? Number(balance.currentQuantity) : 0;
        if (currentQty - requiredQty < 0) {
          throw new Error(
            `Insufficient stock for product (current balance ${currentQty.toFixed(4)}, ` +
              `required ${requiredQty.toFixed(4)}) in source warehouse.`
          );
        }
      }

      // Create the StockTransfer header
      const created = await tx.stockTransfer.create({
        data: {
          sourceWarehouseId,
          destinationWarehouseId,
          transferredById: session.employeeId,
          note: note || null,
        },
        select: { id: true },
      });

      // For each line: create StockTransferLine, then balance-upsert + movement insert for OUT and IN
      for (const line of resolvedLines) {
        const transferLine = await tx.stockTransferLine.create({
          data: {
            transferId: created.id,
            productId: line.productId,
            unitId: line.unitId,
            displayQuantity: line.quantity,
            baseQuantity: line.baseQuantity,
          },
          select: { id: true },
        });

        // --- TRANSFER_OUT on source ---
        // The aggregate sufficiency pre-check above already ran with a friendly
        // message; recordMovement()'s own check (allowNegative: false) is a
        // redundant safety net here.
        const out = await recordMovement({
          warehouseId: sourceWarehouseId,
          productId: line.productId,
          unitId: line.unitId,
          quantity: line.quantity,
          baseQuantity: line.baseQuantity,
          movementType: "TRANSFER_OUT",
          actorId: session.employeeId,
          referenceId: transferLine.id,
          referenceType: "StockTransferLine",
          notes: `Stock transfer to destination warehouse`,
          tx,
        });
        sideEffectCallbacks.push(out.runSideEffects);

        // --- TRANSFER_IN on destination ---
        const inn = await recordMovement({
          warehouseId: destinationWarehouseId,
          productId: line.productId,
          unitId: line.unitId,
          quantity: line.quantity,
          baseQuantity: line.baseQuantity,
          movementType: "TRANSFER_IN",
          actorId: session.employeeId,
          referenceId: transferLine.id,
          referenceType: "StockTransferLine",
          notes: `Stock transfer from source warehouse`,
          tx,
        });
        sideEffectCallbacks.push(inn.runSideEffects);
      }

      return created;
    });

    // Run deferred recordMovement side effects now that the transaction has committed
    for (const runSideEffects of sideEffectCallbacks) {
      await runSideEffects();
    }

    await writeAuditLog({
      actorId: session.employeeId,
      action: "inventory.transfers.create",
      entityType: "StockTransfer",
      entityId: transfer.id,
      after: {
        sourceWarehouseId,
        destinationWarehouseId,
        note: note ?? null,
        lines: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, quantity: l.quantity })),
      },
    });

    revalidatePath("/dashboard/inventory/transfers");
    revalidatePath("/dashboard/inventory/movements");
    revalidatePath("/dashboard/inventory/stock");

    return { success: true, transferId: transfer.id };
  } catch (err: unknown) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Failed to create stock transfer. Please try again." };
  }
}
