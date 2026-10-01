import { z } from "zod";

export const settlementPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]),
  paymentDate: z.string().min(1, "Payment date is required"),
  referenceNumber: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type SettlementPaymentFormValues = z.infer<typeof settlementPaymentSchema>;

export const ownerSettlementSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "PENDING", "PARTIALLY_PAID", "PAID"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "paymentDate", "ownerPayable", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type OwnerSettlementSearchParams = z.infer<typeof ownerSettlementSearchSchema>;

export const brokerCommissionSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "PENDING", "PARTIALLY_PAID", "PAID"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "paymentDate", "commissionAmount", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type BrokerCommissionSearchParams = z.infer<typeof brokerCommissionSearchSchema>;

export const driverPaymentSearchSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["paymentDate", "createdAt", "amount"]).default("paymentDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type DriverPaymentSearchParams = z.infer<typeof driverPaymentSearchSchema>;

export const settlementsPageSchema = z.object({
  tab: z.enum(["owners", "brokers", "drivers"]).default("owners"),
});

export type SettlementsPageParams = z.infer<typeof settlementsPageSchema>;
