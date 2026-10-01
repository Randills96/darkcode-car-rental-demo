import Link from "next/link";
import { Suspense } from "react";
import { Wrench, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { MaintenanceFilters } from "@/components/maintenance/maintenance-filters";
import { MaintenanceTypeBadge } from "@/components/maintenance/maintenance-type-badge";
import { ServiceDueAlerts } from "@/components/maintenance/service-due-alerts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import {
  getMaintenanceRecords,
  getMaintenanceSummary,
  getServiceDueAlerts,
} from "@/lib/services/maintenance";
import { maintenanceSearchSchema } from "@/lib/validations/maintenance";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";

interface MaintenancePageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const session = await requirePermission("maintenance.view");
  const params = maintenanceSearchSchema.parse(await searchParams);
  const [{ records, total, page, totalPages }, summary, dueAlerts] = await Promise.all([
    getMaintenanceRecords(params),
    getMaintenanceSummary(),
    getServiceDueAlerts(14),
  ]);
  const canCreate = hasPermission(session.user.role, "maintenance.create");

  return (
    <DashboardShell title="Maintenance">
      <PageHeader
        title="Maintenance Management"
        description={`${summary.totalRecords} records · ${formatCurrency(summary.monthCost)} this month · ${summary.dueCount} service alert${summary.dueCount !== 1 ? "s" : ""}`}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/maintenance/new"><Plus className="h-4 w-4 mr-2" />Record Maintenance</Link>
            </Button>
          ) : undefined
        }
      />

      <ServiceDueAlerts alerts={dueAlerts} />

      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md mb-4" />}>
            <MaintenanceFilters />
          </Suspense>
          {records.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No maintenance records found"
              description="Record vehicle maintenance to track service history and due dates."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Next Service</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Link href={`/maintenance/${record.id}`} className="font-mono text-sm hover:underline">
                          {record.maintenanceCode}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/vehicles/${record.vehicle.id}`} className="hover:underline">
                          {record.vehicle.registrationNumber}
                        </Link>
                      </TableCell>
                      <TableCell><MaintenanceTypeBadge type={record.maintenanceType} /></TableCell>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{record.serviceProvider || "—"}</TableCell>
                      <TableCell>
                        {record.nextServiceDate ? formatDate(record.nextServiceDate) : "—"}
                        {record.nextServiceKm ? ` / ${record.nextServiceKm.toLocaleString()} km` : ""}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(decimalToNumber(record.cost))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                baseUrl="/maintenance"
                searchParams={{
                  search: params.search,
                  maintenanceType: params.maintenanceType !== "ALL" ? params.maintenanceType : undefined,
                  sortBy: params.sortBy,
                  sortOrder: params.sortOrder,
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
