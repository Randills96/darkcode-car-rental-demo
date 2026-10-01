import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ExpenseCategoryBadge } from "@/components/expenses/expense-category-badge";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getExpenseById } from "@/lib/services/expense";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";

interface ExpenseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const session = await requirePermission("expenses.view");
  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) notFound();

  const canEdit = hasPermission(session.user.role, "expenses.edit");
  const canDelete = hasPermission(session.user.role, "expenses.delete");

  return (
    <DashboardShell title={expense.expenseCode}>
      <PageHeader
        title={expense.expenseCode}
        description={expense.description}
        backHref="/expenses"
        actions={
          <div className="flex flex-wrap gap-2">
            <ExpenseCategoryBadge category={expense.category} />
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/expenses/${expense.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
            {canDelete && (
              <DeleteExpenseButton expenseId={expense.id} expenseCode={expense.expenseCode} />
            )}
          </div>
        }
      />

      <Card>
        <CardHeader><CardTitle>Expense Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Date</span>
            <span>{formatDate(expense.expenseDate)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">{formatCurrency(decimalToNumber(expense.amount))}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Recorded By</span>
            <span>{expense.createdBy.name}</span>
          </div>
          {expense.vehicle && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Vehicle</span>
              <Link href={`/vehicles/${expense.vehicle.id}`} className="hover:underline">
                {expense.vehicle.registrationNumber}
              </Link>
            </div>
          )}
          {expense.rental && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Rental</span>
              <Link href={`/rentals/${expense.rental.id}`} className="hover:underline">
                {expense.rental.bookingNumber}
              </Link>
            </div>
          )}
          {expense.owner && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Owner</span>
              <Link href={`/owners/${expense.owner.id}`} className="hover:underline">
                {expense.owner.name}
              </Link>
            </div>
          )}
          {expense.broker && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Broker</span>
              <Link href={`/brokers/${expense.broker.id}`} className="hover:underline">
                {expense.broker.name}
              </Link>
            </div>
          )}
          {expense.notes && (
            <div className="pt-2">
              <span className="text-muted-foreground">Notes: </span>
              <span className="whitespace-pre-wrap">{expense.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
