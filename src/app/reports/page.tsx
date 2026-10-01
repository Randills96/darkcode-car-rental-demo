import Link from "next/link";
import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportExportActions } from "@/components/reports/report-export-actions";
import { ProfitabilityChart } from "@/components/reports/profitability-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  getVehicleProfitability,
  getMonthlyProfitability,
  getOwnerProfitability,
} from "@/lib/services/profitability";
import {
  getRentalReport,
  getPaymentReport,
  getExpenseReport,
  getFleetUtilizationReport,
} from "@/lib/services/reports";
import { reportSearchSchema } from "@/lib/validations/report";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";
import { ExpenseCategoryBadge } from "@/components/expenses/expense-category-badge";
import { PaymentTypeBadge } from "@/components/payments/payment-type-badge";
import { RentalStatusBadge } from "@/components/rentals/rental-status-badge";

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await requirePermission("reports.view");
  const params = reportSearchSchema.parse(await searchParams);
  const canExport = hasPermission(session.user.role, "reports.export");
  const { tab, view, from, to, page, limit } = params;

  return (
    <DashboardShell title="Reports">
      <PageHeader
        title="Reports & Profitability"
        description="Analyze fleet performance, financial trends, and export operational data"
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded-md" />}>
            <ReportFilters />
          </Suspense>
        </CardContent>
      </Card>

      {tab === "profitability" && (
        <ProfitabilitySection view={view} from={from} to={to} canExport={canExport} />
      )}

      {tab === "rentals" && (
        <ReportTableSection
          title="Rental Report"
          exportType="rentals"
          from={from}
          to={to}
          canExport={canExport}
          content={<RentalReportTable from={from} to={to} page={page} limit={limit} />}
        />
      )}

      {tab === "payments" && (
        <ReportTableSection
          title="Payment Report"
          exportType="payments"
          from={from}
          to={to}
          canExport={canExport}
          content={<PaymentReportTable from={from} to={to} page={page} limit={limit} />}
        />
      )}

      {tab === "expenses" && (
        <ReportTableSection
          title="Expense Report"
          exportType="expenses"
          from={from}
          to={to}
          canExport={canExport}
          content={<ExpenseReportTable from={from} to={to} page={page} limit={limit} />}
        />
      )}

      {tab === "fleet" && (
        <ReportTableSection
          title="Fleet Utilization"
          exportType="fleet"
          from={from}
          to={to}
          canExport={canExport}
          content={<FleetReportTable from={from} to={to} />}
        />
      )}
    </DashboardShell>
  );
}

