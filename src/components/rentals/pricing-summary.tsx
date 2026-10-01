import { FormSectionCard } from "@/components/ui/form-section-card";
import { formatCurrency } from "@/lib/utils";
import type { PricingResult } from "@/lib/services/pricing";

interface PricingSummaryProps {
  pricing: PricingResult | null;
  loading?: boolean;
}

export function PricingSummary({ pricing, loading }: PricingSummaryProps) {
  return (
    <FormSectionCard title="Pricing Summary" variant="indigo" className="!shadow-md">
        {loading ? (
          <p className="text-sm text-muted-foreground">Calculating...</p>
        ) : !pricing ? (
          <p className="text-sm text-muted-foreground">Set dates and rates to preview pricing.</p>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Rental days</dt>
              <dd>{pricing.rentalDays}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Base amount</dt>
              <dd>{formatCurrency(pricing.baseAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Included KM</dt>
              <dd>{pricing.includedKm} km</dd>
            </div>
            {pricing.deliveryCharge > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd>{formatCurrency(pricing.deliveryCharge)}</dd>
              </div>
            )}
            {pricing.driverCharge > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Driver charge</dt>
                <dd>{formatCurrency(pricing.driverCharge)}</dd>
              </div>
            )}
            {pricing.otherCharges > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Other charges</dt>
                <dd>{formatCurrency(pricing.otherCharges)}</dd>
              </div>
            )}
            {pricing.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Discount</dt>
                <dd>-{formatCurrency(pricing.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <dt>Estimated total</dt>
              <dd>{formatCurrency(pricing.finalTotal)}</dd>
            </div>
          </dl>
        )}
    </FormSectionCard>
  );
}
