import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { MaintenanceTypeBadge } from "@/components/maintenance/maintenance-type-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { getMaintenanceById } from "@/lib/services/maintenance";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";

interface MaintenanceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MaintenanceDetailPage({ params }: MaintenanceDetailPageProps) {
  await requirePermission("maintenance.view");
  const { id } = await params;
  const record = await getMaintenanceById(id);
  if (!record) notFound();

  return (
    <DashboardShell title={record.maintenanceCode}>
      <PageHeader
        title={record.maintenanceCode}
        description={`${record.vehicle.registrationNumber} — ${record.vehicle.make} ${record.vehicle.model}`}
        backHref="/maintenance"
        actions={<MaintenanceTypeBadge type={record.maintenanceType} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Service Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Vehicle</span>
              <Link href={`/vehicles/${record.vehicle.id}`} className="hover:underline font-medium">
                {record.vehicle.registrationNumber}
              </Link>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Service Date</span>
              <span>{formatDate(record.date)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Odometer</span>
              <span>{record.odometer != null ? `${record.odometer.toLocaleString()} km` : "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Service Provider</span>
              <span>{record.serviceProvider || "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Cost</span>
              <span className="font-medium">{formatCurrency(decimalToNumber(record.cost))}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Recorded By</span>
              <span>{record.createdBy.name}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Next Service</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Next Service Date</span>
              <span>{record.nextServiceDate ? formatDate(record.nextServiceDate) : "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Next Service KM</span>
              <span>{record.nextServiceKm != null ? `${record.nextServiceKm.toLocaleString()} km` : "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Current Odometer</span>
              <span>{record.vehicle.currentOdometer.toLocaleString()} km</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{record.description}</p>
          {record.notes && (
            <p className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap">Notes: {record.notes}</p>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
