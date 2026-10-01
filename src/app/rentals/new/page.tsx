import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { RentalForm } from "@/components/rentals/rental-form";
import { requirePermission } from "@/lib/auth/session";
import { getRentalFormOptions } from "@/lib/services/rental";
import { getSystemSettings } from "@/lib/services/settings";

interface NewRentalPageProps {
  searchParams: Promise<{ intent?: string }>;
}

export default async function NewRentalPage({ searchParams }: NewRentalPageProps) {
  await requirePermission("rentals.create");
  const { intent } = await searchParams;
  const createIntent = intent === "inquiry" ? "inquiry" : "quick";
  const [{ customers, drivers, brokers, vehicles }, settings] = await Promise.all([
    getRentalFormOptions(),
    getSystemSettings(),
  ]);

  return (
    <DashboardShell title={createIntent === "quick" ? "Quick Hire" : "New Inquiry"}>
      <PageHeader
        title={createIntent === "quick" ? "Quick Hire" : "Create Inquiry"}
        description={
          createIntent === "quick"
            ? "Enter the hire details once and save as confirmed. Record handover on the next screen when the customer collects the vehicle."
            : "Start an inquiry or quote. Confirm later when the vehicle and dates are locked."
        }
        backHref="/rentals"
      />
      <RentalForm
        mode="create"
        createIntent={createIntent}
        defaultValues={{
          includedKm: settings.default_included_km,
          includedKmExtraDay: settings.default_included_km_extra_day,
        }}
        customers={customers}
        vehicles={vehicles}
        drivers={drivers}
        brokers={brokers}
      />
    </DashboardShell>
  );
}
