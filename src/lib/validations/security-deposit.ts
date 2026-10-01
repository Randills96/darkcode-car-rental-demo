import { z } from "zod";

export const collectDepositSchema = z.object({
  rentalId: z.string().min(1),
  depositAmount: z.coerce.number().positive("Deposit amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]),
  receivedDate: z.string().min(1),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type CollectDepositFormValues = z.infer<typeof collectDepositSchema>;

export const settleDepositSchema = z.object({
  depositId: z.string().min(1),
  refundAmount: z.coerce.number().min(0),
  amountRetained: z.coerce.number().min(0),
  retainReason: z.string().max(1000).optional().or(z.literal("")),
  refundMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]).optional(),
  refundDate: z.string().min(1),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type SettleDepositFormValues = z.infer<typeof settleDepositSchema>;
