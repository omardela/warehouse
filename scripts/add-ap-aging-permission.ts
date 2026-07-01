/**
 * One-off script: insert the reports.ap.view permission and assign it to
 * every WarehouseRole that already holds all permissions (i.e. Owner roles).
 *
 * Run with:
 *   npx tsx scripts/add-ap-aging-permission.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Upsert the permission itself
  const perm = await prisma.permission.upsert({
    where: { code: "reports.ap.view" },
    update: { description: "View AP aging report" },
    create: { code: "reports.ap.view", description: "View AP aging report" },
  });
  console.log(`Permission upserted: ${perm.code} (id: ${perm.id})`);

  // 2. Find the "Owner" role template
  const ownerTemplate = await prisma.roleTemplate.findUnique({
    where: { name: "Owner" },
  });

  if (!ownerTemplate) {
    console.log("No Owner role template found — skipping assignment.");
    return;
  }

  // 3. Find all WarehouseRole rows linked to the Owner template
  const ownerRoles = await prisma.warehouseRole.findMany({
    where: { roleTemplateId: ownerTemplate.id },
    select: { id: true },
  });

  console.log(`Found ${ownerRoles.length} Owner warehouse role(s).`);

  // 4. Assign the permission to each Owner role
  let assigned = 0;
  for (const role of ownerRoles) {
    await prisma.warehouseRolePermission.upsert({
      where: {
        warehouseRoleId_permissionId: {
          warehouseRoleId: role.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: { warehouseRoleId: role.id, permissionId: perm.id },
    });
    assigned++;
  }

  console.log(`Assigned reports.ap.view to ${assigned} Owner role(s). Done.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
