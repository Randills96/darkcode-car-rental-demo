import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { CollectDepositDialog } from "@/components/payments/collect-deposit-dialog";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import { RefundDepositActions } from "@/components/payments/refund-deposit-actions";
import { CustomerReceiptActions } from "@/components/rentals/customer-receipt-actions";
import { PaymentTypeBadge } from "@/components/payments/payment-type-badge";
import { DamageStatusBadge, DamagePaymentBadge } from "@/components/damages/damage-status-badge";
import { SettlementStatusBadge } from "@/components/settlements/settlement-status-badge";
import { PaySettlementDialog } from "@/components/settlements/pay-settlement-dialog";
import { SettlementReceiptActions } from "@/components/settlements/settlement-receipt-actions";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";
import { canGenerateCustomerReceipt } from "@/lib/services/customer-receipt";
import { getDepositRefundUiState } from "@/lib/services/security-deposit";
import type { getRentalById } from "@/lib/services/rental";
import type { SecurityDepositStatus } from "@prisma/client";

type RentalDetail = NonNullable<Awaited<ReturnType<typeof getRentalById>>>;

interface RentalOption {
  id: string;
  bookingNumber: string;
  status: string;
  customer: { fullName: string };
}

const DEPOSIT_STATUS: Record<SecurityDepositStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  HELD: { label: "Held", variant: "warning" },
  PARTIALLY_REFUNDED: { label: "Partially Refunded", variant: "secondary" },
  REFUNDED: { label: "Refunded", variant: "success" },
  FORFEITED: { label: "Forfeited", variant: "destructive" },
};

interface RentalFinancialSectionProps {
  rental: RentalDetail;
  rentalOptions: RentalOption[];
  canCreatePayment: boolean;
  canEditPayment: boolean;
  canCreateDamage: boolean;
  canPaySettlement: boolean;
}

