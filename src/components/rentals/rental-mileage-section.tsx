import { Gauge } from "lucide-react";
import { FormSectionCard } from "@/components/ui/form-section-card";
import { HandoverForm } from "@/components/rentals/handover-form";
import { HandoverWhatsAppResendButton } from "@/components/rentals/handover-whatsapp-resend-button";
import { EndingOdometerInlineForm } from "@/components/rentals/ending-odometer-inline-form";
import { describeIncludedKmPolicy } from "@/lib/services/included-km";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";
import type { getRentalById } from "@/lib/services/rental";

type RentalDetail = NonNullable<Awaited<ReturnType<typeof getRentalById>>>;

interface RentalMileageSectionProps {
  rental: RentalDetail;
  showHandover: boolean;
  showReturn: boolean;
  canCorrectEndingOdometer?: boolean;
}

export function RentalMileageSection({
  rental,
  showHandover,
  showReturn,
  canCorrectEndingOdometer = false,
}: RentalMileageSectionProps) {
  const extraDayKm = rental.includedKm;
  const startingOdometer =
    rental.startingOdometer ?? rental.handover?.startingOdometer ?? null;
  const hasMileageData =
    showHandover || rental.handover || showReturn || rental.returnRecord || startingOdometer != null;

  if (!hasMileageData) return null;

  const awaitingReturn =
    rental.status === "ACTIVE" && rental.handover && !rental.returnRecord && startingOdometer != null;

  return (
    <FormSectionCard
      title="Mileage & Odometer"
      variant="cyan"
      headerAction={<Gauge className="h-5 w-5 text-cyan-600 opacity-70" />}
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Starting odometer is saved when the rental is created. Enter the ending odometer when the
          customer returns the vehicle — the final bill updates automatically (
          {describeIncludedKmPolicy(rental.rentalDays, rental.includedKm, extraDayKm)} at{" "}
          {formatCurrency(decimalToNumber(rental.extraKmRate))}/extra km).
        </p>

        {startingOdometer != null && (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm">
            <p className="text-muted-foreground">Starting odometer</p>
            <p className="text-lg font-semibold text-cyan-700 dark:text-cyan-300">
              {startingOdometer.toLocaleString()} km
            </p>
          </div>
        )}

        {showHandover && (
          <HandoverForm
            rentalId={rental.id}
            startingOdometer={startingOdometer}
            embedded
          />
        )}

        {rental.handover && !showHandover && (
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="mb-2 text-sm font-medium">Handover recorded</p>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Handover date</dt>
                <dd>
                  {formatDate(rental.handover.handoverDate)} at {rental.handover.handoverTime}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Starting reading at pickup</dt>
                <dd className="font-semibold text-cyan-700 dark:text-cyan-300">
                  {rental.handover.startingOdometer.toLocaleString()} km
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <HandoverWhatsAppResendButton rentalId={rental.id} />
            </div>
          </div>
        )}

        {(showReturn || awaitingReturn) && startingOdometer != null && (
          <EndingOdometerInlineForm
            rentalId={rental.id}
            startingOdometer={startingOdometer}
            rentalDays={rental.rentalDays}
            includedKm={rental.includedKm}
            includedKmExtraDay={extraDayKm}
            extraKmRate={decimalToNumber(rental.extraKmRate)}
            dailyRate={decimalToNumber(rental.dailyRate)}
            ratePlanType={rental.ratePlanType}
            deliveryCharge={decimalToNumber(rental.deliveryCharge)}
            driverCharge={decimalToNumber(rental.driverCharge)}
            otherCharges={decimalToNumber(rental.otherCharges)}
            discount={decimalToNumber(rental.discount)}
            defaultReturnDate={rental.returnDate.toISOString().split("T")[0]}
            defaultReturnTime={rental.returnTime}
            embedded
          />
        )}

        {!showReturn && !awaitingReturn && !rental.returnRecord && startingOdometer != null && (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {rental.status === "QUOTED" || rental.status === "CONFIRMED" ? (
              <>
                Ending odometer can be entered after you <strong>Confirm</strong> the rental and{" "}
                <strong>record handover</strong> when the customer picks up the vehicle.
              </>
            ) : (
              <>Ending odometer will appear here when the rental is active and awaiting return.</>
            )}
          </div>
        )}

        {rental.returnRecord && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="mb-3 text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Final bill calculated — ready for payment
            </p>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Ending odometer</dt>
                <dd className="font-medium">
                  {rental.returnRecord.endingOdometer.toLocaleString()} km
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">KM driven</dt>
                <dd className="font-semibold">{rental.returnRecord.totalKm.toLocaleString()} km</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Extra KM charged</dt>
                <dd className={rental.returnRecord.extraKm > 0 ? "font-semibold text-orange-700" : ""}>
                  {rental.returnRecord.extraKm.toLocaleString()} km —{" "}
                  {formatCurrency(decimalToNumber(rental.returnRecord.extraKmCharge))}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Final total</dt>
                <dd className="font-semibold">{formatCurrency(decimalToNumber(rental.finalTotal))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Balance due</dt>
                <dd className="font-semibold text-orange-700">
                  {formatCurrency(decimalToNumber(rental.balance))}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {canCorrectEndingOdometer && rental.returnRecord && startingOdometer != null && (
          <EndingOdometerInlineForm
            rentalId={rental.id}
            startingOdometer={startingOdometer}
            rentalDays={rental.rentalDays}
            includedKm={rental.includedKm}
            includedKmExtraDay={extraDayKm}
            extraKmRate={decimalToNumber(rental.extraKmRate)}
            dailyRate={decimalToNumber(rental.dailyRate)}
            ratePlanType={rental.ratePlanType}
            deliveryCharge={decimalToNumber(rental.deliveryCharge)}
            driverCharge={decimalToNumber(rental.driverCharge)}
            otherCharges={
              decimalToNumber(rental.otherCharges) +
              decimalToNumber(rental.returnRecord.lateReturnCharge) +
              decimalToNumber(rental.returnRecord.additionalCharges)
            }
            discount={decimalToNumber(rental.discount)}
            defaultReturnDate={rental.returnRecord.returnDate.toISOString().split("T")[0]}
            defaultReturnTime={rental.returnRecord.returnTime}
            defaultEndingOdometer={rental.returnRecord.endingOdometer}
            mode="correct"
            embedded
          />
        )}
      </div>
    </FormSectionCard>
  );
}
