import Link from "next/link";
import { Suspense } from "react";
import { Plus, Car, Calendar, FileWarning } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { VehicleFilters } from "@/components/vehicles/vehicle-filters";
import { VehicleStatusBadge, OwnershipTypeBadge } from "@/components/vehicles/vehicle-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getVehicles } from "@/lib/services/vehicle";
import { vehicleSearchSchema } from "@/lib/validations/vehicle";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";
import { RentalStatusBadge } from "@/components/rentals/rental-status-badge";

interface VehiclesPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
  const session = await requirePermission("vehicles.view");
  const params = vehicleSearchSchema.parse(await searchParams);
  const { vehicles, total, page, totalPages } = await getVehicles(params);
  const canCreate = hasPermission(session.user.role, "vehicles.create");

  return (
    <DashboardShell title="Vehicles">
      <PageHeader
        title="Vehicle Management"
        description={
          params.status === "RESERVED"
            ? `${total} reserved vehicle${total !== 1 ? "s" : ""} with their linked hires`
            : params.status === "RENTED"
              ? `${total} vehicle${total !== 1 ? "s" : ""} currently on hire`
              : `${total} vehicle${total !== 1 ? "s" : ""} in fleet`
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/vehicles/availability"><Calendar className="h-4 w-4 mr-2" />Availability</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/vehicles/documents"><FileWarning className="h-4 w-4 mr-2" />Document Expiry</Link>
            </Button>
            {canCreate && (
              <Button asChild><Link href="/vehicles/new"><Plus className="h-4 w-4 mr-2" />Add Vehicle</Link></Button>
            )}
          </>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={null}><VehicleFilters /></Suspense>
          {vehicles.length === 0 ? (
            <EmptyState icon={Car} title="No vehicles found" description="Add vehicles to your fleet or adjust filters." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Registration</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Daily Rate</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Ownership</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current hire</TableHead>
                    <TableHead>Rentals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Link href={`/vehicles/${v.id}`} className="font-medium text-primary hover:underline">{v.registrationNumber}</Link>
                      </TableCell>
                      <TableCell>{v.make} {v.model} ({v.year})</TableCell>
                      <TableCell>{v.vehicleType}</TableCell>
                      <TableCell>{formatCurrency(decimalToNumber(v.dailyRate))}</TableCell>
                      <TableCell>{v.owner?.name || "—"}</TableCell>
                      <TableCell><OwnershipTypeBadge type={v.ownershipType} /></TableCell>
                      <TableCell><VehicleStatusBadge status={v.status} /></TableCell>
                      <TableCell>
                        {v.rentals[0] ? (
                          <div className="min-w-[12rem] space-y-0.5">
                            <Link
                              href={`/rentals/${v.rentals[0].id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {v.rentals[0].bookingNumber}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {v.rentals[0].customer.fullName}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <RentalStatusBadge status={v.rentals[0].status} />
                              <span className="text-xs text-muted-foreground">
                                {formatDate(v.rentals[0].pickupDate)} – {formatDate(v.rentals[0].returnDate)}
                              </span>
                            </div>
                          </div>
                        ) : v.status === "RESERVED" || v.status === "RENTED" ? (
                          <span className="text-xs text-muted-foreground">No linked hire</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{v._count.rentals}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                baseUrl="/vehicles"
                searchParams={{
                  search: params.search,
                  status: params.status !== "ALL" ? params.status : undefined,
                  ownershipType: params.ownershipType !== "ALL" ? params.ownershipType : undefined,
                  vehicleType: params.vehicleType !== "ALL" ? params.vehicleType : undefined,
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
