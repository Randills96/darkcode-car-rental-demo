import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { requirePermission } from "@/lib/auth/session";
import { getActiveOwners } from "@/lib/services/owner";
import { getSystemSettings } from "@/lib/services/settings";

export default async function NewVehiclePage() {
  await requirePermission("vehicles.create");
  const [owners, settings] = await Promise.all([getActiveOwners(), getSystemSettings()]);

  return (
    <DashboardShell title="Add Vehicle">
      <PageHeader title="Add New Vehicle" description="Register a vehicle to the fleet" backHref="/vehicles" />
      <VehicleForm
        mode="create"
        owners={owners}
        defaultValues={{
          includedKm: settings.default_included_km,
          includedKmExtraDay: settings.default_included_km_extra_day,
        }}
      />
    </DashboardShell>
  );
}
