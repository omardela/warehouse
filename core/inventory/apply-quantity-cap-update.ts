import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export interface ApplyQuantityCapUpdateParams {
  /** Table to update, e.g. "purchase_order_lines" (the Prisma @@map name). */
  table: string;
  /** Row id to update. */
  id: string;
  /** Running-total column to increment, e.g. "receivedBaseQuantity". */
  column: string;
  /** Cap column the running total must not exceed, e.g. "baseQuantity". */
  capColumn: string;
  /** Amount to add to `column`. */
  amount: number;
  /**
   * User-facing error message thrown (inside the transaction, causing a
   * rollback) when the update would push `column` past `capColumn`.
   */
  errorMessage: string;
  /**
   * Pass the caller's own Prisma transaction client to have the conditional
   * update participate in that transaction instead of opening a new one.
   */
  tx?: Prisma.TransactionClient;
}

/**
 * Tiny floating-point slack applied to the cap comparison so legitimate
 * receipts/deliveries that land exactly on the cap aren't rejected due to
 * Decimal/float rounding — matches the 0.000001 tolerance used by the
 * pre-transaction validation in the calling actions.
 */
const CAP_EPSILON = 0.000001;

async function runConditionalUpdate(
  client: Prisma.TransactionClient,
  params: ApplyQuantityCapUpdateParams
): Promise<void> {
  const { table, id, column, capColumn, amount, errorMessage } = params;

  // Conditional atomic update: only succeeds if the running total stays at or
  // under the cap. Executed as a raw query so the check-and-increment happens
  // as a single statement under the database's row lock, instead of a
  // read-then-write pair that two concurrent transactions could both pass.
  const affectedRows = await client.$executeRawUnsafe(
    `UPDATE "${table}" SET "${column}" = "${column}" + $1 ` +
      `WHERE "id" = $2 AND "${column}" + $1 <= "${capColumn}" + $3`,
    amount,
    id,
    CAP_EPSILON
  );

  if (affectedRows === 0) {
    throw new Error(errorMessage);
  }
}

/**
 * Called with an external `tx` (the caller's own transaction): the
 * conditional update runs inside that transaction, so a failed cap check
 * rolls back the whole operation along with it.
 */
export async function applyQuantityCapUpdate(
  params: ApplyQuantityCapUpdateParams & { tx: Prisma.TransactionClient }
): Promise<void>;
/**
 * Called without a `tx`: opens its own transaction for the conditional
 * update.
 */
export async function applyQuantityCapUpdate(
  params: ApplyQuantityCapUpdateParams & { tx?: undefined }
): Promise<void>;
export async function applyQuantityCapUpdate(
  params: ApplyQuantityCapUpdateParams
): Promise<void> {
  if (params.tx) {
    return runConditionalUpdate(params.tx, params);
  }

  return db.$transaction((tx) => runConditionalUpdate(tx, params));
}
