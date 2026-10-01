"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; expenses: number }>;
}

const SLICE_COLORS = {
  revenue: "hsl(142, 76%, 36%)",
  expenses: "hsl(0, 84%, 60%)",
} as const;

export function RevenueChart({ data }: RevenueChartProps) {
  const totals = useMemo(
    () =>
      data.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          expenses: acc.expenses + row.expenses,
        }),
        { revenue: 0, expenses: 0 }
      ),
    [data]
  );

  const pieData = [
    { name: "Revenue", value: totals.revenue, color: SLICE_COLORS.revenue },
    { name: "Expenses", value: totals.expenses, color: SLICE_COLORS.expenses },
  ].filter((entry) => entry.value > 0);

  const netTotal = totals.revenue - totals.expenses;
  const hasData = pieData.length > 0;

  return (
    <div className="relative h-[240px] w-full min-w-0 sm:h-[300px]">
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No revenue or expense data for the last 6 months
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={3}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value) => {
                  const entry = pieData.find((item) => item.name === value);
                  if (!entry) return value;
                  const share =
                    totals.revenue + totals.expenses > 0
                      ? ((entry.value / (totals.revenue + totals.expenses)) * 100).toFixed(0)
                      : "0";
                  return `${value} (${share}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Net (6 mo)
            </span>
            <span
              className={`text-base font-bold sm:text-lg ${
                netTotal >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {formatCurrency(netTotal)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
