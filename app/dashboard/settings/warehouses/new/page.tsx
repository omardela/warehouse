import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { WarehouseForm } from "../WarehouseForm";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export default async function NewWarehousePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  await requirePagePermission(session, "settings.warehouse.create");

  return <WarehouseForm mode="create" />;
}
