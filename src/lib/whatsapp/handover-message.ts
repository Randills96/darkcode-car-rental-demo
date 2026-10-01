import { decimalToNumber, formatCurrency, formatDate } from "@/lib/utils";
import { toWhatsAppUrl } from "@/lib/ai/reminder-draft";
import { calculateIncludedKmAllowance, describeIncludedKmPolicy } from "@/lib/services/included-km";
import type { FuelLevel } from "@prisma/client";

export type HandoverWhatsAppInput = {
  companyName: string;
  currencySymbol?: string;
  customerName: string;
  customerPhone: string | null;
  customerWhatsapp: string | null;
  bookingNumber: string;
  vehicleLabel: string;
  rentalType: "SELF_DRIVE" | "WITH_DRIVER";
  pickupDate: Date | string;
  pickupTime: string;
  returnDate: Date | string;
  returnTime: string;
  pickupLocation?: string | null;
  rentalDays: number;
  dailyRate: number;
  estimatedTotal: number;
  includedKmPerDay: number;
  includedKmExtraDay?: number;
  extraKmRate: number;
  securityDeposit: number;
  advancePayment: number;
  startingOdometer: number;
  startingFuelLevel?: FuelLevel | string | null;
};

export type HandoverWhatsAppPayload = {
  phone: string;
  message: string;
  url: string | null;
};

const FUEL_LABELS: Record<string, string> = {
  EMPTY: "Empty",
  QUARTER: "1/4",
  HALF: "1/2",
  THREE_QUARTER: "3/4",
  FULL: "Full",
};

function money(amount: number, symbol?: string) {
  return formatCurrency(amount, symbol);
}

function typeLabel(rentalType: HandoverWhatsAppInput["rentalType"]) {
  return rentalType === "WITH_DRIVER" ? "With driver" : "Self drive";
}

export function customerWhatsAppPhone(input: Pick<HandoverWhatsAppInput, "customerPhone" | "customerWhatsapp">) {
  return (input.customerWhatsapp || input.customerPhone || "").trim();
}

export function buildHandoverWhatsAppMessage(input: HandoverWhatsAppInput) {
  const symbol = input.currencySymbol;
  const extraDayKm = input.includedKmExtraDay ?? input.includedKmPerDay;
  const freeKm = calculateIncludedKmAllowance(input.rentalDays, input.includedKmPerDay, extraDayKm);
  const fuel = input.startingFuelLevel ? FUEL_LABELS[input.startingFuelLevel] || input.startingFuelLevel : "";
  const lines = [
    `Hello ${input.customerName},`,
    "",
    `Your vehicle has been handed over. Here are your rental details from *${input.companyName}*.`,
    "",
    `*Booking:* ${input.bookingNumber}`,
    `*Vehicle:* ${input.vehicleLabel}`,
    `*Type:* ${typeLabel(input.rentalType)}`,
    "",
    `*Pickup:* ${formatDate(input.pickupDate)} at ${input.pickupTime}`,
    `*Return:* ${formatDate(input.returnDate)} at ${input.returnTime}`,
  ];

  if (input.pickupLocation?.trim()) {
    lines.push(`*Pickup location:* ${input.pickupLocation.trim()}`);
  }

  lines.push(
    "",
    `*Start odometer:* ${input.startingOdometer.toLocaleString("en-LK")} km`
  );
  if (fuel) lines.push(`*Fuel at pickup:* ${fuel}`);

  lines.push(
    "",
    `*Rental:* ${money(input.dailyRate, symbol)} / day × ${input.rentalDays} day${input.rentalDays === 1 ? "" : "s"}`,
    `*Package total:* ${money(input.estimatedTotal, symbol)}`,
    `*Free kilometres:* ${freeKm.toLocaleString("en-LK")} km (${describeIncludedKmPolicy(
      input.rentalDays,
      input.includedKmPerDay,
      extraDayKm
    )})`,
    `*Extra km:* ${money(input.extraKmRate, symbol)} per km after the free allowance`
  );

  if (input.securityDeposit > 0) {
    lines.push(`*Security deposit:* ${money(input.securityDeposit, symbol)}`);
  }
  if (input.advancePayment > 0) {
    lines.push(`*Advance paid:* ${money(input.advancePayment, symbol)}`);
  }

  lines.push(
    "",
    "Please keep this message for your records. Drive safely.",
    "",
    "Thank you,",
    input.companyName
  );

  return lines.join("\n");
}

export function buildHandoverWhatsAppPayload(input: HandoverWhatsAppInput): HandoverWhatsAppPayload {
  const message = buildHandoverWhatsAppMessage(input);
  const phone = customerWhatsAppPhone(input);
  return {
    phone,
    message,
    url: phone ? toWhatsAppUrl(phone, message) : null,
  };
}

export function rentalToHandoverWhatsAppInput(
  rental: {
    bookingNumber: string;
    rentalType: "SELF_DRIVE" | "WITH_DRIVER";
    pickupDate: Date;
    pickupTime: string;
    returnDate: Date;
    returnTime: string;
    pickupLocation: string | null;
    rentalDays: number;
    dailyRate: { toString(): string } | number;
    estimatedTotal: { toString(): string } | number;
    includedKm: number;
    includedKmExtraDay?: number;
    extraKmRate: { toString(): string } | number;
    securityDeposit: { toString(): string } | number;
    advancePayment: { toString(): string } | number;
    customer: { fullName: string; phone: string; whatsapp: string | null };
    vehicle: { registrationNumber: string; make: string; model: string } | null;
  },
  extras: {
    companyName: string;
    currencySymbol?: string;
    pickupDate: Date | string;
    pickupTime: string;
    startingOdometer: number;
    startingFuelLevel?: FuelLevel | string | null;
  }
): HandoverWhatsAppInput {
  const vehicle = rental.vehicle;
  const vehicleLabel = vehicle
    ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
    : "Assigned vehicle";

  return {
    companyName: extras.companyName,
    currencySymbol: extras.currencySymbol,
    customerName: rental.customer.fullName,
    customerPhone: rental.customer.phone,
    customerWhatsapp: rental.customer.whatsapp,
    bookingNumber: rental.bookingNumber,
    vehicleLabel,
    rentalType: rental.rentalType,
    pickupDate: extras.pickupDate,
    pickupTime: extras.pickupTime,
    returnDate: rental.returnDate,
    returnTime: rental.returnTime,
    pickupLocation: rental.pickupLocation,
    rentalDays: rental.rentalDays,
    dailyRate: decimalToNumber(rental.dailyRate),
    estimatedTotal: decimalToNumber(rental.estimatedTotal),
    includedKmPerDay: rental.includedKm,
    includedKmExtraDay: rental.includedKmExtraDay ?? rental.includedKm,
    extraKmRate: decimalToNumber(rental.extraKmRate),
    securityDeposit: decimalToNumber(rental.securityDeposit),
    advancePayment: decimalToNumber(rental.advancePayment),
    startingOdometer: extras.startingOdometer,
    startingFuelLevel: extras.startingFuelLevel,
  };
}
