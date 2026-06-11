import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { WarehouseForm } from "../WarehouseForm";

export default async function NewWarehousePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <WarehouseForm mode="create" />;
}
