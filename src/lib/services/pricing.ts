import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import type { RatePlanType } from "@prisma/client";
import { calculateIncludedKmAllowance } from "@/lib/services/included-km";

export interface PricingInput {
  dailyRate: number;
  rentalDays: number;
  includedKmPerDay: number;
  includedKmExtraDay?: number;
  extraKmRate: number;
  ratePlanType?: RatePlanType;
  weeklyRate?: number;
  monthlyRate?: number;
  deliveryCharge?: number;
  driverCharge?: number;
  otherCharges?: number;
  discount?: number;
  startingOdometer?: number;
  endingOdometer?: number;
}

export interface PricingResult {
  rentalDays: number;
  baseAmount: number;
  includedKm: number;
  totalKm: number;
  extraKm: number;
  extraKmCharge: number;
  deliveryCharge: number;
  driverCharge: number;
  otherCharges: number;
  discount: number;
  subtotal: number;
  finalTotal: number;
}

export function calculateRentalDays(
  pickupDate: Date | string,
  returnDate: Date | string,
  pickupTime?: string,
  returnTime?: string,
  dayBoundaryTime?: string
): number {
  const p = new Date(pickupDate);
  const r = new Date(returnDate);

  if (isNaN(p.getTime()) || isNaN(r.getTime())) return 1;

  // Option A (Date-based calculation):
  // Same day (pickup == return) = 1 day
  // Next day (ada aran heta) = 1 day
  // 2 days after (ada aran anidda) = 2 days
  const utcPickup = Date.UTC(p.getFullYear(), p.getMonth(), p.getDate());
  const utcReturn = Date.UTC(r.getFullYear(), r.getMonth(), r.getDate());

  const diffDays = Math.round((utcReturn - utcPickup) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 1;
  return diffDays;
}

export interface RentalDurationInfo {
  rentalDays: number;
  totalHours: number;
  expectedHours: number;
  extraHours: number;
  isOverdue24h: boolean;
}

export function getRentalDurationInfo(
  pickupDate: Date | string,
  returnDate: Date | string,
  pickupTime: string,
  returnTime: string
): RentalDurationInfo {
  const pDate = new Date(pickupDate);
  const rDate = new Date(returnDate);

  const days = calculateRentalDays(pDate, rDate, pickupTime, returnTime);
  const pickup = combineDateAndTime(pDate, pickupTime || "00:00");
  const returnDt = combineDateAndTime(rDate, returnTime || "00:00");

  const diffMs = returnDt.getTime() - pickup.getTime();
  const totalHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
  const expectedHours = days * 24;
  const extraHours = Math.max(0, Math.round((totalHours - expectedHours) * 10) / 10);
  const isOverdue24h = totalHours > 24 && extraHours > 0;

  return {
    rentalDays: days,
    totalHours,
    expectedHours,
    extraHours,
    isOverdue24h,
  };
}

export function combineDateAndTime(date: Date | string, time: string): Date {
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date();
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  d.setHours(hours || 0, minutes || 0, 0, 0);
  return d;
}

export function calculateBaseAmount(
  ratePlanType: RatePlanType,
  rentalDays: number,
  dailyRate: number,
  weeklyRate?: number,
  monthlyRate?: number
): number {
  switch (ratePlanType) {
    case "WEEKLY": {
      const weeks = Math.max(1, Math.ceil(rentalDays / 7));
      return weeks * (weeklyRate ?? dailyRate * 6);
    }
    case "MONTHLY": {
      const months = Math.max(1, Math.ceil(rentalDays / 30));
      return months * (monthlyRate ?? dailyRate * 25);
    }
    case "DAILY":
    case "CUSTOM":
    default:
      return dailyRate * rentalDays;
  }
}

export function calculatePricing(input: PricingInput): PricingResult {
  const {
    dailyRate,
    rentalDays,
    includedKmPerDay,
    includedKmExtraDay = includedKmPerDay,
    extraKmRate,
    ratePlanType = "DAILY",
    weeklyRate,
    monthlyRate,
    deliveryCharge = 0,
    driverCharge = 0,
    otherCharges = 0,
    discount = 0,
    startingOdometer,
    endingOdometer,
  } = input;

  const baseAmount = calculateBaseAmount(ratePlanType, rentalDays, dailyRate, weeklyRate, monthlyRate);
  const includedKm = calculateIncludedKmAllowance(
    rentalDays,
    includedKmPerDay,
    includedKmExtraDay
  );

  let totalKm = 0;
  let extraKm = 0;
  let extraKmCharge = 0;

  if (startingOdometer !== undefined && endingOdometer !== undefined) {
    totalKm = Math.max(0, endingOdometer - startingOdometer);
    extraKm = Math.max(0, totalKm - includedKm);
    extraKmCharge = extraKm * extraKmRate;
  }

  const subtotal =
    baseAmount + extraKmCharge + deliveryCharge + driverCharge + otherCharges;
  const finalTotal = Math.max(0, subtotal - discount);

  return {
    rentalDays,
    baseAmount,
    includedKm,
    totalKm,
    extraKm,
    extraKmCharge,
    deliveryCharge,
    driverCharge,
    otherCharges,
    discount,
    subtotal,
    finalTotal,
  };
}

export async function getSystemSetting(key: string, defaultValue: string): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? defaultValue;
}

export async function getDefaultIncludedKm(): Promise<number> {
  const policy = await getDefaultIncludedKmPolicy();
  return policy.firstDayKm;
}

export async function getDefaultIncludedKmPolicy(): Promise<{
  firstDayKm: number;
  extraDayKm: number;
}> {
  const [first, extra] = await Promise.all([
    getSystemSetting("default_included_km", "150"),
    getSystemSetting("default_included_km_extra_day", "100"),
  ]);
  return {
    firstDayKm: parseInt(first, 10) || 150,
    extraDayKm: parseInt(extra, 10) || 100,
  };
}

export async function getRentalDayStartTime(): Promise<string> {
  return getSystemSetting("rental_day_start_time", "19:00");
}

export function calculateBalance(finalTotal: number, totalPaid: number): number {
  return Math.max(0, finalTotal - totalPaid);
}

export function decimalToNumberSafe(value: { toString(): string } | number | null | undefined): number {
  return decimalToNumber(value);
}
