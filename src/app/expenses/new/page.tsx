import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { requirePermission } from "@/lib/auth/session";
import { getExpenseFormOptions } from "@/lib/services/expense";

interface NewExpensePageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function NewExpensePage({ searchParams }: NewExpensePageProps) {
  await requirePermission("expenses.create");
  const params = await searchParams;
  const options = await getExpenseFormOptions();

  return (
    <DashboardShell title="Record Expense">
      <PageHeader
        title="Record Expense"
        description="Log a business expense with optional links to vehicle, rental, owner, or broker"
        backHref="/expenses"
      />
      <ExpenseForm
        options={options}
        defaultVehicleId={params.vehicleId}
        defaultRentalId={params.rentalId}
      />
    </DashboardShell>
  );
}