async function ProfitabilitySection({
  view,
  from,
  to,
  canExport,
}: {
  view: string;
  from?: string;
  to?: string;
  canExport: boolean;
}) {
  const [vehicles, months, owners] = await Promise.all([
    getVehicleProfitability(from, to),
    view === "month" ? getMonthlyProfitability(6) : Promise.resolve([]),
    view === "owner" ? getOwnerProfitability(from, to) : Promise.resolve([]),
  ]);

  const summary = {
    totalRevenue: vehicles.reduce((sum, row) => sum + row.revenue, 0),
    totalCosts: vehicles.reduce((sum, row) => sum + row.totalCosts, 0),
    totalProfit: vehicles.reduce((sum, row) => sum + row.netProfit, 0),
    vehicleCount: vehicles.length,
    profitableVehicles: vehicles.filter((row) => row.netProfit > 0).length,
    monthlyTrend: months,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Costs</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(summary.totalCosts)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Profit</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(summary.totalProfit)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Profitable Vehicles</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{summary.profitableVehicles} / {summary.vehicleCount}</p></CardContent>
        </Card>
      </div>

      {view === "month" && (
        <Card>
          <CardHeader><CardTitle>Monthly Profit Trend</CardTitle></CardHeader>
          <CardContent>
            <ProfitabilityChart data={summary.monthlyTrend.map((m) => ({ monthLabel: m.monthLabel, revenue: m.revenue, netProfit: m.netProfit }))} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {view === "month" ? "Monthly Breakdown" : view === "owner" ? "Owner Profitability" : "Vehicle Profitability"}
          </CardTitle>
          {canExport && (
            <ReportExportActions
              reportType={view === "owner" ? "profitability-owner" : "profitability-vehicle"}
              from={from}
              to={to}
            />
          )}
        </CardHeader>
        <CardContent>
          {view === "month" ? (
            <MonthlyProfitabilityTable data={summary.monthlyTrend} />
          ) : view === "owner" ? (
            <OwnerProfitabilityTable data={owners} />
          ) : (
            <VehicleProfitabilityTable data={vehicles} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function VehicleProfitabilityTable({
  data,
}: {
  data: Awaited<ReturnType<typeof getVehicleProfitability>>;
}) {
  if (data.length === 0) {
    return <EmptyState icon={BarChart3} title="No data" description="No completed rentals in the selected period." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vehicle</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead className="text-right">Rentals</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Costs</TableHead>
          <TableHead className="text-right">Net Profit</TableHead>
          <TableHead className="text-right">Margin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.vehicleId}>
            <TableCell>
              <Link href={`/vehicles/${row.vehicleId}`} className="hover:underline font-medium">
                {row.registrationNumber}
              </Link>
              <p className="text-xs text-muted-foreground">{row.label.split(" — ")[1]}</p>
            </TableCell>
            <TableCell>{row.ownerName ?? "Company"}</TableCell>
            <TableCell className="text-right">{row.rentalCount}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.totalCosts)}</TableCell>
            <TableCell className={`text-right font-medium ${row.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatCurrency(row.netProfit)}
            </TableCell>
            <TableCell className="text-right">{row.marginPercent.toFixed(1)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

async function MonthlyProfitabilityTable({
  data,
}: {
  data: Awaited<ReturnType<typeof getMonthlyProfitability>>;
}) {
  if (data.length === 0) {
    return <EmptyState icon={BarChart3} title="No data" description="No monthly profitability data available." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Expenses</TableHead>
          <TableHead className="text-right">Maintenance</TableHead>
          <TableHead className="text-right">Owner Payouts</TableHead>
          <TableHead className="text-right">Broker Payouts</TableHead>
          <TableHead className="text-right">Net Profit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.month}>
            <TableCell>{row.monthLabel}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.expenses)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.maintenance)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.ownerPayouts)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.brokerPayouts)}</TableCell>
            <TableCell className={`text-right font-medium ${row.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatCurrency(row.netProfit)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

async function OwnerProfitabilityTable({
  data,
}: {
  data: Awaited<ReturnType<typeof getOwnerProfitability>>;
}) {
  if (data.length === 0) {
    return <EmptyState icon={BarChart3} title="No owner data" description="No partner owners with rentals in this period." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Owner</TableHead>
          <TableHead className="text-right">Vehicles</TableHead>
          <TableHead className="text-right">Rentals</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Company Commission</TableHead>
          <TableHead className="text-right">Owner Payable</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.ownerId}>
            <TableCell>
              <Link href={`/owners/${row.ownerId}`} className="hover:underline font-medium">{row.name}</Link>
              <p className="text-xs text-muted-foreground">{row.ownerCode}</p>
            </TableCell>
            <TableCell className="text-right">{row.vehicleCount}</TableCell>
            <TableCell className="text-right">{row.rentalCount}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.rentalRevenue)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.companyCommission)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.ownerPayable)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.ownerOutstanding)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ReportTableSection({
  title,
  exportType,
  from,
  to,
  canExport,
  content,
}: {
  title: string;
  exportType: "rentals" | "payments" | "expenses" | "fleet";
  from?: string;
  to?: string;
  canExport: boolean;
  content: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {canExport && <ReportExportActions reportType={exportType} from={from} to={to} />}
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

async function RentalReportTable({
  from,
  to,
  page,
  limit,
}: {
  from?: string;
  to?: string;
  page: number;
  limit: number;
}) {
  const { rentals, totalPages } = await getRentalReport(from, to, page, limit);
  if (rentals.length === 0) {
    return <EmptyState icon={BarChart3} title="No rentals" description="No rentals match the selected date range." />;
  }
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Pickup</TableHead>
            <TableHead>Return</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Final Total</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rentals.map((rental) => (
            <TableRow key={rental.id}>
              <TableCell><Link href={`/rentals/${rental.id}`} className="hover:underline">{rental.bookingNumber}</Link></TableCell>
              <TableCell>{rental.customer.fullName}</TableCell>
              <TableCell>{rental.vehicle?.registrationNumber ?? "—"}</TableCell>
              <TableCell>{formatDate(rental.pickupDate)}</TableCell>
              <TableCell>{formatDate(rental.returnDate)}</TableCell>
              <TableCell><RentalStatusBadge status={rental.status} /></TableCell>
              <TableCell className="text-right">{formatCurrency(decimalToNumber(rental.finalTotal))}</TableCell>
              <TableCell className="text-right">{formatCurrency(decimalToNumber(rental.balance))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} totalPages={totalPages} baseUrl="/reports" searchParams={{ tab: "rentals", from, to }} />
    </>
  );
}

async function PaymentReportTable({
  from,
  to,
  page,
  limit,
}: {
  from?: string;
  to?: string;
  page: number;
  limit: number;
}) {
  const { payments, totalPages } = await getPaymentReport(from, to, page, limit);
  if (payments.length === 0) {
    return <EmptyState icon={BarChart3} title="No payments" description="No payments in the selected date range." />;
  }
  return (
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
              <TableCell>{payment.rental.bookingNumber}</TableCell>
              <TableCell>{payment.customer.fullName}</TableCell>
              <TableCell><PaymentTypeBadge type={payment.paymentType} /></TableCell>
              <TableCell>{payment.paymentMethod.replace(/_/g, " ")}</TableCell>
              <TableCell className="text-right">{formatCurrency(decimalToNumber(payment.amount))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} totalPages={totalPages} baseUrl="/reports" searchParams={{ tab: "payments", from, to }} />
    </>
  );
}

async function ExpenseReportTable({
  from,
  to,
  page,
  limit,
}: {
  from?: string;
  to?: string;
  page: number;
  limit: number;
}) {
  const { expenses, totalPages } = await getExpenseReport(from, to, page, limit);
  if (expenses.length === 0) {
    return <EmptyState icon={BarChart3} title="No expenses" description="No expenses in the selected date range." />;
  }
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell><Link href={`/expenses/${expense.id}`} className="hover:underline font-mono text-sm">{expense.expenseCode}</Link></TableCell>
              <TableCell>{formatDate(expense.expenseDate)}</TableCell>
              <TableCell><ExpenseCategoryBadge category={expense.category} /></TableCell>
              <TableCell className="max-w-[220px] truncate">{expense.description}</TableCell>
              <TableCell>{expense.vehicle?.registrationNumber ?? "—"}</TableCell>
              <TableCell className="text-right">{formatCurrency(decimalToNumber(expense.amount))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} totalPages={totalPages} baseUrl="/reports" searchParams={{ tab: "expenses", from, to }} />
    </>
  );
}

async function FleetReportTable({ from, to }: { from?: string; to?: string }) {
  const fleet = await getFleetUtilizationReport(from, to);
  if (fleet.length === 0) {
    return <EmptyState icon={BarChart3} title="No fleet data" description="No active vehicles found." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vehicle</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Rentals</TableHead>
          <TableHead className="text-right">Rented Days</TableHead>
          <TableHead className="text-right">Period Days</TableHead>
          <TableHead className="text-right">Utilization</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fleet.map((vehicle) => (
          <TableRow key={vehicle.id}>
            <TableCell>
              <Link href={`/vehicles/${vehicle.id}`} className="hover:underline font-medium">{vehicle.registrationNumber}</Link>
              <p className="text-xs text-muted-foreground">{vehicle.make} {vehicle.model}</p>
            </TableCell>
            <TableCell>{vehicle.status}</TableCell>
            <TableCell className="text-right">{vehicle.rentalCount}</TableCell>
            <TableCell className="text-right">{vehicle.rentedDays}</TableCell>
            <TableCell className="text-right">{vehicle.periodDays}</TableCell>
            <TableCell className="text-right">{vehicle.utilizationPercent.toFixed(1)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
