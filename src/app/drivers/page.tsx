import Link from "next/link";
import { Suspense } from "react";
import { Plus, IdCard } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { DriverFilters } from "@/components/drivers/driver-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getDrivers } from "@/lib/services/driver";
import { driverSearchSchema } from "@/lib/validations/driver";
import { formatCurrency, formatDate, decimalToNumber, getLicenceExpiryStatus } from "@/lib/utils";

interface DriversPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function DriversPage({ searchParams }: DriversPageProps) {
  const session = await requirePermission("drivers.view");
  const params = driverSearchSchema.parse(await searchParams);
  const { drivers, total, page, totalPages } = await getDrivers(params);
  const canCreate = hasPermission(session.user.role, "drivers.create");

  return (
    <DashboardShell title="Drivers">
      <PageHeader
        title="Driver Management"
        description={`${total} driver${total !== 1 ? "s" : ""}`}
        actions={canCreate ? (
          <Button asChild><Link href="/drivers/new"><Plus className="h-4 w-4 mr-2" />Add Driver</Link></Button>
        ) : undefined}
      />
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={null}><DriverFilters /></Suspense>
          {drivers.length === 0 ? (
            <EmptyState icon={IdCard} title="No drivers found" description="Add drivers for with-driver rentals." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>NIC</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Daily Pay</TableHead>
                    <TableHead>Licence Expiry</TableHead>
                    <TableHead>Rentals</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => {
                    const licence = getLicenceExpiryStatus(driver.licenceExpiry);
                    return (
                      <TableRow key={driver.id}>
                        <TableCell><Link href={`/drivers/${driver.id}`} className="font-medium text-primary hover:underline">{driver.driverCode}</Link></TableCell>
                        <TableCell>{driver.name}</TableCell>
                        <TableCell>{driver.nic}</TableCell>
                        <TableCell>{driver.phone}</TableCell>
                        <TableCell>{formatCurrency(decimalToNumber(driver.dailyPayment))}</TableCell>
                        <TableCell><Badge variant={licence.severity === "expired" ? "destructive" : licence.severity === "warning" ? "warning" : "success"}>{formatDate(driver.licenceExpiry)}</Badge></TableCell>
                        <TableCell>{driver._count.rentals}</TableCell>
                        <TableCell><Badge variant={driver.status === "ACTIVE" ? "success" : "secondary"}>{driver.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination page={page} totalPages={totalPages} baseUrl="/drivers" searchParams={{ search: params.search, status: params.status !== "ALL" ? params.status : undefined }} />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
