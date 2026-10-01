import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignVehicleForm } from "@/components/rentals/assign-vehicle-form";
import { RentalMileageSection } from "@/components/rentals/rental-mileage-section";
import { RentalWorkflowActions } from "@/components/rentals/rental-workflow-actions";
import { RentalFinancialSection } from "@/components/rentals/rental-financial-section";
import { RefundDepositActions } from "@/components/payments/refund-deposit-actions";
import { describeIncludedKmPolicy } from "@/lib/services/included-km";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";
import { toTelUrl } from "@/lib/phone";
import { Phone } from "lucide-react";
import { getDepositRefundUiState } from "@/lib/services/security-deposit";
import type { getRentalById } from "@/lib/services/rental";

type RentalDetail = NonNullable<Awaited<ReturnType<typeof getRentalById>>>;

interface RentalOption {
  id: string;
  bookingNumber: string;
  status: string;
  customer: { fullName: string };
}

interface RentalProfileProps {
  rental: RentalDetail;
  vehicles: Array<{ id: string; registrationNumber: string; make: string; model: string }>;
  rentalOptions: RentalOption[];
  canEdit: boolean;
  canCancel: boolean;
  canHandover: boolean;
  canReturn: boolean;
  canCreatePayment: boolean;
  canEditPayment: boolean;
  canCreateDamage: boolean;
  canPaySettlement: boolean;
}

