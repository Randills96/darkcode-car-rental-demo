import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { RecordEndingOdometerForm } from "@/components/rentals/record-ending-odometer-form";
import { requirePermission } from "@/lib/auth/session";
import { getActiveRentalsForEndingOdometer } from "@/lib/services/rental";

interface RecordEndingOdometerPageProps {
  searchParams: Promise<{ rentalId?: string }>;
}

export default async function RecordEndingOdometerPage({
  searchParams,
}: RecordEndingOdometerPageProps) {
  await requirePermission("rentals.return");
  const { rentalId } = await searchParams;
  const rentals = await getActiveRentalsForEndingOdometer();

  return (
    <DashboardShell title="Record Ending Odometer">
      <PageHeader
        title="Record Ending Odometer"
        description="Select the booking and enter the return odometer reading to calculate the final bill"
        backHref="/rentals"
      />
      <RecordEndingOdometerForm rentals={rentals} defaultRentalId={rentalId} />
    </DashboardShell>
  );
}
