import { z } from "zod";

export const rentalFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().optional().or(z.literal("")),
  rentalType: z.enum(["SELF_DRIVE", "WITH_DRIVER"]),
  ratePlanType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]),
  pickupDate: z.string().min(1, "Pickup date is required"),
  pickupTime: z.string().min(1, "Pickup time is required").regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pickup time is required (HH:MM)"),
  returnDate: z.string().min(1, "Return date is required"),
  returnTime: z.string().min(1, "Return time is required").regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Return time is required (HH:MM)"),
  pickupLocation: z.string().max(200).optional().or(z.literal("")),
  returnLocation: z.string().max(200).optional().or(z.literal("")),
  dailyRate: z.coerce.number().min(0),
  includedKm: z.coerce.number().int().min(0),
  includedKmExtraDay: z.coerce.number().int().min(0),
  extraKmRate: z.coerce.number().min(0),
  deliveryCharge: z.coerce.number().min(0).optional(),
  driverCharge: z.coerce.number().min(0).optional(),
  otherCharges: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  securityDeposit: z.coerce.number().min(0).optional(),
  advancePayment: z.coerce.number().min(0).optional(),
  driverId: z.string().optional().or(z.literal("")),
  brokerId: z.string().optional().or(z.literal("")),
  brokerCommissionPerDay: z.coerce.number().min(0).optional(),
  brokerCommissionPerExtraKm: z.coerce.number().min(0).optional(),
  ownerDailyRate: z.union([z.number().min(0), z.null()]).optional(),
  ownerExtraKmRate: z.union([z.number().min(0), z.null()]).optional(),
  startingOdometer: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["INQUIRY", "QUOTED", "CONFIRMED"]).optional(),
}).refine(
  (data) => new Date(data.returnDate) >= new Date(data.pickupDate),
  { message: "Return date must be on or after pickup date", path: ["returnDate"] }
).refine(
  (data) => data.rentalType !== "WITH_DRIVER" || !!data.driverId,
  { message: "Driver is required for with-driver rentals", path: ["driverId"] }
).refine(
  (data) => data.status !== "CONFIRMED" || Boolean(data.vehicleId),
  { message: "Select a vehicle to confirm the hire", path: ["vehicleId"] }
).refine(
  (data) => data.status !== "CONFIRMED" || data.startingOdometer != null,
  { message: "Starting odometer is required for a confirmed hire", path: ["startingOdometer"] }
);

export type RentalFormValues = z.infer<typeof rentalFormSchema>;

export const assignVehicleSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
});

export const handoverSchema = z.object({
  handoverDate: z.string().min(1, "Handover date is required"),
  handoverTime: z.string().min(1, "Handover time is required").regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Handover time is required (HH:MM)"),
  startingFuelLevel: z.enum(["EMPTY", "QUARTER", "HALF", "THREE_QUARTER", "FULL"]),
  vehicleCondition: z.string().max(1000).optional().or(z.literal("")),
  existingDamage: z.string().max(1000).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  customerAcknowledged: z.boolean().optional(),
});

export type HandoverFormValues = z.infer<typeof handoverSchema>;

export const returnSchema = z.object({
  returnDate: z.string().min(1, "Return date is required"),
  returnTime: z.string().min(1, "Return time is required").regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Return time is required (HH:MM)"),
  endingOdometer: z.coerce.number().int().min(0),
  endingFuelLevel: z.enum(["EMPTY", "QUARTER", "HALF", "THREE_QUARTER", "FULL"]),
  vehicleCondition: z.string().max(1000).optional().or(z.literal("")),
  newDamage: z.string().max(1000).optional().or(z.literal("")),
  cleaningStatus: z.enum(["CLEAN", "NEEDS_CLEANING", "DEEP_CLEAN_REQUIRED"]),
  isLateReturn: z.boolean().optional(),
  lateReturnCharge: z.coerce.number().min(0).optional(),
  additionalCharges: z.coerce.number().min(0).optional(),
  inspectionNotes: z.string().max(1000).optional().or(z.literal("")),
});

export type ReturnFormValues = z.infer<typeof returnSchema>;

export const endingOdometerRecordSchema = z.object({
  rentalId: z.string().min(1, "Select a booking"),
  endingOdometer: z.coerce.number().int().min(0),
  returnDate: z.string().min(1, "Return date is required"),
  returnTime: z.string().min(1, "Return time is required").regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Return time is required (HH:MM)"),
});

export type EndingOdometerRecordValues = z.infer<typeof endingOdometerRecordSchema>;

/** Same fields as initial ending odometer entry — used when correcting a mistaken reading. */
export const updateEndingOdometerSchema = endingOdometerRecordSchema;

export type UpdateEndingOdometerValues = z.infer<typeof updateEndingOdometerSchema>;

export const rentalSearchSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["ALL", "INQUIRY", "QUOTED", "CONFIRMED", "ACTIVE", "RETURNED", "COMPLETED", "CANCELLED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["pickupDate", "createdAt", "bookingNumber", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type RentalSearchParams = z.infer<typeof rentalSearchSchema>;

export const pricingPreviewSchema = z.object({
  pickupDate: z.string(),
  pickupTime: z.string(),
  returnDate: z.string(),
  returnTime: z.string(),
  ratePlanType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]),
  dailyRate: z.coerce.number().min(0),
  weeklyRate: z.coerce.number().min(0).optional(),
  monthlyRate: z.coerce.number().min(0).optional(),
  includedKm: z.coerce.number().int().min(0),
  includedKmExtraDay: z.coerce.number().int().min(0).optional(),
  extraKmRate: z.coerce.number().min(0),
  deliveryCharge: z.coerce.number().min(0).optional(),
  driverCharge: z.coerce.number().min(0).optional(),
  otherCharges: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
});

export type PricingPreviewInput = z.infer<typeof pricingPreviewSchema>;
