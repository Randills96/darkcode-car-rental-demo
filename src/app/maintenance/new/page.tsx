import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { MaintenanceForm } from "@/components/maintenance/maintenance-form";
import { requirePermission } from "@/lib/auth/session";
import { getVehiclesForMaintenanceSelect } from "@/lib/services/maintenance";

interface NewMaintenancePageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function NewMaintenancePage({ searchParams }: NewMaintenancePageProps) {
  await requirePermission("maintenance.create");
  const params = await searchParams;
  const vehicles = await getVehiclesForMaintenanceSelect();

  return (
    <DashboardShell title="Record Maintenance">
      <PageHeader
        title="Record Maintenance"
        description="Log vehicle service and set next service reminders"
        backHref="/maintenance"
      />
      <MaintenanceForm vehicles={vehicles} defaultVehicleId={params.vehicleId} />
    </DashboardShell>
  );
}
