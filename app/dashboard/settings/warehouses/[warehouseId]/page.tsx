import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { WarehouseForm } from "../WarehouseForm";
import { requirePagePermission } from "@/core/auth/require-page-permission";

interface EditWarehousePageProps {
  params: Promise<{ warehouseId: string }>;
}

export default async function EditWarehousePage({
  params,
}: EditWarehousePageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  await requirePagePermission(session, "settings.warehouse.update");

  const { warehouseId } = await params;

  const warehouse = await db.warehouse.findUnique({
    where: { id: warehouseId },
    select: {
      id: true,
      name: true,
      address: true,
      organizationId: true,
      archivedAt: true,
    },
  });

  if (
    !warehouse ||
    warehouse.organizationId !== session.orgId ||
    warehouse.archivedAt !== null
  ) {
    notFound();
  }

  return (
    <WarehouseForm
      mode="edit"
      warehouseId={warehouse.id}
      initialName={warehouse.name}
      initialAddress={warehouse.address ?? ""}
    />
  );
}
