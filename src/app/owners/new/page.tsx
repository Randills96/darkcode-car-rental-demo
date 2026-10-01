import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { OwnerForm } from "@/components/owners/owner-form";
import { requirePermission } from "@/lib/auth/session";

export default async function NewOwnerPage() {
  await requirePermission("owners.create");
  return (
    <DashboardShell title="Add Owner">
      <PageHeader title="Add Vehicle Owner" backHref="/owners" />
      <OwnerForm mode="create" />
    </DashboardShell>
  );
}
