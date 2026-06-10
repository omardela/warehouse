/**
 * Prisma client singleton for use throughout the application.
 *
 * Re-exports the singleton from lib/db.ts so there is a single PrismaClient
 * instance regardless of which import path is used.
 */
export { db } from "@/lib/db";
