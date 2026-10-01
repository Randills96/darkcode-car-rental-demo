import { notFound, unstable_rethrow } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DriverForm } from "@/components/drivers/driver-form";
import { driverToFormValues } from "@/lib/mappers/driver";
import { requirePermission } from "@/lib/auth/session";
import { getDriverById } from "@/lib/services/driver";

interface EditDriverPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDriverPage({ params }: EditDriverPageProps) {
  try {
    await requirePermission("drivers.edit");
    const { id } = await params;
    const driver = await getDriverById(id);
    if (!driver) notFound();

    return (
      <DashboardShell title={`Edit ${driver.name}`}>
        <PageHeader title="Edit Driver" description={driver.driverCode} backHref={`/drivers/${driver.id}`} />
        <DriverForm mode="edit" driverId={driver.id} defaultValues={driverToFormValues(driver)} />
      </DashboardShell>
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error loading EditDriverPage:", error);
    throw error;
  }
}
