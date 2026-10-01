import { z } from "zod";
import { normalizePhone, normalizeNic, phoneRegex } from "@/lib/utils";

export const ownerFormSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  nic: z.string().max(20).optional().or(z.literal("")),
  phone: z
    .string()
    .min(1, "Phone is required")
    .refine((val) => phoneRegex.test(normalizePhone(val)), "Invalid phone number (e.g. 0771234567)"),
  whatsapp: z
    .string()
    .refine((val) => !val || phoneRegex.test(normalizePhone(val)), "Invalid WhatsApp number")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  bankName: z.string().max(100).optional().or(z.literal("")),
  bankAccount: z.string().max(30).optional().or(z.literal("")),
  bankBranch: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type OwnerFormValues = z.infer<typeof ownerFormSchema>;

export const ownerSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "createdAt", "phone"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type OwnerSearchParams = z.infer<typeof ownerSearchSchema>;
