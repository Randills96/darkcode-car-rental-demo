import { z } from "zod";

export const settingsFormSchema = z.object({
  rental_day_start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format (e.g. 19:00)"),
  default_included_km: z.coerce.number().int().min(0, "Must be 0 or more"),
  default_included_km_extra_day: z.coerce.number().int().min(0, "Must be 0 or more"),
  currency: z.string().min(1).max(10),
  currency_symbol: z.string().min(1).max(10),
  block_blacklisted_booking: z.enum(["true", "false"]),
  company_name: z.string().min(1).max(200),
  default_owner_commission: z.coerce.number().min(0),
  default_broker_commission: z.coerce.number().min(0),
  annual_fee_amount: z.coerce.number().min(0),
  bank_name: z.string().max(120).optional().or(z.literal("")),
  bank_account_name: z.string().max(200).optional().or(z.literal("")),
  bank_account_number: z.string().max(40).optional().or(z.literal("")),
  bank_branch: z.string().max(120).optional().or(z.literal("")),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
