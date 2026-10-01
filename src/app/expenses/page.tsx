import Link from "next/link";
import { Suspense } from "react";
import { Receipt, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseCategoryBadge } from "@/components/expenses/expense-category-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { getExpenses, getExpenseSummary } from "@/lib/services/expense";
import { expenseSearchSchema } from "@/lib/validations/expense";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";

interface ExpensesPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const session = await requirePermission("expenses.view");
  const params = expenseSearchSchema.parse(await searchParams);
  const [{ expenses, total, page, totalPages }, summary] = await Promise.all([
    getExpenses(params),
    getExpenseSummary(),
  ]);
  const canCreate = hasPermission(session.user.role, "expenses.create");

  return (
    <DashboardShell title="Expenses">
      <PageHeader
        title="Expense Management"
        description={`${summary.totalExpenses} expenses · ${formatCurrency(summary.monthTotal)} this month`}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/expenses/new"><Plus className="h-4 w-4 mr-2" />Record Expense</Link>
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md mb-4" />}>
            <ExpenseFilters />
          </Suspense>
          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses found"
              description="Owner payables, broker commissions, fuel, repairs, parking, and other costs appear here automatically or when you record them."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Linked To</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Link href={`/expenses/${expense.id}`} className="font-mono text-sm hover:underline">
                          {expense.expenseCode}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                      <TableCell><ExpenseCategoryBadge category={expense.category} /></TableCell>
                      <TableCell className="max-w-[240px] truncate">{expense.description}</TableCell>
                      <TableCell>
                        {expense.vehicle && (
                          <Link href={`/vehicles/${expense.vehicle.id}`} className="hover:underline">
                            {expense.vehicle.registrationNumber}
                          </Link>
                        )}
                        {!expense.vehicle && expense.rental && (
                          <Link href={`/rentals/${expense.rental.id}`} className="hover:underline">
                            {expense.rental.bookingNumber}
                          </Link>
                        )}
                        {!expense.vehicle && !expense.rental && expense.owner && expense.owner.name}
                        {!expense.vehicle && !expense.rental && !expense.owner && expense.broker && expense.broker.name}
                        {!expense.vehicle && !expense.rental && !expense.owner && !expense.broker && "—"}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(decimalToNumber(expense.amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                baseUrl="/expenses"
                searchParams={{
                  search: params.search,
                  category: params.category !== "ALL" ? params.category : undefined,
                  sortBy: params.sortBy,
                  sortOrder: params.sortOrder,
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
