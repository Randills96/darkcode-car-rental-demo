import { z } from "zod";

export const reportSearchSchema = z.object({
  tab: z
    .enum(["profitability", "rentals", "payments", "expenses", "fleet"])
    .default("profitability"),
  view: z.enum(["vehicle", "month", "owner"]).default("vehicle"),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ReportSearchParams = z.infer<typeof reportSearchSchema>;

export const reportExportSchema = z.object({
  reportType: z.enum(["rentals", "payments", "expenses", "fleet", "profitability-vehicle", "profitability-owner"]),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type ReportExportParams = z.infer<typeof reportExportSchema>;
