import Link from "next/link";
import { Suspense } from "react";
import { Plus, AlertTriangle, Pencil } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { DamageFilters } from "@/components/damages/damage-filters";
import { DamageStatusBadge, DamagePaymentBadge } from "@/components/damages/damage-status-badge";
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
import { getDamages, isDamageEditable } from "@/lib/services/damage";
import { damageSearchSchema } from "@/lib/validations/damage";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";

interface DamagesPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function DamagesPage({ searchParams }: DamagesPageProps) {
  const session = await requirePermission("damages.view");
  const params = damageSearchSchema.parse(await searchParams);
  const { damages, total, page, totalPages } = await getDamages(params);
  const canCreate = hasPermission(session.user.role, "damages.create");
  const canEdit = hasPermission(session.user.role, "damages.edit");

  return (
    <DashboardShell title="Damages">
      <PageHeader
        title="Damage Management"
        description={`${total} damage record${total !== 1 ? "s" : ""}`}
        actions={canCreate ? (
          <Button asChild><Link href="/damages/new"><Plus className="h-4 w-4 mr-2" />Report Damage</Link></Button>
        ) : undefined}
      />
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md mb-4" />}>
            <DamageFilters />
          </Suspense>
          {damages.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No damages found" description="Report vehicle damage linked to a rental." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Charge</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {damages.map((damage) => (
                    <TableRow key={damage.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/damages/${damage.id}`} className="font-medium hover:underline">
                          {damage.damageCode}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/rentals/${damage.rental.id}`} className="hover:underline">
                          {damage.rental.bookingNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/vehicles/${damage.vehicle.id}`} className="hover:underline">
                          {damage.vehicle.registrationNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/damages/${damage.id}`} className="hover:underline">
                          {damage.damageType}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(damage.damageDate)}</TableCell>
                      <TableCell>{formatCurrency(decimalToNumber(damage.customerCharge))}</TableCell>
                      <TableCell><DamageStatusBadge status={damage.status} /></TableCell>
                      <TableCell><DamagePaymentBadge status={damage.paymentStatus} /></TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          {isDamageEditable(damage) ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/damages/${damage.id}/edit`}>
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Paid</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} totalPages={totalPages} baseUrl="/damages" searchParams={{
                search: params.search,
                status: params.status !== "ALL" ? params.status : undefined,
                paymentStatus: params.paymentStatus !== "ALL" ? params.paymentStatus : undefined,
                sortBy: params.sortBy,
                sortOrder: params.sortOrder,
              }} />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
