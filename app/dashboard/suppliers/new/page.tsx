import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { SupplierForm } from "./SupplierForm";
import { createSupplierAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewSupplierPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "suppliers.supplier.create");

  return <SupplierForm mode="create" action={createSupplierAction} />;
}
