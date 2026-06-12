import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { OrgSettingsForm } from "./OrgSettingsForm";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export default async function OrganizationSettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  await requirePagePermission(session, "settings.org.read");

  const org = await db.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, name: true },
  });

  if (!org) {
    redirect("/login");
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "#0b1326" }}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Page header */}
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "#dbe2fd" }}
          >
            Organization Settings
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#8c90a2" }}>
            Manage your organization profile.
          </p>
        </div>

        <OrgSettingsForm initialName={org.name} />
      </div>
    </div>
  );
}
