import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // -------------------------------------------------------------------------
  // RoleTemplate seeds
  // -------------------------------------------------------------------------
  const roleTemplates = [
    { name: "Owner", description: "Full access to all warehouse resources." },
    {
      name: "Manager",
      description: "Manages daily operations, employees, and inventory.",
    },
    { name: "Cashier", description: "Handles sales invoices and payments." },
    {
      name: "Accountant",
      description: "Reads financial reports and manages payments.",
    },
  ];

  for (const rt of roleTemplates) {
    await prisma.roleTemplate.upsert({
      where: { name: rt.name },
      update: { description: rt.description },
      create: rt,
    });
  }

  console.log(`Seeded ${roleTemplates.length} role templates.`);

  // -------------------------------------------------------------------------
  // Permission catalog
  // -------------------------------------------------------------------------
  const permissions: { code: string; description: string }[] = [
    // Inventory — Products
    { code: "inventory.product.create", description: "Create products" },
    { code: "inventory.product.read", description: "Read products" },
    { code: "inventory.product.update", description: "Update products" },
    {
      code: "inventory.product.delete",
      description: "Archive/delete products",
    },
    // Inventory — Movements & Balance
    {
      code: "inventory.movement.create",
      description: "Create inventory movements",
    },
    { code: "inventory.balance.read", description: "Read inventory balances" },
    // Sales Invoices
    { code: "sales.invoice.create", description: "Create sales invoices" },
    { code: "sales.invoice.confirm", description: "Confirm sales invoices" },
    { code: "sales.invoice.cancel", description: "Cancel sales invoices" },
    { code: "sales.invoice.read", description: "Read sales invoices" },
    // Purchase Invoices
    {
      code: "purchase.invoice.create",
      description: "Create purchase invoices",
    },
    {
      code: "purchase.invoice.confirm",
      description: "Confirm purchase invoices",
    },
    {
      code: "purchase.invoice.cancel",
      description: "Cancel purchase invoices",
    },
    { code: "purchase.invoice.read", description: "Read purchase invoices" },
    // Payments
    { code: "payments.payment.create", description: "Create payments" },
    { code: "payments.payment.read", description: "Read payments" },
    // Employees
    { code: "employees.employee.create", description: "Create employees" },
    { code: "employees.employee.read", description: "Read employees" },
    { code: "employees.employee.update", description: "Update employees" },
    { code: "employees.employee.archive", description: "Archive employees" },
    // Customers
    { code: "customers.customer.create", description: "Create customers" },
    { code: "customers.customer.read", description: "Read customers" },
    { code: "customers.customer.update", description: "Update customers" },
    { code: "customers.customer.archive", description: "Archive customers" },
    // Suppliers
    { code: "suppliers.supplier.create", description: "Create suppliers" },
    { code: "suppliers.supplier.read", description: "Read suppliers" },
    { code: "suppliers.supplier.update", description: "Update suppliers" },
    { code: "suppliers.supplier.archive", description: "Archive suppliers" },
    // Reports
    { code: "reports.report.read", description: "Read reports" },
    // Audit
    { code: "audit.log.read", description: "Read audit logs" },
    // Settings — Organization
    { code: "settings.org.read", description: "Read organization settings" },
    {
      code: "settings.org.update",
      description: "Update organization settings",
    },
    // Settings — Warehouses
    { code: "settings.warehouse.create", description: "Create warehouses" },
    { code: "settings.warehouse.read", description: "Read warehouse settings" },
    {
      code: "settings.warehouse.update",
      description: "Update warehouse settings",
    },
    // Roles
    { code: "roles.role.create", description: "Create roles" },
    { code: "roles.role.read", description: "Read roles" },
    { code: "roles.role.update", description: "Update roles" },
    { code: "roles.role.delete", description: "Delete roles" },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
  }

  console.log(`Seeded ${permissions.length} permissions.`);

  // -------------------------------------------------------------------------
  // ProductUnit seeds (common units of measure)
  // -------------------------------------------------------------------------
  const productUnits = [
    { name: "Piece",      symbol: "pcs", isBase: true  },
    { name: "Kilogram",   symbol: "kg",  isBase: false },
    { name: "Gram",       symbol: "g",   isBase: false },
    { name: "Liter",      symbol: "L",   isBase: false },
    { name: "Milliliter", symbol: "mL",  isBase: false },
    { name: "Box",        symbol: "box", isBase: false },
    { name: "Carton",     symbol: "ctn", isBase: false },
    { name: "Bottle",     symbol: "btl", isBase: false },
    { name: "Meter",      symbol: "m",   isBase: false },
    { name: "Pack",       symbol: "pk",  isBase: false },
  ];

  for (const unit of productUnits) {
    await prisma.productUnit.upsert({
      where: { symbol: unit.symbol },
      update: { name: unit.name, isBase: unit.isBase },
      create: unit,
    });
  }

  console.log(`Seeded ${productUnits.length} product units.`);

  // -------------------------------------------------------------------------
  // Dev test account: owner@logicore.dev / password: logicore123
  // -------------------------------------------------------------------------
  const ownerRole = await prisma.roleTemplate.findUnique({
    where: { name: "Owner" },
  });

  const org = await prisma.organization.upsert({
    where: { id: "dev-org-001" },
    update: {},
    create: { id: "dev-org-001", name: "LogiCore Demo Org" },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { id: "dev-wh-001" },
    update: {},
    create: {
      id: "dev-wh-001",
      name: "Main Warehouse",
      address: "123 Logistics Ave, New York, NY",
      organizationId: org.id,
    },
  });

  if (ownerRole) {
    const ownerWr = await prisma.warehouseRole.upsert({
      where: {
        warehouseId_roleTemplateId: {
          warehouseId: warehouse.id,
          roleTemplateId: ownerRole.id,
        },
      },
      update: {},
      create: { warehouseId: warehouse.id, roleTemplateId: ownerRole.id },
    });

    // Assign all permissions to the Owner warehouse role
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
      await prisma.warehouseRolePermission.upsert({
        where: {
          warehouseRoleId_permissionId: {
            warehouseRoleId: ownerWr.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: { warehouseRoleId: ownerWr.id, permissionId: perm.id },
      });
    }
    console.log(`Assigned ${allPermissions.length} permissions to Owner role.`);
  }

  const passwordHash = await bcrypt.hash("logicore123", 12);

  // Assign owner employee to the Owner warehouseRole
  if (ownerRole) {
    const ownerWr = await prisma.warehouseRole.findUnique({
      where: {
        warehouseId_roleTemplateId: {
          warehouseId: warehouse.id,
          roleTemplateId: ownerRole.id,
        },
      },
    });
    await prisma.employee.upsert({
      where: { email: "owner@logicore.dev" },
      update: { warehouseRoleId: ownerWr?.id },
      create: {
        name: "Demo Owner",
        email: "owner@logicore.dev",
        passwordHash,
        warehouseId: warehouse.id,
        warehouseRoleId: ownerWr?.id,
      },
    });
  }

  console.log("Dev account: owner@logicore.dev / logicore123");

  // -------------------------------------------------------------------------
  // Role Manager test account — only roles.* permissions
  // -------------------------------------------------------------------------
  const managerTemplate = await prisma.roleTemplate.upsert({
    where: { name: "Role Manager" },
    update: { description: "Can manage warehouse roles and permissions only." },
    create: {
      name: "Role Manager",
      description: "Can manage warehouse roles and permissions only.",
    },
  });

  const managerWr = await prisma.warehouseRole.upsert({
    where: {
      warehouseId_roleTemplateId: {
        warehouseId: warehouse.id,
        roleTemplateId: managerTemplate.id,
      },
    },
    update: {},
    create: { warehouseId: warehouse.id, roleTemplateId: managerTemplate.id },
  });

  // Grant only roles.* permissions to this role
  const rolePermissions = await prisma.permission.findMany({
    where: { code: { startsWith: "roles." } },
  });
  for (const perm of rolePermissions) {
    await prisma.warehouseRolePermission.upsert({
      where: {
        warehouseRoleId_permissionId: {
          warehouseRoleId: managerWr.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: { warehouseRoleId: managerWr.id, permissionId: perm.id },
    });
  }

  const rmHash = await bcrypt.hash("roles123", 12);
  await prisma.employee.upsert({
    where: { email: "rolemanager@logicore.dev" },
    update: { warehouseRoleId: managerWr.id },
    create: {
      name: "Role Manager",
      email: "rolemanager@logicore.dev",
      passwordHash: rmHash,
      warehouseId: warehouse.id,
      warehouseRoleId: managerWr.id,
    },
  });

  console.log("Role Manager account: rolemanager@logicore.dev / roles123");
  console.log(`Assigned ${rolePermissions.length} roles.* permissions to Role Manager.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
