import { z } from "zod";
import { normalizePhone, normalizeNic, phoneRegex, nicRegex } from "@/lib/utils";

export const driverFormSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  nic: z
    .string()
    .min(1, "NIC is required")
    .refine((val) => nicRegex.test(normalizeNic(val)), "Invalid NIC format"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .refine((val) => phoneRegex.test(normalizePhone(val)), "Invalid phone number"),
  whatsapp: z
    .string()
    .refine((val) => !val || phoneRegex.test(normalizePhone(val)), "Invalid WhatsApp number")
    .optional()
    .or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  drivingLicence: z.string().min(1, "Driving licence is required").max(30),
  licenceExpiry: z.string().min(1, "Licence expiry is required"),
  dailyPayment: z.coerce.number().min(0, "Daily payment must be positive"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;

export const driverPaymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]),
  paymentDate: z.string().min(1, "Payment date is required"),
  rentalId: z.string().optional().or(z.literal("")),
  referenceNumber: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type DriverPaymentFormValues = z.infer<typeof driverPaymentSchema>;

export const driverExpenseSchema = z.object({
  expenseType: z.enum(["PAYMENT", "FOOD", "ACCOMMODATION", "TRAVEL", "OTHER"]),
  amount: z.coerce.number().min(1, "Amount must be greater than zero"),
  expenseDate: z.string().min(1, "Expense date is required"),
  rentalId: z.string().optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type DriverExpenseFormValues = z.infer<typeof driverExpenseSchema>;

export const driverSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "createdAt", "licenceExpiry"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type DriverSearchParams = z.infer<typeof driverSearchSchema>;