export function RentalFinancialSection({
  rental,
  rentalOptions,
  canCreatePayment,
  canEditPayment,
  canCreateDamage,
  canPaySettlement,
}: RentalFinancialSectionProps) {
  const hasActiveDeposit = rental.securityDeposits.some((d) =>
    ["HELD", "PARTIALLY_REFUNDED"].includes(d.status)
  );
  const depositUi = getDepositRefundUiState(rental.securityDeposits);
  const showCustomerReceipt = canGenerateCustomerReceipt(rental);

  return (
    <div className="space-y-6">
      {showCustomerReceipt && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 p-4 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.35)] sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-card dark:to-emerald-950/10">
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">Rental fully paid</p>
            <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80">
              Payment confirmed and balance cleared. Print or download the customer receipt with
              rental and payment details only. Broker and owner settlements are not included.
            </p>
          </div>
          <CustomerReceiptActions rentalId={rental.id} bookingNumber={rental.bookingNumber} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canCreatePayment && (
          <RecordPaymentDialog
            rentals={rentalOptions}
            defaultRentalId={rental.id}
            paymentContext={{
              finalTotal: decimalToNumber(rental.finalTotal),
              balance: decimalToNumber(rental.balance),
              status: rental.status,
              hasReturnRecord: !!rental.returnRecord,
              extraKm: rental.extraKm,
              extraKmCharge: decimalToNumber(rental.extraKmCharge),
            }}
          />
        )}
        {canCreatePayment && !hasActiveDeposit && !depositUi.isFullySettled && rental.status !== "CANCELLED" && (
          <CollectDepositDialog rentalId={rental.id} suggestedAmount={decimalToNumber(rental.securityDeposit)} />
        )}
        {(canCreatePayment || canEditPayment) &&
          (depositUi.hasActive || depositUi.isFullySettled || decimalToNumber(rental.securityDeposit) > 0) &&
          rental.status !== "CANCELLED" && (
            <RefundDepositActions
              rentalId={rental.id}
              canRefund={depositUi.hasActive || (!depositUi.isFullySettled && decimalToNumber(rental.securityDeposit) > 0)}
              isFullySettled={depositUi.isFullySettled}
              canEdit={canEditPayment}
              size="sm"
            />
          )}
        {rental.brokerCommission && (
          <Button size="sm" variant="outline" asChild>
            <a
              href={`/api/settlements/broker/${rental.brokerCommission.id}/receipt`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="mr-2 h-4 w-4" />
              Broker settlement slip
            </a>
          </Button>
        )}
        {rental.ownerSettlement && (
          <Button size="sm" variant="outline" asChild>
            <a
              href={`/api/settlements/owner/${rental.ownerSettlement.id}/receipt`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="mr-2 h-4 w-4" />
              Owner price breakdown
            </a>
          </Button>
        )}
        {canCreateDamage && ["ACTIVE", "RETURNED", "COMPLETED"].includes(rental.status) && (
          <Link href={`/damages/new?rentalId=${rental.id}`} className="text-sm underline self-center ml-2">
            Report Damage
          </Link>
        )}
      </div>

      {rental.securityDeposits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Security Deposits</CardTitle>
            <CardDescription>
              History of the cash deposit held on this hire — how much was taken, returned, or kept.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Refunded</TableHead>
                  <TableHead>Retained</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rental.securityDeposits.map((deposit) => {
                  const statusConfig = DEPOSIT_STATUS[deposit.status];
                  return (
                    <TableRow key={deposit.id}>
                      <TableCell>{formatDate(deposit.receivedDate)}</TableCell>
                      <TableCell>{formatCurrency(decimalToNumber(deposit.depositAmount))}</TableCell>
                      <TableCell>{formatCurrency(decimalToNumber(deposit.refundAmount))}</TableCell>
                      <TableCell>{formatCurrency(decimalToNumber(deposit.amountRetained))}</TableCell>
                      <TableCell><Badge variant={statusConfig.variant}>{statusConfig.label}</Badge></TableCell>
                      <TableCell>
                        {(canCreatePayment || canEditPayment) && (
                          ["HELD", "PARTIALLY_REFUNDED"].includes(deposit.status) ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/rentals/${rental.id}/refund-deposit?depositId=${deposit.id}`}>
                                Refund / settle
                              </Link>
                            </Button>
                          ) : canEditPayment ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/rentals/${rental.id}/refund-deposit?depositId=${deposit.id}&edit=1`}>
                                Edit
                              </Link>
                            </Button>
                          ) : null
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {rental.payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payment Ledger</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rental.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell className="font-mono text-sm">{p.paymentCode}</TableCell>
                    <TableCell><PaymentTypeBadge type={p.paymentType} /></TableCell>
                    <TableCell>{p.paymentMethod.replace("_", " ")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(decimalToNumber(p.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {rental.damages.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Damages</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rental.damages.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell><Link href={`/damages/${d.id}`} className="font-medium hover:underline">{d.damageCode}</Link></TableCell>
                    <TableCell>{d.damageType}</TableCell>
                    <TableCell>{formatDate(d.damageDate)}</TableCell>
                    <TableCell>{formatCurrency(decimalToNumber(d.customerCharge))}</TableCell>
                    <TableCell><DamageStatusBadge status={d.status} /></TableCell>
                    <TableCell><DamagePaymentBadge status={d.paymentStatus} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(rental.ownerSettlement || rental.brokerCommission) && (
        <Card>
          <CardHeader><CardTitle>Settlements & Commissions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {rental.ownerSettlement && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Owner Settlement</p>
                    <p className="text-sm text-muted-foreground">
                      {rental.ownerSettlement.owner.name} ({rental.ownerSettlement.owner.ownerCode})
                    </p>
                  </div>
                  <SettlementStatusBadge status={rental.ownerSettlement.status} />
                </div>
                <dl className="grid gap-2 sm:grid-cols-4 text-sm">
                  <div><dt className="text-muted-foreground">Revenue</dt><dd>{formatCurrency(decimalToNumber(rental.ownerSettlement.rentalRevenue))}</dd></div>
                  <div><dt className="text-muted-foreground">Your margin</dt><dd>{formatCurrency(decimalToNumber(rental.ownerSettlement.companyCommission))}</dd></div>
                  <div><dt className="text-muted-foreground">Owner Payable</dt><dd className="font-medium">{formatCurrency(decimalToNumber(rental.ownerSettlement.ownerPayable))}</dd></div>
                  <div><dt className="text-muted-foreground">Paid</dt><dd>{formatCurrency(decimalToNumber(rental.ownerSettlement.paidAmount))}</dd></div>
                  {decimalToNumber(rental.ownerSettlement.ownerDailyRate) > 0 && (
                    <div className="sm:col-span-4 text-xs text-muted-foreground">
                      {formatCurrency(decimalToNumber(rental.ownerSettlement.ownerDailyRate))}/day × {rental.ownerSettlement.billableDays} day(s)
                      {decimalToNumber(rental.ownerSettlement.ownerExtraKmRate) > 0 &&
                        ` + ${formatCurrency(decimalToNumber(rental.ownerSettlement.ownerExtraKmRate))}/km × ${rental.ownerSettlement.billableExtraKm} extra km`}
                    </div>
                  )}
                </dl>
                {canPaySettlement && (
                  <PaySettlementDialog
                    type="owner"
                    recordId={rental.ownerSettlement.id}
                    label={rental.bookingNumber}
                    payableAmount={decimalToNumber(rental.ownerSettlement.ownerPayable)}
                    paidAmount={decimalToNumber(rental.ownerSettlement.paidAmount)}
                    status={rental.ownerSettlement.status}
                  />
                )}
                <SettlementReceiptActions
                  type="owner"
                  settlementId={rental.ownerSettlement.id}
                  bookingNumber={rental.bookingNumber}
                  recipientEmail={rental.ownerSettlement.owner.email}
                  paidAmount={decimalToNumber(rental.ownerSettlement.paidAmount)}
                  canSendEmail={canPaySettlement}
                  profileEditHref={`/owners/${rental.ownerSettlement.owner.id}/edit`}
                />
              </div>
            )}
            {rental.brokerCommission && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Broker Commission</p>
                    <p className="text-sm text-muted-foreground">
                      {rental.brokerCommission.broker.name} ({rental.brokerCommission.broker.brokerCode})
                    </p>
                  </div>
                  <SettlementStatusBadge status={rental.brokerCommission.status} />
                </div>
                <dl className="grid gap-2 sm:grid-cols-3 text-sm">
                  <div><dt className="text-muted-foreground">Rental Value</dt><dd>{formatCurrency(decimalToNumber(rental.brokerCommission.rentalValue))}</dd></div>
                  <div><dt className="text-muted-foreground">Commission</dt><dd className="font-medium">{formatCurrency(decimalToNumber(rental.brokerCommission.commissionAmount))}</dd></div>
                  <div><dt className="text-muted-foreground">Paid</dt><dd>{formatCurrency(decimalToNumber(rental.brokerCommission.paidAmount))}</dd></div>
                  {decimalToNumber(rental.brokerCommission.commissionPerDay) > 0 && (
                    <div className="sm:col-span-3 text-xs text-muted-foreground">
                      {formatCurrency(decimalToNumber(rental.brokerCommission.commissionPerDay))}/day × {rental.brokerCommission.billableDays} day(s)
                      {decimalToNumber(rental.brokerCommission.commissionPerExtraKm) > 0 &&
                        ` + ${formatCurrency(decimalToNumber(rental.brokerCommission.commissionPerExtraKm))}/km × ${rental.brokerCommission.billableExtraKm} extra km`}
                    </div>
                  )}
                </dl>
                {canPaySettlement && (
                  <PaySettlementDialog
                    type="broker"
                    recordId={rental.brokerCommission.id}
                    label={rental.bookingNumber}
                    payableAmount={decimalToNumber(rental.brokerCommission.commissionAmount)}
                    paidAmount={decimalToNumber(rental.brokerCommission.paidAmount)}
                    status={rental.brokerCommission.status}
                  />
                )}
                <SettlementReceiptActions
                  type="broker"
                  settlementId={rental.brokerCommission.id}
                  bookingNumber={rental.bookingNumber}
                  recipientEmail={rental.brokerCommission.broker.email}
                  paidAmount={decimalToNumber(rental.brokerCommission.paidAmount)}
                  canSendEmail={canPaySettlement}
                  profileEditHref={`/brokers/${rental.brokerCommission.broker.id}/edit`}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
