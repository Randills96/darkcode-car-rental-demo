import Link from "next/link";
import { Suspense } from "react";
import { Plus, Car } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { RentalFilters } from "@/components/rentals/rental-filters";
import { RentalStatusBadge } from "@/components/rentals/rental-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getRentals } from "@/lib/services/rental";
import { rentalSearchSchema } from "@/lib/validations/rental";
import { formatDate, formatCurrency, decimalToNumber } from "@/lib/utils";

interface RentalsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function RentalsPage({ searchParams }: RentalsPageProps) {
  const session = await requirePermission("rentals.view");
  const params = rentalSearchSchema.parse(await searchParams);
  const { rentals, total, page, totalPages } = await getRentals(params);

  const canCreate = hasPermission(session.user.role, "rentals.create");
  const filterParams = {
    search: params.search,
    status: params.status !== "ALL" ? params.status : undefined,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  return (
    <DashboardShell title="Rentals">
      <PageHeader
        title="Rental Management"
        description={`${total} rental${total !== 1 ? "s" : ""} in the system`}
        actions={
          canCreate ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/rentals/new?intent=inquiry">Inquiry / quote</Link>
              </Button>
              <Button asChild>
                <Link href="/rentals/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Quick Hire
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md mb-4" />}>
            <RentalFilters />
          </Suspense>

          {rentals.length === 0 ? (
            <EmptyState
              icon={Car}
              title="No rentals found"
              description="Try adjusting your filters or create a new rental."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/rentals/new">Quick Hire</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Return</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rentals.map((rental) => (
                    <TableRow key={rental.id}>
                      <TableCell>
                        <Link href={`/rentals/${rental.id}`} className="font-medium hover:underline">
                          {rental.bookingNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/customers/${rental.customer.id}`} className="hover:underline">
                          {rental.customer.fullName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {rental.vehicle
                          ? rental.vehicle.registrationNumber
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{formatDate(rental.pickupDate)}</TableCell>
                      <TableCell>{formatDate(rental.returnDate)}</TableCell>
                      <TableCell><RentalStatusBadge status={rental.status} /></TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(decimalToNumber(rental.finalTotal || rental.estimatedTotal))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Pagination
                page={page}
                totalPages={totalPages}
                baseUrl="/rentals"
                searchParams={filterParams}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
