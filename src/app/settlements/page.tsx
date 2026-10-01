import Link from "next/link";
import { Suspense } from "react";
import { Wallet } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { SettlementFilters, SettlementTabs } from "@/components/settlements/settlement-filters";
import { SettlementStatusBadge } from "@/components/settlements/settlement-status-badge";
import { PaySettlementDialog } from "@/components/settlements/pay-settlement-dialog";
import { SettlementReceiptActions } from "@/components/settlements/settlement-receipt-actions";
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
import {
  getOwnerSettlements,
  getBrokerCommissions,
  getDriverPaymentsList,
  getSettlementsSummary,
} from "@/lib/services/settlement";
import {
  settlementsPageSchema,
  ownerSettlementSearchSchema,
  brokerCommissionSearchSchema,
  driverPaymentSearchSchema,
} from "@/lib/validations/settlement";
import { formatCurrency, formatDate, decimalToNumber, formatCommissionBreakdown } from "@/lib/utils";

interface SettlementsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SettlementsPage({ searchParams }: SettlementsPageProps) {
  const session = await requirePermission("settlements.view");
  const rawParams = await searchParams;
  const { tab } = settlementsPageSchema.parse(rawParams);
  const canPay = hasPermission(session.user.role, "settlements.create");
  const summary = await getSettlementsSummary();

