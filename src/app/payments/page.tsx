import Link from "next/link";
import { Suspense } from "react";
import { CreditCard } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PaymentFilters } from "@/components/payments/payment-filters";
import { PaymentTypeBadge } from "@/components/payments/payment-type-badge";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
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
import { getPayments, getRentalsForPaymentSelect } from "@/lib/services/payment";
import { paymentSearchSchema } from "@/lib/validations/payment";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";

interface PaymentsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const session = await requirePermission("payments.view");
  const params = paymentSearchSchema.parse(await searchParams);
  const { payments, total, page, totalPages } = await getPayments(params);
  const rentalsRaw = await getRentalsForPaymentSelect();
  const rentals = rentalsRaw.map((r) => ({
    id: r.id,
    bookingNumber: r.bookingNumber,
    status: r.status,
    customer: r.customer,
    finalTotal: decimalToNumber(r.finalTotal),
    balance: decimalToNumber(r.balance),
  }));
  const canCreate = hasPermission(session.user.role, "payments.create");

  return (
    <DashboardShell title="Payments">
      <PageHeader
        title="Payment Management"
        description={`${total} payment${total !== 1 ? "s" : ""} recorded`}
        actions={canCreate ? <RecordPaymentDialog rentals={rentals} /> : undefined}
      />
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md mb-4" />}>
            <PaymentFilters />
          </Suspense>
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments found" description="Record a payment against a rental to get started." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">{payment.paymentCode}</TableCell>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell><Link href={`/rentals/${payment.rental.id}`} className="hover:underline">{payment.rental.bookingNumber}</Link></TableCell>
                      <TableCell><Link href={`/customers/${payment.customer.id}`} className="hover:underline">{payment.customer.fullName}</Link></TableCell>
                      <TableCell><PaymentTypeBadge type={payment.paymentType} /></TableCell>
                      <TableCell>{payment.paymentMethod.replace("_", " ")}</TableCell>
                      <TableCell className="text-right">{formatCurrency(decimalToNumber(payment.amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} totalPages={totalPages} baseUrl="/payments" searchParams={{
                search: params.search,
                paymentType: params.paymentType !== "ALL" ? params.paymentType : undefined,
                paymentMethod: params.paymentMethod !== "ALL" ? params.paymentMethod : undefined,
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
