import type { VehicleFormValues } from "@/lib/validations/vehicle";
import { decimalToNumber, toDateInputValue } from "@/lib/utils";

export function vehicleToFormValues(vehicle: {
  registrationNumber: string;
  vehicleType: VehicleFormValues["vehicleType"];
  make: string;
  model: string;
  year: number;
  colour: string;
  fuelType: VehicleFormValues["fuelType"];
  transmission: VehicleFormValues["transmission"];
  seatingCapacity: number;
  currentOdometer: number;
  dailyRate: { toString(): string };
  includedKm: number;
  includedKmExtraDay?: number;
  extraKmRate: { toString(): string };
  ownerDailyRate: { toString(): string } | null;
  ownerExtraKmRate: { toString(): string } | null;
  weeklyRate: { toString(): string } | null;
  monthlyRate: { toString(): string } | null;
  ownershipType: VehicleFormValues["ownershipType"];
  ownerId: string | null;
  status: VehicleFormValues["status"];
  notes: string | null;
  documents?: Array<{
    documentType: string;
    documentNumber: string | null;
    expiryDate: Date | string | null;
  }> | null;
}): VehicleFormValues {
  const insDoc = vehicle.documents?.find((d) => d.documentType === "INSURANCE");
  const revDoc = vehicle.documents?.find((d) => d.documentType === "REVENUE_LICENCE");

  return {
    registrationNumber: vehicle.registrationNumber,
    vehicleType: vehicle.vehicleType,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    colour: vehicle.colour,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    seatingCapacity: vehicle.seatingCapacity,
    currentOdometer: vehicle.currentOdometer,
    dailyRate: decimalToNumber(vehicle.dailyRate),
    includedKm: vehicle.includedKm,
    includedKmExtraDay: vehicle.includedKmExtraDay ?? vehicle.includedKm,
    extraKmRate: decimalToNumber(vehicle.extraKmRate),
    ownerDailyRate: vehicle.ownerDailyRate ? decimalToNumber(vehicle.ownerDailyRate) : "",
    ownerExtraKmRate: vehicle.ownerExtraKmRate ? decimalToNumber(vehicle.ownerExtraKmRate) : "",
    weeklyRate: vehicle.weeklyRate ? decimalToNumber(vehicle.weeklyRate) : "",
    monthlyRate: vehicle.monthlyRate ? decimalToNumber(vehicle.monthlyRate) : "",
    ownershipType: vehicle.ownershipType,
    ownerId: vehicle.ownerId ?? "",
    status: vehicle.status,
    notes: vehicle.notes ?? "",
    insurancePolicyNumber: insDoc?.documentNumber ?? "",
    insuranceExpiryDate: toDateInputValue(insDoc?.expiryDate),
    revenueLicenceNumber: revDoc?.documentNumber ?? "",
    revenueLicenceExpiryDate: toDateInputValue(revDoc?.expiryDate),
  };
}
