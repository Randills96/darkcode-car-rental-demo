import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefundDepositForm } from "@/components/payments/refund-deposit-form";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { decimalToNumber, formatCurrency } from "@/lib/utils";
import { getRentalById } from "@/lib/services/rental";
import { ensureHeldSecurityDeposit, remainingDepositAmount } from "@/lib/services/security-deposit";

export const dynamic = "force-dynamic";

interface RefundDepositPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ depositId?: string; edit?: string }>;
}

export default async function RefundDepositPage({ params, searchParams }: RefundDepositPageProps) {
  const session = await requirePermission("payments.create");
  const { id } = await params;
  const { depositId, edit } = await searchParams;
  const isEdit = edit === "1";
  const canEdit = hasPermission(session.user.role, "payments.edit");

  if (isEdit && !canEdit) notFound();

  let rental = await getRentalById(id);
  if (!rental) notFound();

  const alreadyHasDeposit = rental.securityDeposits.length > 0;
  if (
    !alreadyHasDeposit &&
    decimalToNumber(rental.securityDeposit) > 0 &&
    rental.status !== "CANCELLED"
  ) {
    try {
      await ensureHeldSecurityDeposit(id);
      const refreshed = await getRentalById(id);
      if (refreshed) rental = refreshed;
    } catch (error) {
      console.error("ensureHeldSecurityDeposit:", error);
    }
  }

  const activeDeposits = rental.securityDeposits.filter((d) =>
    ["HELD", "PARTIALLY_REFUNDED"].includes(d.status)
  );
  const deposit =
    rental.securityDeposits.find((d) => d.id === depositId) ??
    (isEdit ? rental.securityDeposits[0] : null) ??
    activeDeposits[0] ??
    null;

  const remaining = deposit ? remainingDepositAmount(deposit) : 0;
  const canRefundNow = Boolean(deposit && remaining > 0 && !isEdit);
  const canEditNow = Boolean(deposit && isEdit && canEdit);

  return (
    <DashboardShell title={`Refund deposit · ${rental.bookingNumber}`}>
      <PageHeader
        title={isEdit ? "Edit deposit refund" : "Refund Deposit"}
        description={`${rental.bookingNumber} · ${rental.customer.fullName}`}
        backHref={`/rentals/${rental.id}`}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {deposit
              ? `Held ${formatCurrency(decimalToNumber(deposit.depositAmount))} · remaining ${formatCurrency(remaining)}`
              : "No security deposit to refund"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canRefundNow || canEditNow ? (
            <RefundDepositForm
              rentalId={rental.id}
              depositId={deposit!.id}
              remaining={remaining}
              mode={isEdit ? "edit" : "refund"}
              currentRefundAmount={decimalToNumber(deposit!.refundAmount)}
              currentRetainedAmount={decimalToNumber(deposit!.amountRetained)}
              currentRetainReason={deposit!.retainReason ?? ""}
              currentNotes={deposit!.notes ?? ""}
              currentMethod={deposit!.refundMethod ?? deposit!.paymentMethod ?? "CASH"}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {deposit
                  ? "This deposit has already been fully refunded or retained."
                  : "This hire has no held security deposit to return."}
              </p>
              {deposit && canEdit && (
                <Button variant="outline" asChild>
                  <Link href={`/rentals/${rental.id}/refund-deposit?depositId=${deposit.id}&edit=1`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
