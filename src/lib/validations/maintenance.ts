import { z } from "zod";

export const maintenanceFormSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  maintenanceType: z.enum([
    "OIL_CHANGE",
    "FULL_SERVICE",
    "BRAKE_SERVICE",
    "TYRES",
    "BATTERY",
    "AC_REPAIR",
    "ENGINE_REPAIR",
    "BODY_REPAIR",
    "ACCIDENT_REPAIR",
    "OTHER",
  ]),
  date: z.string().min(1, "Service date is required"),
  odometer: z.coerce.number().int().min(0).optional().or(z.literal("")),
  description: z.string().min(1, "Description is required").max(2000),
  serviceProvider: z.string().max(200).optional().or(z.literal("")),
  cost: z.coerce.number().min(0),
  nextServiceDate: z.string().optional().or(z.literal("")),
  nextServiceKm: z.coerce.number().int().min(0).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

export const maintenanceSearchSchema = z.object({
  search: z.string().optional(),
  maintenanceType: z
    .enum([
      "ALL",
      "OIL_CHANGE",
      "FULL_SERVICE",
      "BRAKE_SERVICE",
      "TYRES",
      "BATTERY",
      "AC_REPAIR",
      "ENGINE_REPAIR",
      "BODY_REPAIR",
      "ACCIDENT_REPAIR",
      "OTHER",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["date", "createdAt", "cost", "maintenanceCode"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type MaintenanceSearchParams = z.infer<typeof maintenanceSearchSchema>;
