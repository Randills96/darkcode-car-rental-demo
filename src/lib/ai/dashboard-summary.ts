import { createChatCompletion } from "@/lib/ai/openai-client";
import { isAiEnabled } from "@/lib/ai/config";
import { formatCurrency } from "@/lib/utils";

export interface DashboardSummaryInput {
  companyName: string;
  operations: {
    todayRentals: number;
    activeRentals: number;
    availableVehicles: number;
    dueForReturn: number;
    overdueRentals: number;
  };
  financial: {
    todayRevenue: number;
    monthRevenue: number;
    monthExpenses: number;
    monthProfit: number;
    outstandingBalances: number;
  };
  compliance: {
    expiringInsurance7: number;
    expiredInsurance: number;
    serviceDue: number;
  };
  upcomingJobs: {
    today: number;
    tomorrowReminders: number;
    overdue: number;
  };
  alertCount: number;
}

export function buildTemplateDashboardSummary(input: DashboardSummaryInput): string {
  const lines: string[] = [];

  lines.push(
    `Today: ${input.operations.todayRentals} rental(s) in progress, ${input.operations.activeRentals} active booking(s), ${input.operations.availableVehicles} vehicle(s) available.`
  );

  if (input.upcomingJobs.today > 0) {
    lines.push(`${input.upcomingJobs.today} pickup/return job(s) need attention today.`);
  }

  if (input.upcomingJobs.tomorrowReminders > 0) {
    lines.push(`${input.upcomingJobs.tomorrowReminders} customer reminder call(s) scheduled for tomorrow.`);
  }

  if (input.operations.overdueRentals > 0) {
    lines.push(`${input.operations.overdueRentals} rental(s) are overdue — follow up immediately.`);
  }

  lines.push(
    `Revenue today ${formatCurrency(input.financial.todayRevenue)}; month net ${formatCurrency(input.financial.monthProfit)} (${formatCurrency(input.financial.monthRevenue)} revenue, ${formatCurrency(input.financial.monthExpenses)} expenses).`
  );

  if (input.financial.outstandingBalances > 0) {
    lines.push(`Outstanding customer balances total ${formatCurrency(input.financial.outstandingBalances)}.`);
  }

  const complianceIssues =
    input.compliance.expiredInsurance +
    input.compliance.expiringInsurance7 +
    input.compliance.serviceDue;

  if (complianceIssues > 0) {
    lines.push(
      `Fleet compliance: ${input.compliance.expiredInsurance} expired insurance, ${input.compliance.expiringInsurance7} expiring within 7 days, ${input.compliance.serviceDue} service due soon.`
    );
  }

  if (input.alertCount > 0) {
    lines.push(`${input.alertCount} alert(s) are active on the dashboard.`);
  }

  if (lines.length === 1 && input.alertCount === 0) {
    lines.push("Operations look steady — no urgent issues flagged right now.");
  }

  return lines.join("\n\n");
}

export async function generateDashboardSummary(
  input: DashboardSummaryInput
): Promise<{ summary: string; source: "ai" | "template" }> {
  const template = buildTemplateDashboardSummary(input);

  if (!isAiEnabled()) {
    return { summary: template, source: "template" };
  }

  try {
    const summary = await createChatCompletion({
      temperature: 0.3,
      maxTokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You summarize car rental back-office dashboard metrics for a manager. Be concise, actionable, and plain text (no markdown headings).",
        },
        {
          role: "user",
          content: `Summarize today's operations for ${input.companyName} using this data:
Operations: ${JSON.stringify(input.operations)}
Financial: ${JSON.stringify(input.financial)}
Compliance: ${JSON.stringify(input.compliance)}
Upcoming jobs: ${JSON.stringify(input.upcomingJobs)}
Alerts: ${input.alertCount}

Write 3-5 short paragraphs. Prioritize overdue rentals, tomorrow reminders, compliance risks, and cashflow.`,
        },
      ],
    });

    return { summary: summary.trim(), source: "ai" };
  } catch {
    return { summary: template, source: "template" };
  }
}
