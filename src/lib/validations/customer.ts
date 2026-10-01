import { z } from "zod";
import { normalizePhone, normalizeNic, phoneRegex, nicRegex } from "@/lib/utils";

export const customerFormSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(255, "Full name is too long"),
  nic: z
    .string()
    .min(1, "NIC or Passport number is required")
    .refine(
      (val) => nicRegex.test(normalizeNic(val)),
      "Invalid NIC or Passport format (e.g. 199012345678, 901234567V, or N1234567)"
    ),
  passportNumber: z.string().max(20).optional().or(z.literal("")),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine(
      (val) => phoneRegex.test(normalizePhone(val)),
      "Invalid phone number (e.g. 0771234567 or +94771234567)"
    ),
  whatsapp: z
    .string()
    .refine((val) => !val || phoneRegex.test(normalizePhone(val)), "Invalid WhatsApp number")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(1000, "Address is too long"),
  drivingLicenceNumber: z.string().max(30).optional().or(z.literal("")),
  drivingLicenceExpiry: z.string().optional().or(z.literal("")),
  emergencyContact: z
    .string()
    .refine(
      (val) => !val || phoneRegex.test(normalizePhone(val)),
      "Invalid emergency contact number"
    )
    .optional()
    .or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const customerDocumentSchema = z.object({
  documentType: z.enum([
    "CUSTOMER_PHOTO",
    "DRIVING_LICENCE",
    "NIC",
    "ADDRESS_VERIFICATION",
    "REGISTRATION",
    "OTHER",
  ]),
  documentNumber: z.string().max(50).optional().or(z.literal("")),
  issueDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type CustomerDocumentFormValues = z.infer<typeof customerDocumentSchema>;

export const blacklistSchema = z.object({
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type BlacklistFormValues = z.infer<typeof blacklistSchema>;

export const removeBlacklistSchema = z.object({
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type RemoveBlacklistFormValues = z.infer<typeof removeBlacklistSchema>;

export const customerSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "NORMAL", "BLACKLISTED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["fullName", "registrationDate", "createdAt", "nic"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CustomerSearchParams = z.infer<typeof customerSearchSchema>;