  return (
    <DashboardShell title="Settlements">
      <PageHeader
        title="Settlements & Commissions"
        description="Owner settlements, broker commissions, and driver payment tracking"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Owner Settlements</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.pendingOwnerAmount)}</p>
            <p className="text-xs text-muted-foreground">{summary.pendingOwnerCount} record(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Broker Commissions</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.pendingBrokerAmount)}</p>
            <p className="text-xs text-muted-foreground">{summary.pendingBrokerCount} record(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Driver Payments</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalDriverPaymentAmount)}</p>
            <p className="text-xs text-muted-foreground">{summary.totalDriverPayments} payment(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Pending Outflow</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.pendingOwnerAmount + summary.pendingBrokerAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <SettlementTabs activeTab={tab} />
          <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md mb-4" />}>
            <SettlementFilters tab={tab} />
          </Suspense>

          {tab === "owners" && (
            <OwnerSettlementsTable rawParams={rawParams} canPay={canPay} />
          )}
          {tab === "brokers" && (
            <BrokerCommissionsTable rawParams={rawParams} canPay={canPay} />
          )}
          {tab === "drivers" && (
            <DriverPaymentsTable rawParams={rawParams} />
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

async function OwnerSettlementsTable({
  rawParams,
  canPay,
}: {
  rawParams: Record<string, string | undefined>;
  canPay: boolean;
}) {
  const params = ownerSettlementSearchSchema.parse(rawParams);
  const { settlements, page, totalPages } = await getOwnerSettlements(params);

  if (settlements.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No owner settlements"
        description="Settlements are created automatically when partner-owned rentals are completed."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="min-w-[200px]">Payout breakdown</TableHead>
            <TableHead>Revenue</TableHead>
            <TableHead>Your margin</TableHead>
            <TableHead>Owner payable</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settlements.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Link href={`/rentals/${s.rental.id}`} className="hover:underline">{s.rental.bookingNumber}</Link>
              </TableCell>
              <TableCell>
                <Link href={`/owners/${s.owner.id}`} className="hover:underline">{s.owner.name}</Link>
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
              <TableCell className="font-medium">{formatCurrency(decimalToNumber(s.ownerPayable))}</TableCell>
              <TableCell>{formatCurrency(decimalToNumber(s.paidAmount))}</TableCell>
              <TableCell><SettlementStatusBadge status={s.status} /></TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <SettlementReceiptActions
                    type="owner"
                    settlementId={s.id}
                    bookingNumber={s.rental.bookingNumber}
                    recipientEmail={s.owner.email}
                    paidAmount={decimalToNumber(s.paidAmount)}
                    canSendEmail={canPay}
                    profileEditHref={`/owners/${s.owner.id}/edit`}
                    compact
                  />
                  {canPay && (
                    <PaySettlementDialog
                      type="owner"
                      recordId={s.id}
                      label={`${s.rental.bookingNumber} — ${s.owner.name}`}
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
      <Pagination
        page={page}
        totalPages={totalPages}
        baseUrl="/settlements"
        searchParams={{ tab: "owners", search: params.search, status: params.status !== "ALL" ? params.status : undefined }}
      />
    </>
  );
}

async function BrokerCommissionsTable({
  rawParams,
  canPay,
}: {
  rawParams: Record<string, string | undefined>;
  canPay: boolean;
}) {
  const params = brokerCommissionSearchSchema.parse(rawParams);
  const { commissions, page, totalPages } = await getBrokerCommissions(params);

  if (commissions.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No broker commissions"
        description="Commissions are created automatically when broker-linked rentals are completed."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking</TableHead>
            <TableHead>Broker</TableHead>
            <TableHead className="min-w-[200px]">Commission breakdown</TableHead>
            <TableHead>Rental value</TableHead>
            <TableHead>Total commission</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment date</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link href={`/rentals/${c.rental.id}`} className="hover:underline">{c.rental.bookingNumber}</Link>
              </TableCell>
              <TableCell>
                <Link href={`/brokers/${c.broker.id}`} className="hover:underline">{c.broker.name}</Link>
              </TableCell>
              <TableCell className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                {formatCommissionBreakdown({
                  perDay: decimalToNumber(c.commissionPerDay),
                  perExtraKm: decimalToNumber(c.commissionPerExtraKm),
                  days: c.billableDays,
                  extraKm: c.billableExtraKm,
                })}
              </TableCell>
              <TableCell>{formatCurrency(decimalToNumber(c.rentalValue))}</TableCell>
              <TableCell className="font-medium">{formatCurrency(decimalToNumber(c.commissionAmount))}</TableCell>
              <TableCell>{formatCurrency(decimalToNumber(c.paidAmount))}</TableCell>
              <TableCell><SettlementStatusBadge status={c.status} /></TableCell>
              <TableCell>{formatDate(c.paymentDate)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <SettlementReceiptActions
                    type="broker"
                    settlementId={c.id}
                    bookingNumber={c.rental.bookingNumber}
                    recipientEmail={c.broker.email}
                    paidAmount={decimalToNumber(c.paidAmount)}
                    canSendEmail={canPay}
                    profileEditHref={`/brokers/${c.broker.id}/edit`}
                    compact
                  />
                  {canPay && (
                    <PaySettlementDialog
                      type="broker"
                      recordId={c.id}
                      label={`${c.rental.bookingNumber} — ${c.broker.name}`}
                      payableAmount={decimalToNumber(c.commissionAmount)}
                      paidAmount={decimalToNumber(c.paidAmount)}
                      status={c.status}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        page={page}
        totalPages={totalPages}
        baseUrl="/settlements"
        searchParams={{ tab: "brokers", search: params.search, status: params.status !== "ALL" ? params.status : undefined }}
      />
    </>
  );
}

async function DriverPaymentsTable({
  rawParams,
}: {
  rawParams: Record<string, string | undefined>;
}) {
  const params = driverPaymentSearchSchema.parse(rawParams);
  const { payments, page, totalPages } = await getDriverPaymentsList(params);

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No driver payments"
        description="Record driver payments from the driver profile or settlements module."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Booking</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{formatDate(p.paymentDate)}</TableCell>
              <TableCell>
                <Link href={`/drivers/${p.driver.id}`} className="hover:underline">{p.driver.name}</Link>
              </TableCell>
              <TableCell>
                {p.rental ? (
                  <Link href={`/rentals/${p.rental.id}`} className="hover:underline">{p.rental.bookingNumber}</Link>
                ) : "—"}
              </TableCell>
              <TableCell>{p.paymentMethod.replace("_", " ")}</TableCell>
              <TableCell>{p.referenceNumber || "—"}</TableCell>
              <TableCell className="text-right">{formatCurrency(decimalToNumber(p.amount))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        page={page}
        totalPages={totalPages}
        baseUrl="/settlements"
        searchParams={{ tab: "drivers", search: params.search }}
      />
    </>
  );
}
