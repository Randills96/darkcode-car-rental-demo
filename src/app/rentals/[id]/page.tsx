import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { RentalProfile } from "@/components/rentals/rental-profile";
import { RentalStatusBadge } from "@/components/rentals/rental-status-badge";
import { Button } from "@/components/ui/button";
import { RefundDepositActions } from "@/components/payments/refund-deposit-actions";
import { CallCustomerButton } from "@/components/customers/call-customer-button";
import { requireNonDriver } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { decimalToNumber } from "@/lib/utils";
import { getRentalById, getRentalFormOptions } from "@/lib/services/rental";
import { getRentalsForPaymentSelect } from "@/lib/services/payment";
import { createSettlementsForCompletedRental } from "@/lib/services/settlement";
import { ensureHeldSecurityDeposit, getDepositRefundUiState } from "@/lib/services/security-deposit";

export const dynamic = "force-dynamic";

interface RentalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RentalDetailPage({ params }: RentalDetailPageProps) {
  const session = await requireNonDriver("rentals.view");
  const { id } = await params;
  let rental = await getRentalById(id);
  if (!rental) notFound();

  if (decimalToNumber(rental.securityDeposit) > 0) {
    try {
      await ensureHeldSecurityDeposit(id);
      const withDeposit = await getRentalById(id);
      if (withDeposit) rental = withDeposit;
    } catch (error) {
      console.error("ensureHeldSecurityDeposit:", error);
    }
  }

  if (
    ["RETURNED", "COMPLETED"].includes(rental.status) &&
    (rental.brokerId || rental.vehicle?.ownerId)
  ) {
    try {
      await createSettlementsForCompletedRental(id);
      const refreshed = await getRentalById(id);
      if (refreshed) rental = refreshed;
    } catch (error) {
      console.error("createSettlementsForCompletedRental:", error);
    }
  }

  const { vehicles } = await getRentalFormOptions();
  const rentalOptions = await getRentalsForPaymentSelect();
  const canEdit = hasPermission(session.user.role, "rentals.edit");
  const canCancel = hasPermission(session.user.role, "rentals.cancel");
  const canHandover = hasPermission(session.user.role, "rentals.handover");
  const canReturn = hasPermission(session.user.role, "rentals.return");
  const canCreatePayment = hasPermission(session.user.role, "payments.create");
  const canEditPayment = hasPermission(session.user.role, "payments.edit");
  const canCreateDamage = hasPermission(session.user.role, "damages.create");
  const canPaySettlement = hasPermission(session.user.role, "settlements.create");
  const canEditRental = canEdit && ["INQUIRY", "QUOTED", "CONFIRMED"].includes(rental.status);
  const depositUi = getDepositRefundUiState(rental.securityDeposits);
  const canManageDeposit = canCreatePayment || canEditPayment;
  const showRefundAction =
    canManageDeposit &&
    rental.status !== "CANCELLED" &&
    (depositUi.hasActive || depositUi.isFullySettled || decimalToNumber(rental.securityDeposit) > 0);

  return (
    <DashboardShell title={rental.bookingNumber}>
      <PageHeader
        title={rental.bookingNumber}
        description={`${rental.customer.fullName} · ${rental.rentalType.replace("_", " ")}`}
        backHref="/rentals"
        actions={
          <>
            <CallCustomerButton phone={rental.customer.phone} />
            {showRefundAction && (
              <RefundDepositActions
                rentalId={rental.id}
                canRefund={depositUi.hasActive || (!depositUi.isFullySettled && decimalToNumber(rental.securityDeposit) > 0)}
                isFullySettled={depositUi.isFullySettled}
                canEdit={canEditPayment}
              />
            )}
            <RentalStatusBadge status={rental.status} />
            {canEditRental && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/rentals/${rental.id}/edit`}><Pencil className="h-4 w-4 mr-2" />Edit</Link>
              </Button>
            )}
          </>
        }
      />
      <RentalProfile
        rental={rental}
        vehicles={vehicles}
        rentalOptions={rentalOptions}
        canEdit={canEdit}
        canCancel={canCancel}
        canHandover={canHandover}
        canReturn={canReturn}
        canCreatePayment={canCreatePayment}
        canEditPayment={canEditPayment}
        canCreateDamage={canCreateDamage}
        canPaySettlement={canPaySettlement}
      />
    </DashboardShell>
  );
}
