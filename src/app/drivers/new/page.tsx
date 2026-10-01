import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DriverForm } from "@/components/drivers/driver-form";
import { requirePermission } from "@/lib/auth/session";

export default async function NewDriverPage() {
  await requirePermission("drivers.create");
  return (
    <DashboardShell title="Add Driver">
      <PageHeader title="Add New Driver" backHref="/drivers" />
      <DriverForm mode="create" />
    </DashboardShell>
  );
}
