import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { getServiceDueAlerts } from "@/lib/services/maintenance";

type ServiceDueAlert = Awaited<ReturnType<typeof getServiceDueAlerts>>[number];

interface ServiceDueAlertsProps {
  alerts: ServiceDueAlert[];
}

export function ServiceDueAlerts({ alerts }: ServiceDueAlertsProps) {
  if (alerts.length === 0) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <p className="text-sm text-green-800">No service due within the next 14 days.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Service Due Alerts</CardTitle>
        <p className="text-sm text-muted-foreground">Based on next service date (14 days) or odometer threshold</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 ${
                alert.alertType === "overdue" ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/vehicles/${alert.vehicle.id}`} className="font-medium hover:underline">
                    {alert.vehicle.registrationNumber}
                  </Link>
                  <Badge variant={alert.alertType === "overdue" ? "destructive" : "warning"}>
                    {alert.alertType === "overdue" ? "Overdue" : "Due Soon"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {alert.maintenanceType.replace(/_/g, " ")} — {alert.maintenanceCode}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {alert.dateDue && alert.nextServiceDate && (
                    <span>Date due: {formatDate(alert.nextServiceDate)} · </span>
                  )}
                  {alert.kmDue && alert.nextServiceKm != null && (
                    <span>
                      Odometer: {alert.vehicle.currentOdometer.toLocaleString()} / {alert.nextServiceKm.toLocaleString()} km
                    </span>
                  )}
                </p>
              </div>
              <Link href={`/maintenance/new?vehicleId=${alert.vehicle.id}`} className="text-sm underline shrink-0">
                Record Service
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
