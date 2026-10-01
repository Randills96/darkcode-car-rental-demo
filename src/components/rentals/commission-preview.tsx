"use client";

import { FormSectionCard } from "@/components/ui/form-section-card";
import {
  calculateBrokerCommission,
  calculateOwnerSettlement,
  deriveOwnerRatesFromCustomerRates,
} from "@/lib/services/commission-calculator";
import { formatCurrency } from "@/lib/utils";

interface CommissionPreviewProps {
  rentalDays: number;
  brokerId?: string;
  brokerCommissionPerDay?: number;
  brokerCommissionPerExtraKm?: number;
  vehicleOwnershipType?: string;
  vehicleOwnerId?: string | null;
  customerDailyRate?: number;
  customerExtraKmRate?: number;
  ownerDailyRate?: number | null;
  ownerExtraKmRate?: number | null;
}

export function CommissionPreview({
  rentalDays,
  brokerId,
  brokerCommissionPerDay = 0,
  brokerCommissionPerExtraKm = 0,
  vehicleOwnershipType,
  vehicleOwnerId,
  customerDailyRate = 0,
  customerExtraKmRate = 0,
  ownerDailyRate,
  ownerExtraKmRate,
}: CommissionPreviewProps) {
  const paysOwner =
    Boolean(vehicleOwnerId) ||
    vehicleOwnershipType === "THIRD_PARTY_OWNED" ||
    vehicleOwnershipType === "PERSONALLY_OWNED";

  const brokerPreview = brokerId
    ? calculateBrokerCommission({
        brokerId,
        brokerCommissionPerDay,
        brokerCommissionPerExtraKm,
        rentalDays,
        extraKm: 0,
      })
    : null;

  const ownerPreview = paysOwner
    ? calculateOwnerSettlement({
        ownershipType: vehicleOwnershipType,
        ownerId: vehicleOwnerId || "preview",
        ownerDailyRate: ownerDailyRate ?? null,
        ownerExtraKmRate: ownerExtraKmRate ?? null,
        customerDailyRate,
        customerExtraKmRate,
        rentalDays,
        extraKm: 0,
        finalTotal: 0,
      })
    : null;

  const margins = deriveOwnerRatesFromCustomerRates({
    customerDailyRate,
    customerExtraKmRate,
    ownerDailyRate,
    ownerExtraKmRate,
  });

  if (!brokerPreview && !ownerPreview) return null;

  return (
    <FormSectionCard title="Commission Preview" variant="violet">
      <div className="space-y-4 text-sm">
        {brokerPreview && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="font-medium">Referral broker payout</p>
            <p className="mt-1 text-muted-foreground">
              {formatCurrency(brokerPreview.commissionPerDay)} × {rentalDays} day(s)
              {brokerPreview.commissionPerExtraKm > 0 &&
                ` + ${formatCurrency(brokerPreview.commissionPerExtraKm)} × extra km at return`}
            </p>
            <p className="mt-2 font-semibold">
              Estimated now: {formatCurrency(brokerPreview.commissionAmount)}
            </p>
          </div>
        )}

        {ownerPreview && (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <p className="font-medium">Third-party owner split</p>
            {ownerPreview.usesFormula ? (
              <>
                <div className="grid gap-1 text-muted-foreground">
                  <p>
                    You keep: {formatCurrency(margins.companyDailyMargin ?? 0)}/day
                    {margins.companyExtraKmMargin != null &&
                      ` + ${formatCurrency(margins.companyExtraKmMargin)}/extra km`}
                  </p>
                  <p>
                    Owner gets: {formatCurrency(ownerPreview.ownerDailyRate)}/day
                    {ownerPreview.ownerExtraKmRate > 0 &&
                      ` + ${formatCurrency(ownerPreview.ownerExtraKmRate)}/extra km`}
                  </p>
                </div>
                <p className="font-semibold">
                  Estimated owner payout (no extra km yet):{" "}
                  {formatCurrency(ownerPreview.ownerPayable)}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Set owner payout rates below, or a flat settlement will use system defaults on
                completion.
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Extra kilometer commissions are calculated when the vehicle is returned.
        </p>
      </div>
    </FormSectionCard>
  );
}
