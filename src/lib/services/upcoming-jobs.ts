import { prisma } from "@/lib/db";
import { addDays, endOfDay, startOfDay } from "date-fns";
import type { RentalStatus } from "@prisma/client";

const rentalInclude = {
  customer: { select: { fullName: true, phone: true } },
  vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
} as const;

export type UpcomingJobType =
  | "PICKUP_REMINDER"
  | "PICKUP_TODAY"
  | "RETURN_REMINDER"
  | "RETURN_TODAY";

export interface UpcomingJob {
  id: string;
  type: UpcomingJobType;
  rentalId: string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  vehicleLabel: string;
  vehicleId: string | null;
  scheduledDate: Date;
  scheduledTime: string;
  location: string | null;
  status: RentalStatus;
  sortOrder: number;
}

const jobMeta: Record<
  UpcomingJobType,
  { label: string; description: string; sortOrder: number }
> = {
  PICKUP_TODAY: {
    label: "Pickup today",
    description: "Vehicle handover scheduled for today",
    sortOrder: 1,
  },
  RETURN_TODAY: {
    label: "Return today",
    description: "Customer return due today",
    sortOrder: 2,
  },
  PICKUP_REMINDER: {
    label: "Pickup tomorrow",
    description: "Contact customer — booking starts tomorrow",
    sortOrder: 3,
  },
  RETURN_REMINDER: {
    label: "Return tomorrow",
    description: "Contact customer — return due tomorrow",
    sortOrder: 4,
  },
};

export function getUpcomingJobLabel(type: UpcomingJobType) {
  return jobMeta[type].label;
}

export function getUpcomingJobDescription(type: UpcomingJobType) {
  return jobMeta[type].description;
}

function vehicleLabel(rental: {
  vehicle: { registrationNumber: string; make: string; model: string } | null;
}) {
  if (!rental.vehicle) return "Vehicle not assigned";
  return `${rental.vehicle.registrationNumber} — ${rental.vehicle.make} ${rental.vehicle.model}`;
}

function mapPickupJobs(
  rentals: Awaited<ReturnType<typeof fetchPickupRentals>>,
  type: "PICKUP_REMINDER" | "PICKUP_TODAY"
): UpcomingJob[] {
  return rentals.map((rental) => ({
    id: `${type}-${rental.id}`,
    type,
    rentalId: rental.id,
    bookingNumber: rental.bookingNumber,
    customerName: rental.customer.fullName,
    customerPhone: rental.customer.phone,
    vehicleLabel: vehicleLabel(rental),
    vehicleId: rental.vehicle?.id ?? null,
    scheduledDate: rental.pickupDate,
    scheduledTime: rental.pickupTime,
    location: rental.pickupLocation,
    status: rental.status,
    sortOrder: jobMeta[type].sortOrder,
  }));
}

function mapReturnJobs(
  rentals: Awaited<ReturnType<typeof fetchReturnRentals>>,
  type: "RETURN_REMINDER" | "RETURN_TODAY"
): UpcomingJob[] {
  return rentals.map((rental) => ({
    id: `${type}-${rental.id}`,
    type,
    rentalId: rental.id,
    bookingNumber: rental.bookingNumber,
    customerName: rental.customer.fullName,
    customerPhone: rental.customer.phone,
    vehicleLabel: vehicleLabel(rental),
    vehicleId: rental.vehicle?.id ?? null,
    scheduledDate: rental.returnDate,
    scheduledTime: rental.returnTime,
    location: rental.returnLocation,
    status: rental.status,
    sortOrder: jobMeta[type].sortOrder,
  }));
}

async function fetchPickupRentals(from: Date, to: Date) {
  return prisma.rental.findMany({
    where: {
      pickupDate: { gte: from, lte: to },
      status: { in: ["QUOTED", "CONFIRMED"] },
    },
    include: rentalInclude,
    orderBy: [{ pickupDate: "asc" }, { pickupTime: "asc" }],
  });
}

async function fetchReturnRentals(from: Date, to: Date) {
  return prisma.rental.findMany({
    where: {
      returnDate: { gte: from, lte: to },
      status: "ACTIVE",
    },
    include: rentalInclude,
    orderBy: [{ returnDate: "asc" }, { returnTime: "asc" }],
  });
}

export async function getUpcomingJobs() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(addDays(now, 1));

  const [pickupTomorrow, pickupToday, returnTomorrow, returnToday] = await Promise.all([
    fetchPickupRentals(tomorrowStart, tomorrowEnd),
    fetchPickupRentals(todayStart, todayEnd),
    fetchReturnRentals(tomorrowStart, tomorrowEnd),
    fetchReturnRentals(todayStart, todayEnd),
  ]);

  const jobs = [
    ...mapPickupJobs(pickupToday, "PICKUP_TODAY"),
    ...mapReturnJobs(returnToday, "RETURN_TODAY"),
    ...mapPickupJobs(pickupTomorrow, "PICKUP_REMINDER"),
    ...mapReturnJobs(returnTomorrow, "RETURN_REMINDER"),
  ];

  return jobs.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const dateCompare = a.scheduledDate.getTime() - b.scheduledDate.getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
}

export function buildPickupReminderMessage(rental: {
  bookingNumber: string;
  customer: { fullName: string };
  vehicle: { registrationNumber: string } | null;
  pickupDate: Date;
  pickupTime: string;
  pickupLocation: string | null;
}) {
  const date = rental.pickupDate.toLocaleDateString("en-LK", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const vehicle = rental.vehicle?.registrationNumber ?? "Unassigned";
  const location = rental.pickupLocation ? ` at ${rental.pickupLocation}` : "";
  return `Call ${rental.customer.fullName} about ${rental.bookingNumber}. Pickup ${date} ${rental.pickupTime} — ${vehicle}${location}`;
}

export function buildReturnReminderMessage(rental: {
  bookingNumber: string;
  customer: { fullName: string };
  vehicle: { registrationNumber: string } | null;
  returnDate: Date;
  returnTime: string;
  returnLocation: string | null;
}) {
  const date = rental.returnDate.toLocaleDateString("en-LK", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const vehicle = rental.vehicle?.registrationNumber ?? "Unassigned";
  const location = rental.returnLocation ? ` at ${rental.returnLocation}` : "";
  return `Call ${rental.customer.fullName} about ${rental.bookingNumber}. Return ${date} ${rental.returnTime} — ${vehicle}${location}`;
}

export async function getBookingReminderRentals() {
  const now = new Date();
  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(addDays(now, 1));

  const [pickupTomorrow, returnTomorrow] = await Promise.all([
    fetchPickupRentals(tomorrowStart, tomorrowEnd),
    fetchReturnRentals(tomorrowStart, tomorrowEnd),
  ]);

  return { pickupTomorrow, returnTomorrow };
}
