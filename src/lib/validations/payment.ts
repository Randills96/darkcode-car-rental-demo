import { z } from "zod";

export const paymentFormSchema = z.object({
  rentalId: z.string().min(1, "Rental is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]),
  paymentType: z.enum([
    "ADVANCE",
    "RENTAL_PAYMENT",
    "FINAL_PAYMENT",
    "DAMAGE_PAYMENT",
    "ADDITIONAL_CHARGE",
  ]),
  paymentDate: z.string().min(1, "Payment date is required"),
  referenceNumber: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  damageId: z.string().optional().or(z.literal("")),
}).refine(
  (data) => data.paymentType !== "DAMAGE_PAYMENT" || !!data.damageId,
  { message: "Select a damage record for damage payments", path: ["damageId"] }
);

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export const paymentSearchSchema = z.object({
  search: z.string().optional(),
  paymentType: z
    .enum([
      "ALL",
      "ADVANCE",
      "RENTAL_PAYMENT",
      "FINAL_PAYMENT",
      "DAMAGE_PAYMENT",
      "ADDITIONAL_CHARGE",
      "SECURITY_DEPOSIT",
      "SECURITY_DEPOSIT_REFUND",
    ])
    .optional(),
  paymentMethod: z.enum(["ALL", "CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["paymentDate", "createdAt", "amount", "paymentCode"]).default("paymentDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaymentSearchParams = z.infer<typeof paymentSearchSchema>;
