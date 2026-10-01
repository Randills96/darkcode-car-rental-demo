import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DeleteOwnerButton } from "@/components/owners/delete-owner-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { SettlementStatusBadge } from "@/components/settlements/settlement-status-badge";
import { PaySettlementDialog } from "@/components/settlements/pay-settlement-dialog";
import { SettlementReceiptActions } from "@/components/settlements/settlement-receipt-actions";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getOwnerById, getOwnerStats } from "@/lib/services/owner";
import { formatCurrency, formatDate, decimalToNumber, formatCommissionBreakdown } from "@/lib/utils";

interface OwnerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OwnerDetailPage({ params }: OwnerDetailPageProps) {
  const session = await requirePermission("owners.view");
  const { id } = await params;
  const owner = await getOwnerById(id);
  if (!owner) notFound();

  const stats = await getOwnerStats(id);
  const canEdit = hasPermission(session.user.role, "owners.edit");
  const canPaySettlement = hasPermission(session.user.role, "settlements.create");

  return (
    <DashboardShell title={owner.name}>
      <PageHeader
        title={owner.name}
        description={`${owner.ownerCode} · ${owner.phone}`}
        backHref="/owners"
        actions={
          <>
            <Badge variant={owner.status === "ACTIVE" ? "success" : "secondary"}>{owner.status}</Badge>
            {canEdit && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/owners/${owner.id}/edit`}><Pencil className="h-4 w-4 mr-2" />Edit</Link>
                </Button>
                <DeleteOwnerButton ownerId={owner.id} ownerName={owner.name} />
              </>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Vehicles</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.vehicleCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rentals</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.rentalCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Owner Payable</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(stats.ownerPayable)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Payment</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(stats.pendingAmount)}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Owner Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">NIC</span><span>{owner.nic || "—"}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Email</span><span>{owner.email || "—"}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">WhatsApp</span><span>{owner.whatsapp || "—"}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Address</span><span className="text-right max-w-[60%]">{owner.address || "—"}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Bank</span><span>{owner.bankName ? `${owner.bankName} — ${owner.bankAccount}` : "—"}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Commission Earned</span><span>{formatCurrency(stats.companyCommission)}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Paid to Owner</span><span>{formatCurrency(stats.paidAmount)}</span></div>
            {owner.notes && <p className="pt-2 text-muted-foreground">Notes: {owner.notes}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vehicles Owned</CardTitle></CardHeader>
          <CardContent>
            {owner.vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No vehicles assigned</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Registration</TableHead><TableHead>Vehicle</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {owner.vehicles.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell><Link href={`/vehicles/${v.id}`} className="text-primary hover:underline">{v.registrationNumber}</Link></TableCell>
                      <TableCell>{v.make} {v.model}</TableCell>
                      <TableCell><VehicleStatusBadge status={v.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {owner.settlements.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Settlement History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead className="min-w-[200px]">Payout breakdown</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Your margin</TableHead>
                  <TableHead>Payable</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owner.settlements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/rentals/${s.rental.id}`} className="hover:underline">{s.rental.bookingNumber}</Link>
                    </TableCell>
                    <TableCell className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                      {formatCommissionBreakdown({
                        perDay: decimalToNumber(s.ownerDailyRate),
                        perExtraKm: decimalToNumber(s.ownerExtraKmRate),
                        days: s.billableDays,
                        extraKm: s.billableExtraKm,
                      })}
                    </TableCell>
                    <TableCell>{formatCurrency(decimalToNumber(s.rentalRevenue))}</TableCell>
                    <TableCell>{formatCurrency(decimalToNumber(s.companyCommission))}</TableCell>
                    <TableCell>{formatCurrency(decimalToNumber(s.ownerPayable))}</TableCell>
                    <TableCell>{formatCurrency(decimalToNumber(s.paidAmount))}</TableCell>
                    <TableCell><SettlementStatusBadge status={s.status} /></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <SettlementReceiptActions
                          type="owner"
                          settlementId={s.id}
                          bookingNumber={s.rental.bookingNumber}
                          recipientEmail={owner.email}
                          paidAmount={decimalToNumber(s.paidAmount)}
                          canSendEmail={canPaySettlement}
                          profileEditHref={`/owners/${owner.id}/edit`}
                          compact
                        />
                        {canPaySettlement && (
                          <PaySettlementDialog
                            type="owner"
                            recordId={s.id}
                            label={s.rental.bookingNumber}
                            payableAmount={decimalToNumber(s.ownerPayable)}
                            paidAmount={decimalToNumber(s.paidAmount)}
                            status={s.status}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