export function RentalProfile({
  rental,
  vehicles,
  rentalOptions,
  canEdit,
  canCancel,
  canHandover,
  canReturn,
  canCreatePayment,
  canEditPayment,
  canCreateDamage,
  canPaySettlement,
}: RentalProfileProps) {
  const showAssignVehicle =
    canEdit && ["INQUIRY", "QUOTED", "CONFIRMED"].includes(rental.status);
  const showHandover = Boolean(
    canHandover && rental.status === "CONFIRMED" && !rental.handover && rental.vehicleId
  );
  const showReturn = Boolean(
    canReturn && rental.status === "ACTIVE" && rental.handover && !rental.returnRecord
  );
  const canCorrectEndingOdometer = Boolean(
    canReturn &&
      rental.returnRecord &&
      ["RETURNED", "COMPLETED"].includes(rental.status)
  );
  const canRefundDeposit = canCreatePayment || canEditPayment;
  const depositAmount = decimalToNumber(rental.securityDeposit);
  const depositUi = getDepositRefundUiState(rental.securityDeposits);
  const showRefundDeposit =
    canRefundDeposit &&
    rental.status !== "CANCELLED" &&
    (depositUi.hasActive || depositUi.isFullySettled || depositAmount > 0);

  return (
    <div className="space-y-6">
      {showRefundDeposit && (
        <Card className={depositUi.isFullySettled
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-amber-400 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"}
        >
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">
                {depositUi.isFullySettled ? "Security deposit refunded" : "Refund security deposit"}
              </p>
              <p className="text-sm text-muted-foreground">
                {depositUi.isFullySettled
                  ? `${formatCurrency(depositAmount)} has been returned or retained. Use Edit if you need to change it.`
                  : `${formatCurrency(depositAmount)} is held on this hire. Open Refund Deposit to return it to the customer.`}
              </p>
            </div>
            <RefundDepositActions
              rentalId={rental.id}
              canRefund={depositUi.hasActive || (!depositUi.isFullySettled && depositAmount > 0)}
              isFullySettled={depositUi.isFullySettled}
              canEdit={canEditPayment}
            />
          </CardContent>
        </Card>
      )}

      <RentalWorkflowActions
        rentalId={rental.id}
        status={rental.status}
        hasVehicle={!!rental.vehicleId}
        hasHandover={!!rental.handover}
        hasReturn={!!rental.returnRecord}
        canEdit={canEdit}
        canCancel={canCancel}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Rental Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="font-medium">
                  <Link href={`/customers/${rental.customer.id}`} className="hover:underline">
                    {rental.customer.fullName}
                  </Link>
                </dd>
                {rental.customer.phone && (
                  <dd className="mt-1">
                    <a
                      href={toTelUrl(rental.customer.phone) ?? `tel:${rental.customer.phone}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {rental.customer.phone}
                    </a>
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-muted-foreground">Vehicle</dt>
                <dd className="font-medium">
                  {rental.vehicle ? (
                    <Link href={`/vehicles/${rental.vehicle.id}`} className="hover:underline">
                      {rental.vehicle.registrationNumber} — {rental.vehicle.make} {rental.vehicle.model}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rental Type</dt>
                <dd>{rental.rentalType.replace("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rate Plan</dt>
                <dd>{rental.ratePlanType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Pickup</dt>
                <dd>{formatDate(rental.pickupDate)} at {rental.pickupTime}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Return</dt>
                <dd>{formatDate(rental.returnDate)} at {rental.returnTime}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rental Days</dt>
                <dd>{rental.rentalDays}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Free KM allowance</dt>
                <dd>
                  {describeIncludedKmPolicy(
                    rental.rentalDays,
                    rental.includedKm,
                    rental.includedKm
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Extra KM rate</dt>
                <dd>{formatCurrency(decimalToNumber(rental.extraKmRate))} / km</dd>
              </div>
              {rental.driver && (
                <div>
                  <dt className="text-muted-foreground">Driver</dt>
                  <dd>
                    <Link href={`/drivers/${rental.driver.id}`} className="hover:underline">
                      {rental.driver.name}
                    </Link>
                  </dd>
                </div>
              )}
              {rental.broker && (
                <div>
                  <dt className="text-muted-foreground">Broker</dt>
                  <dd>
                    <Link href={`/brokers/${rental.broker.id}`} className="hover:underline">
                      {rental.broker.name}
                    </Link>
                  </dd>
                </div>
              )}
              {rental.pickupLocation && (
                <div>
                  <dt className="text-muted-foreground">Pickup Location</dt>
                  <dd>{rental.pickupLocation}</dd>
                </div>
              )}
              {rental.returnLocation && (
                <div>
                  <dt className="text-muted-foreground">Return Location</dt>
                  <dd>{rental.returnLocation}</dd>
                </div>
              )}
              {rental.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap">{rental.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Daily rate</dt>
                <dd>{formatCurrency(decimalToNumber(rental.dailyRate))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estimated total</dt>
                <dd>{formatCurrency(decimalToNumber(rental.estimatedTotal))}</dd>
              </div>
              {decimalToNumber(rental.extraKmCharge) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Extra KM ({rental.extraKm} km)</dt>
                  <dd>{formatCurrency(decimalToNumber(rental.extraKmCharge))}</dd>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-2">
                <dt>Final total</dt>
                <dd>{formatCurrency(decimalToNumber(rental.finalTotal))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total paid</dt>
                <dd>{formatCurrency(decimalToNumber(rental.totalPaid))}</dd>
              </div>
              <div className="flex justify-between font-semibold text-orange-700">
                <dt>Balance due</dt>
                <dd>{formatCurrency(decimalToNumber(rental.balance))}</dd>
              </div>
              <div className="space-y-2 border-t pt-2">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Security deposit</dt>
                  <dd>{formatCurrency(depositAmount)}</dd>
                </div>
                {showRefundDeposit && (
                  <RefundDepositActions
                    rentalId={rental.id}
                    canRefund={depositUi.hasActive || (!depositUi.isFullySettled && depositAmount > 0)}
                    isFullySettled={depositUi.isFullySettled}
                    canEdit={canEditPayment}
                    fullWidth
                  />
                )}
              </div>
              {rental.brokerId &&
                (decimalToNumber(rental.brokerCommissionPerDay) > 0 ||
                  decimalToNumber(rental.brokerCommissionPerExtraKm) > 0) && (
                  <div className="border-t pt-2">
                    <p className="mb-1 font-medium">Broker commission terms</p>
                    <p className="text-muted-foreground">
                      {formatCurrency(decimalToNumber(rental.brokerCommissionPerDay))}/day
                      {decimalToNumber(rental.brokerCommissionPerExtraKm) > 0 &&
                        ` + ${formatCurrency(decimalToNumber(rental.brokerCommissionPerExtraKm))}/extra km`}
                    </p>
                  </div>
                )}
              {(rental.ownerDailyRate != null || rental.ownerExtraKmRate != null) && (
                <div className="border-t pt-2">
                  <p className="mb-1 font-medium">Owner payout terms</p>
                  <p className="text-muted-foreground">
                    {rental.ownerDailyRate != null &&
                      `${formatCurrency(decimalToNumber(rental.ownerDailyRate))}/day`}
                    {rental.ownerExtraKmRate != null &&
                      `${rental.ownerDailyRate != null ? " + " : ""}${formatCurrency(decimalToNumber(rental.ownerExtraKmRate))}/extra km`}
                  </p>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {showAssignVehicle && (
        <AssignVehicleForm
          rentalId={rental.id}
          vehicles={vehicles}
          currentVehicleId={rental.vehicleId}
        />
      )}

      <RentalMileageSection
        rental={rental}
        showHandover={showHandover}
        showReturn={showReturn}
        canCorrectEndingOdometer={canCorrectEndingOdometer}
      />

      {(canCreatePayment || canCreateDamage || canPaySettlement || rental.payments.length > 0 || rental.securityDeposits.length > 0 || decimalToNumber(rental.securityDeposit) > 0 || rental.damages.length > 0 || rental.ownerSettlement || rental.brokerCommission || rental.brokerId || rental.vehicle?.ownerId) && (
        <RentalFinancialSection
          rental={rental}
          rentalOptions={rentalOptions}
          canCreatePayment={canCreatePayment}
          canEditPayment={canEditPayment}
          canCreateDamage={canCreateDamage}
          canPaySettlement={canPaySettlement}
        />
      )}
    </div>
  );
}
