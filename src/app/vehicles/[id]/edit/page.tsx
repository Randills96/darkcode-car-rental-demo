import { notFound, unstable_rethrow } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { vehicleToFormValues } from "@/lib/mappers/vehicle";
import { requirePermission } from "@/lib/auth/session";
import { getActiveOwners } from "@/lib/services/owner";
import { getVehicleById } from "@/lib/services/vehicle";

interface EditVehiclePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  try {
    await requirePermission("vehicles.edit");
    const { id } = await params;
    const [vehicle, owners] = await Promise.all([getVehicleById(id), getActiveOwners()]);
    if (!vehicle) notFound();

    return (
      <DashboardShell title={`Edit ${vehicle.registrationNumber}`}>
        <PageHeader title="Edit Vehicle" description={vehicle.registrationNumber} backHref={`/vehicles/${vehicle.id}`} />
        <VehicleForm mode="edit" vehicleId={vehicle.id} defaultValues={vehicleToFormValues(vehicle)} owners={owners} />
      </DashboardShell>
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error loading EditVehiclePage:", error);
    throw error;
  }
}
