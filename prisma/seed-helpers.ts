import type { PrismaClient } from "@prisma/client";

export type SeedUserRef = { id: string };

export type SeedContext = {
  prisma: PrismaClient;
  now: Date;
  admin: SeedUserRef;
  manager: SeedUserRef;
  employee: SeedUserRef;
  driverUser: SeedUserRef;
};

export function daysFromNow(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function upsertPayment(
  prisma: PrismaClient,
  data: Parameters<PrismaClient["payment"]["upsert"]>[0]["create"]
) {
  return prisma.payment.upsert({
    where: { paymentCode: data.paymentCode },
    update: {
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentType: data.paymentType,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
    },
    create: data,
  });
}

export async function upsertRentalHandover(
  prisma: PrismaClient,
  data: Parameters<PrismaClient["rentalHandover"]["upsert"]>[0]["create"]
) {
  return prisma.rentalHandover.upsert({
    where: { rentalId: data.rentalId },
    update: {
      handoverDate: data.handoverDate,
      handoverTime: data.handoverTime,
      startingOdometer: data.startingOdometer,
      startingFuelLevel: data.startingFuelLevel,
      vehicleCondition: data.vehicleCondition,
      customerAcknowledged: data.customerAcknowledged,
    },
    create: data,
  });
}

export async function upsertRentalReturn(
  prisma: PrismaClient,
  data: Parameters<PrismaClient["rentalReturn"]["upsert"]>[0]["create"]
) {
  return prisma.rentalReturn.upsert({
    where: { rentalId: data.rentalId },
    update: {
      returnDate: data.returnDate,
      returnTime: data.returnTime,
      endingOdometer: data.endingOdometer,
      endingFuelLevel: data.endingFuelLevel,
      totalKm: data.totalKm,
      freeKm: data.freeKm,
      extraKm: data.extraKm,
      extraKmCharge: data.extraKmCharge,
      cleaningStatus: data.cleaningStatus,
      isLateReturn: data.isLateReturn,
      lateReturnCharge: data.lateReturnCharge,
      additionalCharges: data.additionalCharges,
    },
    create: data,
  });
}
