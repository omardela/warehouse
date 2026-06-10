import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // -------------------------------------------------------------------------
  // RoleTemplate seeds
  // -------------------------------------------------------------------------
  const roleTemplates = [
    { name: "Owner",      description: "Full access to all warehouse resources." },
    { name: "Manager",    description: "Manages daily operations, employees, and inventory." },
    { name: "Cashier",    description: "Handles sales invoices and payments." },
    { name: "Accountant", description: "Reads financial reports and manages payments." },
  ];

  for (const rt of roleTemplates) {
    await prisma.roleTemplate.upsert({
      where:  { name: rt.name },
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
    { code: "inventory.product.create",   description: "Create products" },
    { code: "inventory.product.read",     description: "Read products" },
    { code: "inventory.product.update",   description: "Update products" },
    { code: "inventory.product.delete",   description: "Archive/delete products" },
    // Inventory — Movements & Balance
    { code: "inventory.movement.create",  description: "Create inventory movements" },
    { code: "inventory.balance.read",     description: "Read inventory balances" },
    // Sales Invoices
    { code: "sales.invoice.create",       description: "Create sales invoices" },
    { code: "sales.invoice.confirm",      description: "Confirm sales invoices" },
    { code: "sales.invoice.cancel",       description: "Cancel sales invoices" },
    { code: "sales.invoice.read",         description: "Read sales invoices" },
    // Purchase Invoices
    { code: "purchase.invoice.create",    description: "Create purchase invoices" },
    { code: "purchase.invoice.confirm",   description: "Confirm purchase invoices" },
    { code: "purchase.invoice.cancel",    description: "Cancel purchase invoices" },
    { code: "purchase.invoice.read",      description: "Read purchase invoices" },
    // Payments
    { code: "payments.payment.create",    description: "Create payments" },
    { code: "payments.payment.read",      description: "Read payments" },
    // Employees
    { code: "employees.employee.create",  description: "Create employees" },
    { code: "employees.employee.read",    description: "Read employees" },
    { code: "employees.employee.update",  description: "Update employees" },
    { code: "employees.employee.archive", description: "Archive employees" },
    // Customers
    { code: "customers.customer.create",  description: "Create customers" },
    { code: "customers.customer.read",    description: "Read customers" },
    { code: "customers.customer.update",  description: "Update customers" },
    { code: "customers.customer.archive", description: "Archive customers" },
    // Suppliers
    { code: "suppliers.supplier.create",  description: "Create suppliers" },
    { code: "suppliers.supplier.read",    description: "Read suppliers" },
    { code: "suppliers.supplier.update",  description: "Update suppliers" },
    { code: "suppliers.supplier.archive", description: "Archive suppliers" },
    // Reports
    { code: "reports.report.read",        description: "Read reports" },
    // Audit
    { code: "audit.log.read",             description: "Read audit logs" },
    // Settings — Organization
    { code: "settings.org.read",          description: "Read organization settings" },
    { code: "settings.org.update",        description: "Update organization settings" },
    // Settings — Warehouses
    { code: "settings.warehouse.create",  description: "Create warehouses" },
    { code: "settings.warehouse.read",    description: "Read warehouse settings" },
    { code: "settings.warehouse.update",  description: "Update warehouse settings" },
    // Roles
    { code: "roles.role.create",          description: "Create roles" },
    { code: "roles.role.read",            description: "Read roles" },
    { code: "roles.role.update",          description: "Update roles" },
    { code: "roles.role.delete",          description: "Delete roles" },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where:  { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
  }

  console.log(`Seeded ${permissions.length} permissions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
