import { z } from "zod";

export const expenseFormSchema = z.object({
  category: z.enum([
    "FUEL",
    "MAINTENANCE",
    "REPAIR",
    "INSURANCE",
    "REVENUE_LICENCE",
    "EMISSION_TEST",
    "DRIVER_PAYMENT",
    "DRIVER_ACCOMMODATION",
    "PARKING",
    "TOLL",
    "CLEANING",
    "OWNER_PAYMENT",
    "BROKER_COMMISSION",
    "OTHER",
  ]),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  expenseDate: z.string().min(1, "Expense date is required"),
  description: z.string().min(1, "Description is required").max(2000),
  vehicleId: z.string().optional().or(z.literal("")),
  rentalId: z.string().optional().or(z.literal("")),
  ownerId: z.string().optional().or(z.literal("")),
  brokerId: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const expenseSearchSchema = z.object({
  search: z.string().optional(),
  category: z
    .enum([
      "ALL",
      "FUEL",
      "MAINTENANCE",
      "REPAIR",
      "INSURANCE",
      "REVENUE_LICENCE",
      "EMISSION_TEST",
      "DRIVER_PAYMENT",
      "DRIVER_ACCOMMODATION",
      "PARKING",
      "TOLL",
      "CLEANING",
      "OWNER_PAYMENT",
      "BROKER_COMMISSION",
      "OTHER",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["expenseDate", "createdAt", "amount", "expenseCode"]).default("expenseDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ExpenseSearchParams = z.infer<typeof expenseSearchSchema>;
