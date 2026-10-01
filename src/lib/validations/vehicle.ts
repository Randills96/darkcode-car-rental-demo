import { z } from "zod";

export const vehicleFormSchema = z
  .object({
  registrationNumber: z
    .string()
    .min(3, "Registration number is required")
    .max(20)
    .transform((v) => v.trim().toUpperCase()),
  vehicleType: z.enum(["CAR", "SUV", "VAN", "OTHER"]),
  make: z.string().min(1, "Make is required").max(50),
  model: z.string().min(1, "Model is required").max(50),
  year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
  colour: z.string().min(1, "Colour is required").max(30),
  fuelType: z.enum(["PETROL", "DIESEL", "HYBRID", "ELECTRIC"]),
  transmission: z.enum(["MANUAL", "AUTOMATIC"]),
  seatingCapacity: z.coerce.number().int().min(1).max(50),
  currentOdometer: z.coerce.number().int().min(0),
  dailyRate: z.coerce.number().min(0, "Daily rate must be positive"),
  includedKm: z.coerce.number().int().min(0),
  includedKmExtraDay: z.coerce.number().int().min(0),
  extraKmRate: z.coerce.number().min(0, "Extra KM rate must be positive"),
  ownerDailyRate: z.coerce.number().min(0).optional().nullable().or(z.literal("")),
  ownerExtraKmRate: z.coerce.number().min(0).optional().nullable().or(z.literal("")),
  weeklyRate: z.coerce.number().min(0).optional().or(z.literal("")),
  monthlyRate: z.coerce.number().min(0).optional().or(z.literal("")),
  ownershipType: z.enum(["COMPANY_OWNED", "PERSONALLY_OWNED", "THIRD_PARTY_OWNED"]),
  ownerId: z.string().optional().or(z.literal("")),
  status: z.enum(["AVAILABLE", "RESERVED", "RENTED", "MAINTENANCE", "UNAVAILABLE", "INACTIVE"]),
  notes: z.string().max(2000).optional().or(z.literal("")),
  insurancePolicyNumber: z.string().max(100).optional().or(z.literal("")),
  insuranceExpiryDate: z.string().optional().or(z.literal("")),
  revenueLicenceNumber: z.string().max(100).optional().or(z.literal("")),
  revenueLicenceExpiryDate: z.string().optional().or(z.literal("")),
})
  .superRefine((data, ctx) => {
    const paysOwner = Boolean(data.ownerId) || data.ownershipType !== "COMPANY_OWNED";
    if (!paysOwner) return;

    if (!data.ownerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select the vehicle owner",
        path: ["ownerId"],
      });
    }

    const ownerDaily = data.ownerDailyRate === "" || data.ownerDailyRate == null ? null : Number(data.ownerDailyRate);
    const ownerExtra =
      data.ownerExtraKmRate === "" || data.ownerExtraKmRate == null ? null : Number(data.ownerExtraKmRate);

    if (ownerDaily == null || Number.isNaN(ownerDaily)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the daily amount paid to the owner",
        path: ["ownerDailyRate"],
      });
    } else if (ownerDaily > data.dailyRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Owner daily rate cannot exceed the customer daily rate",
        path: ["ownerDailyRate"],
      });
    }

    if (ownerExtra == null || Number.isNaN(ownerExtra)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the extra KM amount paid to the owner",
        path: ["ownerExtraKmRate"],
      });
    } else if (ownerExtra > data.extraKmRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Owner extra KM rate cannot exceed the customer extra KM rate",
        path: ["ownerExtraKmRate"],
      });
    }
  });

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

export const vehicleDocumentSchema = z.object({
  documentType: z.enum([
    "INSURANCE",
    "REVENUE_LICENCE",
    "EMISSION_CERTIFICATE",
    "REGISTRATION",
    "OTHER",
  ]),
  documentNumber: z.string().max(50).optional().or(z.literal("")),
  issueDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  filePath: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type VehicleDocumentFormValues = z.infer<typeof vehicleDocumentSchema>;

export const unavailablePeriodSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().max(500).optional().or(z.literal("")),
  })
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    { message: "End date must be on or after start date", path: ["endDate"] }
  );

export type UnavailablePeriodFormValues = z.infer<typeof unavailablePeriodSchema>;

export const vehicleSearchSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["ALL", "AVAILABLE", "RESERVED", "RENTED", "MAINTENANCE", "UNAVAILABLE", "INACTIVE"])
    .optional(),
  ownershipType: z
    .enum(["ALL", "COMPANY_OWNED", "PERSONALLY_OWNED", "THIRD_PARTY_OWNED"])
    .optional(),
  vehicleType: z.enum(["ALL", "CAR", "SUV", "VAN", "OTHER"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["registrationNumber", "make", "createdAt", "dailyRate"]).default("registrationNumber"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type VehicleSearchParams = z.infer<typeof vehicleSearchSchema>;

export const availabilitySearchSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  vehicleType: z.enum(["ALL", "CAR", "SUV", "VAN", "OTHER"]).optional(),
});

export type AvailabilitySearchParams = z.infer<typeof availabilitySearchSchema>;

export const documentExpirySearchSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  documentType: z
    .enum(["ALL", "INSURANCE", "REVENUE_LICENCE", "EMISSION_CERTIFICATE", "REGISTRATION", "OTHER"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type DocumentExpirySearchParams = z.infer<typeof documentExpirySearchSchema>;
