import dynamic from "next/dynamic";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard, CurrencyStatCard, FleetStatTile } from "@/components/dashboard/stat-card";
import { DashboardPanelCard, DashboardSection } from "@/components/dashboard/dashboard-panel-card";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { AlertItem } from "@/components/dashboard/alert-item";

const RevenueChart = dynamic(
  () => import("@/components/dashboard/revenue-chart").then((mod) => mod.RevenueChart),
  {
    loading: () => <div className="h-[240px] animate-pulse rounded-md bg-muted/40" />,
  }
);
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UpcomingJobsPanel } from "@/components/dashboard/upcoming-jobs-panel";
import { AutoSyncNotifications } from "@/components/dashboard/auto-sync-notifications";
import { DashboardAiSummary } from "@/components/dashboard/dashboard-ai-summary";
import { getDashboardData, getMonthlyRevenueChart } from "@/lib/services/dashboard";
import { isAiEnabled } from "@/lib/ai/config";
import { requireAuth } from "@/lib/auth/session";
import {
  CalendarDays,
  Car,
  Clock,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Users,
  Wrench,
} from "lucide-react";

export default async function DashboardPage() {
  const [session, data, chartData] = await Promise.all([
    requireAuth(),
    getDashboardData(),
    getMonthlyRevenueChart(),
  ]);

  const tomorrowReminders = data.upcomingJobs.filter((job) =>
    ["PICKUP_REMINDER", "RETURN_REMINDER"].includes(job.type)
  ).length;
  const aiEnabled = isAiEnabled();

  return (
    <DashboardShell title="Dashboard">
      <AutoSyncNotifications />
      <div className="dashboard-page space-y-6 sm:space-y-8">
        <DashboardHero
          userName={session.user.name}
          activeRentals={data.operations.activeRentals}
          availableVehicles={data.operations.availableVehicles}
          monthProfit={data.financial.monthProfit}
          overdueRentals={data.operations.overdueRentals}
        />

        <DashboardAiSummary aiEnabled={aiEnabled} />
        <UpcomingJobsPanel jobs={data.upcomingJobs} />

        <div className="grid gap-6 xl:grid-cols-5">
          <DashboardPanelCard title="Rental pipeline" className="xl:col-span-3">
            <PipelineBoard {...data.rentalStatus} />
          </DashboardPanelCard>

          <DashboardPanelCard
            title="Today’s operations"
            className="xl:col-span-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title="Tomorrow reminders"
                value={tomorrowReminders}
                icon={CalendarDays}
                variant={tomorrowReminders > 0 ? "indigo" : "slate"}
                description="Call before pickup/return"
                href="/notifications"
              />
              <StatCard
                title="Today’s rentals"
                value={data.operations.todayRentals}
                icon={CalendarDays}
                variant="sky"
                href="/rentals"
              />
              <StatCard
                title="Due for return"
                value={data.operations.dueForReturn}
                icon={Clock}
                variant="cyan"
                href="/rentals?status=ACTIVE"
              />
              <StatCard
                title="In maintenance"
                value={data.operations.maintenanceVehicles}
                icon={Wrench}
                variant="orange"
                href="/vehicles?status=MAINTENANCE"
              />
              <StatCard
                title="Reserved"
                value={data.operations.reservedVehicles}
                icon={Clock}
                variant="amber"
                href="/vehicles?status=RESERVED"
              />
              <StatCard
                title="Overdue"
                value={data.operations.overdueRentals}
                icon={AlertTriangle}
                variant={data.operations.overdueRentals > 0 ? "rose" : "slate"}
                href="/rentals?status=ACTIVE"
              />
            </div>
          </DashboardPanelCard>
        </div>

        <DashboardSection
          title="Financial summary"
          description="Completed hire income, owner costs, and amounts still outstanding"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CurrencyStatCard title="Today’s revenue" amount={data.financial.todayRevenue} icon={TrendingUp} variant="emerald" href="/reports?tab=profitability" />
            <CurrencyStatCard title="Month revenue" amount={data.financial.monthRevenue} icon={TrendingUp} variant="sky" href="/reports?tab=profitability" />
            <CurrencyStatCard title="Month expenses" amount={data.financial.monthExpenses} icon={Wallet} variant="orange" href="/expenses" />
            <CurrencyStatCard
              title="Month net profit"
              amount={data.financial.monthProfit}
              icon={TrendingUp}
              variant={data.financial.monthProfit >= 0 ? "emerald" : "rose"}
              description={data.financial.monthProfit >= 0 ? "Profitable this month" : "Loss this month"}
              href="/reports?tab=profitability&view=month"
            />
            <CurrencyStatCard title="Outstanding balances" amount={data.financial.outstandingBalances} icon={Users} variant="amber" href="/rentals?status=ACTIVE" />
            <CurrencyStatCard title="Pending owner payments" amount={data.financial.pendingOwnerPayments} icon={Wallet} variant="violet" href="/settlements?tab=owners" />
            <CurrencyStatCard title="Pending broker commissions" amount={data.financial.pendingBrokerCommissions} icon={Wallet} variant="indigo" href="/settlements?tab=brokers" />
            <CurrencyStatCard title="Security deposits held" amount={data.financial.heldDeposits} icon={Wallet} variant="cyan" href="/payments" />
          </div>
        </DashboardSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardPanelCard
            title="Fleet status"
            action={
              <Link href="/vehicles" className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline">
                View fleet
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <FleetStatTile value={data.fleet.totalVehicles} label="Total vehicles" href="/vehicles" variant="slate" />
              <FleetStatTile value={data.fleet.availableVehicles} label="Available" href="/vehicles?status=AVAILABLE" variant="emerald" />
              <FleetStatTile value={data.fleet.reservedVehicles} label="Reserved" href="/vehicles?status=RESERVED" variant="amber" />
              <FleetStatTile value={data.fleet.rentedVehicles} label="On rent" href="/vehicles?status=RENTED" variant="sky" />
              <FleetStatTile value={data.fleet.maintenanceVehicles} label="Maintenance" href="/vehicles?status=MAINTENANCE" variant="orange" />
              <FleetStatTile value={data.fleet.inactiveVehicles} label="Inactive" href="/vehicles?status=INACTIVE" variant="slate" />
            </div>
          </DashboardPanelCard>

          <DashboardPanelCard
            title="Revenue vs expenses (6 months)"
            href="/reports?tab=profitability&view=month"
          >
            <RevenueChart data={chartData} />
          </DashboardPanelCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardPanelCard
            title="Active rentals"
            action={
              <Link href="/rentals?status=ACTIVE" className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline">
                View all
              </Link>
            }
          >
            {data.recentRentals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No active rentals</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentRentals.map((rental) => (
                    <TableRow key={rental.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <Link href={`/rentals/${rental.id}`} className="hover:underline">
                          {rental.bookingNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{rental.customer.fullName}</TableCell>
                      <TableCell>
                        {rental.vehicle ? (
                          <Link href={`/vehicles/${rental.vehicle.id}`} className="hover:underline">
                            {rental.vehicle.registrationNumber}
                          </Link>
                        ) : (
                          "Unassigned"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rental.status === "ACTIVE" ? "success" : "info"}>
                          {rental.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DashboardPanelCard>

          <DashboardPanelCard
            title="Alerts"
            variant={data.alerts.some((alert) => alert.severity === "CRITICAL") ? "rose" : "slate"}
            action={
              <Link href="/notifications" className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline">
                View all
              </Link>
            }
          >
            {data.alerts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No alerts at this time</p>
            ) : (
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {data.alerts.map((alert, i) => (
                  <AlertItem
                    key={i}
                    title={alert.title}
                    message={alert.message}
                    severity={alert.severity}
                  />
                ))}
              </div>
            )}
          </DashboardPanelCard>
        </div>

        <DashboardSection
          title="Compliance"
          description="Documents and servicing that expire soon"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard title="Insurance 30 days" value={data.compliance.expiringInsurance30} icon={AlertTriangle} variant="amber" href="/vehicles/documents?documentType=INSURANCE&days=30" />
            <StatCard title="Insurance 7 days" value={data.compliance.expiringInsurance7} icon={AlertTriangle} variant="orange" href="/vehicles/documents?documentType=INSURANCE&days=7" />
            <StatCard title="Insurance expired" value={data.compliance.expiredInsurance} icon={AlertTriangle} variant="rose" href="/vehicles/documents?documentType=INSURANCE&days=1" />
            <StatCard title="Revenue licence" value={data.compliance.expiringRevenueLicence} icon={AlertTriangle} variant="violet" href="/vehicles/documents?documentType=REVENUE_LICENCE&days=30" />
            <StatCard title="Emission cert." value={data.compliance.expiringEmission} icon={AlertTriangle} variant="cyan" href="/vehicles/documents?documentType=EMISSION_CERTIFICATE&days=30" />
            <StatCard title="Service due" value={data.compliance.serviceDue} icon={Wrench} variant="indigo" href="/maintenance" />
          </div>
        </DashboardSection>
      </div>
    </DashboardShell>
  );
}
