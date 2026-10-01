import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { AvailabilitySearch } from "@/components/vehicles/availability-search";
import { requirePermission } from "@/lib/auth/session";
import { getAvailableVehicles } from "@/lib/services/vehicle";
import type { VehicleType } from "@prisma/client";

interface AvailabilityPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AvailabilityPage({ searchParams }: AvailabilityPageProps) {
  await requirePermission("vehicles.view");
  const params = await searchParams;

  const today = new Date();
  const defaultStart = today.toISOString().split("T")[0];
  const defaultEnd = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const startDate = params.startDate || defaultStart;
  const endDate = params.endDate || defaultEnd;
  const vehicleType = (params.vehicleType || "ALL") as VehicleType | "ALL";

  const results = params.startDate || params.endDate
    ? await getAvailableVehicles({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        vehicleType,
      })
    : [];

  return (
    <DashboardShell title="Vehicle Availability">
      <PageHeader
        title="Vehicle Availability"
        description="Check which vehicles are available for a date range. Overlapping rentals and blocked periods are excluded."
        backHref="/vehicles"
      />
      <AvailabilitySearch
        startDate={params.startDate ? startDate : ""}
        endDate={params.endDate ? endDate : ""}
        vehicleType={vehicleType}
        results={results}
      />
    </DashboardShell>
  );
}
