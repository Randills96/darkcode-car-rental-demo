import { z } from "zod";

export const damageFormSchema = z.object({
  rentalId: z.string().min(1, "Rental is required"),
  damageType: z.string().min(1, "Damage type is required").max(100),
  description: z.string().min(1, "Description is required").max(2000),
  estimatedCost: z.coerce.number().min(0),
  customerCharge: z.coerce.number().min(0),
  damageDate: z.string().min(1),
  status: z.enum(["REPORTED", "ASSESSED", "CHARGED", "RESOLVED"]).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type DamageFormValues = z.infer<typeof damageFormSchema>;

export const damageUpdateSchema = z.object({
  damageType: z.string().min(1, "Damage type is required").max(100),
  description: z.string().min(1, "Description is required").max(2000),
  estimatedCost: z.coerce.number().min(0),
  customerCharge: z.coerce.number().min(0),
  damageDate: z.string().min(1, "Damage date is required"),
  status: z.enum(["REPORTED", "ASSESSED", "CHARGED", "RESOLVED"]),
  paymentStatus: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID"]).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type DamageUpdateValues = z.infer<typeof damageUpdateSchema>;

export const damagePaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]),
  paymentDate: z.string().min(1),
  referenceNumber: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type DamagePaymentFormValues = z.infer<typeof damagePaymentSchema>;

export const damageSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "REPORTED", "ASSESSED", "CHARGED", "RESOLVED"]).optional(),
  paymentStatus: z.enum(["ALL", "UNPAID", "PARTIALLY_PAID", "PAID"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["damageDate", "createdAt", "damageCode", "status"]).default("damageDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type DamageSearchParams = z.infer<typeof damageSearchSchema>;
