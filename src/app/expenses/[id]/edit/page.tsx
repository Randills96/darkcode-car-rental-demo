import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { requirePermission } from "@/lib/auth/session";
import { getExpenseById, getExpenseFormOptions } from "@/lib/services/expense";
import { decimalToNumber, toDateInputValue } from "@/lib/utils";

interface EditExpensePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  await requirePermission("expenses.edit");
  const { id } = await params;
  const [expense, options] = await Promise.all([getExpenseById(id), getExpenseFormOptions()]);
  if (!expense) notFound();

  return (
    <DashboardShell title={`Edit ${expense.expenseCode}`}>
      <PageHeader
        title={`Edit ${expense.expenseCode}`}
        description="Update this expense. Staff cannot edit expenses."
        backHref={`/expenses/${expense.id}`}
      />
      <ExpenseForm
        options={options}
        expenseId={expense.id}
        defaultValues={{
          category: expense.category,
          amount: decimalToNumber(expense.amount),
          expenseDate: toDateInputValue(expense.expenseDate),
          description: expense.description,
          vehicleId: expense.vehicleId || "",
          rentalId: expense.rentalId || "",
          ownerId: expense.ownerId || "",
          brokerId: expense.brokerId || "",
          notes: expense.notes || "",
        }}
      />
    </DashboardShell>
  );
}
