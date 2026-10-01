import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { VehicleProfile } from "@/components/vehicles/vehicle-profile";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { DeleteVehicleButton } from "@/components/vehicles/delete-vehicle-button";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getVehicleById, getVehicleStats } from "@/lib/services/vehicle";

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const session = await requirePermission("vehicles.view");
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();

  const stats = await getVehicleStats(id);
  const canEdit = hasPermission(session.user.role, "vehicles.edit");
  const canDelete = hasPermission(session.user.role, "vehicles.delete");
  const canCreateMaintenance = hasPermission(session.user.role, "maintenance.create");

  return (
    <DashboardShell title={vehicle.registrationNumber}>
      <PageHeader
        title={`${vehicle.registrationNumber} — ${vehicle.make} ${vehicle.model}`}
        description={`${vehicle.vehicleCode} · ${vehicle.year}`}
        backHref="/vehicles"
        actions={
          <>
            <VehicleStatusBadge status={vehicle.status} />
            {canEdit && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/vehicles/${vehicle.id}/edit`}><Pencil className="h-4 w-4 mr-2" />Edit</Link>
              </Button>
            )}
            {canDelete && <DeleteVehicleButton vehicleId={vehicle.id} regNumber={vehicle.registrationNumber} />}
          </>
        }
      />
      <VehicleProfile vehicle={vehicle} stats={stats} canEdit={canEdit} canCreateMaintenance={canCreateMaintenance} />
    </DashboardShell>
  );
}
