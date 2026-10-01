import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DriverProfile } from "@/components/drivers/driver-profile";
import { DeleteDriverButton } from "@/components/drivers/delete-driver-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getDriverById, getDriverStats } from "@/lib/services/driver";

interface DriverDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DriverDetailPage({ params }: DriverDetailPageProps) {
  const session = await requirePermission("drivers.view");
  const { id } = await params;
  const driver = await getDriverById(id);
  if (!driver) notFound();

  const stats = await getDriverStats(id);
  const canEdit = hasPermission(session.user.role, "drivers.edit");

  return (
    <DashboardShell title={driver.name}>
      <PageHeader
        title={driver.name}
        description={`${driver.driverCode} · ${driver.nic}`}
        backHref="/drivers"
        actions={
          <>
            <Badge variant={driver.status === "ACTIVE" ? "success" : "secondary"}>{driver.status}</Badge>
            {canEdit && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/drivers/${driver.id}/edit`}><Pencil className="h-4 w-4 mr-2" />Edit</Link>
                </Button>
                <DeleteDriverButton driverId={driver.id} driverName={driver.name} />
              </>
            )}
          </>
        }
      />
      <DriverProfile driver={driver} stats={stats} canEdit={canEdit} />
    </DashboardShell>
  );
}
