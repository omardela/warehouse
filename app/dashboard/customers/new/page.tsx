import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { CustomerForm } from "./CustomerForm";
import { createCustomerAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "customers.customer.create");

  return (
    <CustomerForm
      mode="create"
      action={createCustomerAction}
    />
  );
}
