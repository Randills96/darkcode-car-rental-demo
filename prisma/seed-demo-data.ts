import type {
  Broker,
  Customer,
  Driver,
  PrismaClient,
  Rental,
  Vehicle,
  VehicleOwner,
} from "@prisma/client";
import {
  daysFromNow,
  type SeedContext,
  type SeedUserRef,
  upsertPayment,
  upsertRentalHandover,
  upsertRentalReturn,
} from "./seed-helpers";

type DemoEntities = {
  customers: Customer[];
  vehicles: Vehicle[];
  drivers: Driver[];
  brokers: Broker[];
  owners: VehicleOwner[];
};

export async function seedDemoScenarios(
  ctx: SeedContext,
  entities: DemoEntities
): Promise<void> {
  const { prisma, now, admin, manager, employee, driverUser } = ctx;
  const { customers, vehicles, drivers, brokers, owners } = entities;

  console.log("Seeding comprehensive demo / test scenarios...");

  // Extra entity statuses (users other than Super Admin are not seeded)
  await prisma.broker.upsert({
    where: { brokerCode: "BRK-00004" },
    update: { status: "INACTIVE" },
    create: {
      brokerCode: "BRK-00004",
      name: "Closed Agency (Inactive)",
      phone: "0114444444",
      status: "INACTIVE",
    },
  });

  await prisma.driver.upsert({
    where: { nic: "196012345687" },
    update: { status: "INACTIVE" },
    create: {
      driverCode: "DRV-00004",
      name: "Retired Driver",
      nic: "196012345687",
      phone: "0714444444",
      address: "Galle",
      drivingLicence: "DL-456687",
      licenceExpiry: daysFromNow(now, 365),
      dailyPayment: 4000,
      status: "INACTIVE",
    },
  });

  await prisma.vehicleOwner.upsert({
    where: { ownerCode: "OWN-00004" },
    update: { status: "INACTIVE", email: "inactive.owner@example.com" },
    create: {
      ownerCode: "OWN-00004",
      name: "Inactive Owner Co.",
      phone: "0115555555",
      email: "inactive.owner@example.com",
      status: "INACTIVE",
    },
  });

  await prisma.broker.updateMany({
    where: { brokerCode: { in: ["BRK-00001", "BRK-00002"] } },
    data: {
      email: "broker@example.com",
      defaultCommissionPerDay: 500,
      defaultCommissionPerExtraKm: 50,
    },
  });

  await prisma.vehicleOwner.updateMany({
    where: { ownerCode: { in: ["OWN-00002", "OWN-00003"] } },
    data: { email: "owner@example.com" },
  });

  // ── Vehicle statuses & test fixtures ───────────────────────────────────────
  await prisma.vehicle.update({ where: { id: vehicles[1].id }, data: { status: "AVAILABLE" } });
  await prisma.vehicle.update({ where: { id: vehicles[2].id }, data: { status: "MAINTENANCE" } });
  await prisma.vehicle.update({ where: { id: vehicles[4].id }, data: { status: "UNAVAILABLE" } });
  await prisma.vehicle.update({ where: { id: vehicles[5].id }, data: { status: "RESERVED" } });
  await prisma.vehicle.update({
    where: { id: vehicles[8].id },
    data: { status: "INACTIVE", ownerDailyRate: 5500, ownerExtraKmRate: 80 },
  });

  await prisma.vehicleUnavailablePeriod.upsert({
    where: { id: "seed-unavail-veh5" },
    update: {},
    create: {
      id: "seed-unavail-veh5",
      vehicleId: vehicles[4].id,
      startDate: daysFromNow(now, -2),
      endDate: daysFromNow(now, 5),
      reason: "Body shop repair — test unavailable period",
    },
  });

  await prisma.vehicleDocument.updateMany({
    where: { vehicleId: vehicles[2].id, documentType: "INSURANCE" },
    data: { expiryDate: daysFromNow(now, -10) },
  });

  for (const [planType, rate, includedKm] of [
    ["DAILY", 8000, 200],
    ["WEEKLY", 45000, 1200],
    ["MONTHLY", 160000, 5000],
  ] as const) {
    const existing = await prisma.ratePlan.findFirst({
      where: { vehicleId: vehicles[0].id, planType },
    });
    if (!existing) {
      await prisma.ratePlan.create({
        data: {
          vehicleId: vehicles[0].id,
          planType,
          rate,
          includedKm,
          extraKmRate: 100,
          isActive: true,
        },
      });
    }
  }

  // ── Customer documents & blacklist history ────────────────────────────────
  const blacklisted = customers.find((c) => c.status === "BLACKLISTED") ?? customers[5];
  await prisma.customerDocument.createMany({
    data: [
      {
        customerId: customers[0].id,
        documentType: "DRIVING_LICENCE",
        documentNumber: "DL-SEED-001",
        expiryDate: daysFromNow(now, 400),
      },
      {
        customerId: customers[0].id,
        documentType: "ADDRESS_VERIFICATION",
        documentNumber: "ADDR-001",
      },
      {
        customerId: customers[1].id,
        documentType: "OTHER",
        documentNumber: "P-N1234567",
        expiryDate: daysFromNow(now, 30),
        notes: "Passport copy",
      },
    ],
    skipDuplicates: true,
  });

  const blacklistCount = await prisma.customerBlacklist.count({
    where: { customerId: blacklisted.id },
  });
  if (blacklistCount === 0) {
    await prisma.customerBlacklist.create({
      data: {
        customerId: blacklisted.id,
        reason: "Previous rental damage not paid",
        action: "BLACKLIST",
        createdById: admin.id,
        notes: "Demo blacklist history record",
      },
    });
  }

  // ── Rentals covering every status & scenario ──────────────────────────────
  const rentalInquiry = await upsertRental(prisma, {
    bookingNumber: "RK-2026-00003",
    customerId: customers[2].id,
    rentalType: "SELF_DRIVE",
    ratePlanType: "DAILY",
    pickupDate: daysFromNow(now, 3),
    returnDate: daysFromNow(now, 5),
    rentalDays: 2,
    dailyRate: 8500,
    includedKm: 400,
    extraKmRate: 100,
    estimatedTotal: 17000,
    finalTotal: 17000,
    balance: 17000,
    status: "INQUIRY",
    createdById: employee.id,
  });

  const rentalQuoted = await upsertRental(prisma, {
    bookingNumber: "RK-2026-00004",
    customerId: customers[3].id,
    vehicleId: vehicles[6].id,
    rentalType: "SELF_DRIVE",
    ratePlanType: "DAILY",
    pickupDate: daysFromNow(now, 7),
    returnDate: daysFromNow(now, 10),
    rentalDays: 3,
    dailyRate: 9500,
    includedKm: 600,
    extraKmRate: 100,
    estimatedTotal: 28500,
    finalTotal: 28500,
    balance: 28500,
    status: "QUOTED",
    createdById: employee.id,
  });

  const rentalConfirmed = await upsertRental(prisma, {
    bookingNumber: "RK-2026-00005",
    customerId: customers[4].id,
    vehicleId: vehicles[5].id,
    rentalType: "SELF_DRIVE",
    ratePlanType: "DAILY",
    pickupDate: daysFromNow(now, 1),
    returnDate: daysFromNow(now, 3),
    rentalDays: 2,
    dailyRate: 6000,
    includedKm: 400,
    extraKmRate: 100,
    estimatedTotal: 12000,
    advancePayment: 5000,
    finalTotal: 12000,
    totalPaid: 5000,
    balance: 7000,
    status: "CONFIRMED",
    createdById: manager.id,
  });

  const rentalCancelled = await upsertRental(prisma, {
    bookingNumber: "RK-2026-00007",
    customerId: customers[1].id,
    vehicleId: vehicles[1].id,
    rentalType: "SELF_DRIVE",
    ratePlanType: "DAILY",
    pickupDate: daysFromNow(now, -10),
    returnDate: daysFromNow(now, -8),
    rentalDays: 2,
    dailyRate: 9000,
    includedKm: 400,
    extraKmRate: 100,
    estimatedTotal: 18000,
    finalTotal: 18000,
    balance: 0,
    status: "CANCELLED",
    notes: "Customer cancelled — demo cancelled rental",
    createdById: employee.id,
  });

  const rentalReturned = await upsertRental(prisma, {
    bookingNumber: "RK-2026-00006",
    customerId: customers[4].id,
    vehicleId: vehicles[6].id,
    rentalType: "SELF_DRIVE",
    ratePlanType: "DAILY",
    pickupDate: daysFromNow(now, -4),
    returnDate: daysFromNow(now, -1),
    rentalDays: 3,
    dailyRate: 9500,
    includedKm: 600,
    extraKmRate: 100,
    startingOdometer: 42000,
    endingOdometer: 42310,
    extraKm: 10,
    extraKmCharge: 1000,
    estimatedTotal: 28500,
    finalTotal: 29500,
    totalPaid: 20000,
    balance: 9500,
    status: "RETURNED",
    createdById: employee.id,
  });

  await upsertRentalHandover(prisma, {
    rentalId: rentalReturned.id,
    handoverDate: rentalReturned.pickupDate,
    handoverTime: "19:00",
    startingOdometer: 42000,
    startingFuelLevel: "FULL",
    customerAcknowledged: true,
  });

  await upsertRentalReturn(prisma, {
    rentalId: rentalReturned.id,
    returnDate: rentalReturned.returnDate,
    returnTime: "19:00",
    endingOdometer: 42310,
    endingFuelLevel: "THREE_QUARTER",
    totalKm: 310,
    freeKm: 600,
    extraKm: 0,
    extraKmCharge: 0,
    cleaningStatus: "NEEDS_CLEANING",
    isLateReturn: false,
    additionalCharges: 1000,
  });

  await upsertPayment(prisma, {
    paymentCode: "PAY-00004",
    rentalId: rentalReturned.id,
    customerId: customers[4].id,
    amount: 20000,
    paymentMethod: "CARD",
    paymentType: "RENTAL_PAYMENT",
    referenceNumber: "CARD-001",
    recordedById: employee.id,
  });

  const rentalExtraKm = await upsertRental(prisma, {
    bookingNumber: "RK-2026-00008",
    customerId: customers[2].id,
    vehicleId: vehicles[8].id,
    rentalType: "SELF_DRIVE",
    ratePlanType: "DAILY",
    pickupDate: daysFromNow(now, -3),
    returnDate: daysFromNow(now, -2),
    rentalDays: 1,
    dailyRate: 10000,
    includedKm: 200,
    extraKmRate: 100,
    startingOdometer: 30000,
    endingOdometer: 30250,
    extraKm: 50,
    extraKmCharge: 5000,
    estimatedTotal: 10000,
    finalTotal: 15000,
    totalPaid: 15000,
    balance: 0,
    status: "COMPLETED",
    createdById: manager.id,
  });

  await upsertRentalHandover(prisma, {
    rentalId: rentalExtraKm.id,
    handoverDate: rentalExtraKm.pickupDate,
    handoverTime: "19:00",
    startingOdometer: 30000,
    startingFuelLevel: "FULL",
    customerAcknowledged: true,
  });

  await upsertRentalReturn(prisma, {
    rentalId: rentalExtraKm.id,
    returnDate: rentalExtraKm.returnDate,
    returnTime: "19:00",
    endingOdometer: 30250,
    endingFuelLevel: "FULL",
    totalKm: 250,
    freeKm: 200,
    extraKm: 50,
    extraKmCharge: 5000,
    cleaningStatus: "CLEAN",
  });

  await upsertPayment(prisma, {
    paymentCode: "PAY-00005",
    rentalId: rentalExtraKm.id,
    customerId: customers[2].id,
    amount: 15000,
    paymentMethod: "ONLINE",
    paymentType: "FINAL_PAYMENT",
    referenceNumber: "ONL-001",
    recordedById: manager.id,
  });

  const rentalPendingSettlements = await upsertRental(prisma, {
    bookingNumber: "RK-2026-00009",
    customerId: customers[3].id,
    vehicleId: vehicles[4].id,
    brokerId: brokers[1].id,
    rentalType: "SELF_DRIVE",
    ratePlanType: "DAILY",
    pickupDate: daysFromNow(now, -1),
    returnDate: daysFromNow(now, 2),
    rentalDays: 3,
    dailyRate: 22000,
    includedKm: 600,
    extraKmRate: 150,
    ownerDailyRate: 18000,
    ownerExtraKmRate: 120,
    brokerCommissionPerDay: 600,
    brokerCommissionPerExtraKm: 60,
    estimatedTotal: 66000,
    finalTotal: 66000,
    totalPaid: 30000,
    balance: 36000,
    status: "ACTIVE",
    startingOdometer: 65000,
    createdById: manager.id,
  });

  await upsertRentalHandover(prisma, {
    rentalId: rentalPendingSettlements.id,
    handoverDate: rentalPendingSettlements.pickupDate,
    handoverTime: "19:00",
    startingOdometer: 65000,
    startingFuelLevel: "FULL",
    customerAcknowledged: true,
  });

  await upsertPayment(prisma, {
    paymentCode: "PAY-00006",
    rentalId: rentalPendingSettlements.id,
    customerId: customers[3].id,
    amount: 30000,
    paymentMethod: "BANK_TRANSFER",
    paymentType: "ADVANCE",
    recordedById: employee.id,
  });

  await prisma.ownerSettlement.upsert({
    where: { rentalId: rentalPendingSettlements.id },
    update: {},
    create: {
      rentalId: rentalPendingSettlements.id,
      ownerId: owners[2].id,
      rentalRevenue: 66000,
      companyCommission: 12000,
      ownerDailyRate: 18000,
      ownerExtraKmRate: 120,
      billableDays: 3,
      billableExtraKm: 0,
      ownerPayable: 54000,
      paidAmount: 20000,
      status: "PARTIALLY_PAID",
      paymentMethod: "BANK_TRANSFER",
      paidById: manager.id,
    },
  });

  await prisma.brokerCommission.upsert({
    where: { rentalId: rentalPendingSettlements.id },
    update: {},
    create: {
      rentalId: rentalPendingSettlements.id,
      brokerId: brokers[1].id,
      rentalValue: 66000,
      commissionPerDay: 600,
      commissionPerExtraKm: 60,
      billableDays: 3,
      billableExtraKm: 0,
      commissionAmount: 1800,
      paidAmount: 0,
      status: "PENDING",
    },
  });

  const rentalWeekly = await upsertRental(prisma, {
    bookingNumber: "RK-2026-00010",
    customerId: customers[0].id,
    vehicleId: vehicles[0].id,
    rentalType: "SELF_DRIVE",
    ratePlanType: "WEEKLY",
    pickupDate: daysFromNow(now, -14),
    returnDate: daysFromNow(now, -7),
    rentalDays: 7,
    dailyRate: 8000,
    includedKm: 1400,
    extraKmRate: 100,
    estimatedTotal: 45000,
    finalTotal: 45000,
    totalPaid: 45000,
    balance: 0,
    status: "COMPLETED",
    createdById: admin.id,
  });

  const rentalMonthly = await upsertRental(prisma, {
    bookingNumber: "RK-2026-00011",
    customerId: customers[1].id,
    vehicleId: vehicles[1].id,
    rentalType: "WITH_DRIVER",
    ratePlanType: "MONTHLY",
    driverId: drivers[1].id,
    pickupDate: daysFromNow(now, -35),
    returnDate: daysFromNow(now, -5),
    rentalDays: 30,
    dailyRate: 9000,
    driverCharge: 120000,
    includedKm: 6000,
    extraKmRate: 100,
    estimatedTotal: 390000,
    finalTotal: 390000,
    totalPaid: 390000,
    balance: 0,
    status: "COMPLETED",
    createdById: admin.id,
  });

  await seedSecurityDepositScenarios(prisma, customers, vehicles, admin, manager, employee, now);
  await seedDamageScenarios(prisma, customers, vehicles, rentalReturned, admin, employee, now);
  await seedDriverRecords(prisma, drivers, rentalMonthly, now);
  await seedExpenseCategories(prisma, vehicles, owners, brokers, rentalPendingSettlements, admin, manager, employee, now);
  await seedMaintenanceRecords(prisma, vehicles, admin, employee, now);
  await seedNotifications(prisma, admin, driverUser, vehicles, rentalInquiry, rentalReturned, now);
  await seedAuditLogs(prisma, admin, manager, rentalQuoted, rentalCancelled, customers[0]);

  void rentalInquiry;
  void rentalQuoted;
  void rentalConfirmed;
  void rentalCancelled;
  void rentalWeekly;
  void rentalMonthly;

  console.log("Demo scenarios seeded.");
}

async function upsertRental(
  prisma: PrismaClient,
  data: Parameters<PrismaClient["rental"]["upsert"]>[0]["create"]
): Promise<Rental> {
  return prisma.rental.upsert({
    where: { bookingNumber: data.bookingNumber },
    update: {
      status: data.status,
      finalTotal: data.finalTotal,
      totalPaid: data.totalPaid,
      balance: data.balance,
      extraKm: data.extraKm,
      extraKmCharge: data.extraKmCharge,
      startingOdometer: data.startingOdometer,
      endingOdometer: data.endingOdometer,
      notes: data.notes,
    },
    create: data,
  });
}

async function seedSecurityDepositScenarios(
  prisma: PrismaClient,
  customers: Customer[],
  vehicles: Vehicle[],
  admin: SeedUserRef,
  manager: SeedUserRef,
  employee: SeedUserRef,
  now: Date
) {
  const scenarios = [
    {
      booking: "RK-2026-00012",
      status: "REFUNDED" as const,
      deposit: 40000,
      refund: 40000,
      retained: 0,
    },
    {
      booking: "RK-2026-00013",
      status: "PARTIALLY_REFUNDED" as const,
      deposit: 50000,
      refund: 35000,
      retained: 15000,
      retainReason: "Minor interior cleaning charge",
    },
    {
      booking: "RK-2026-00014",
      status: "FORFEITED" as const,
      deposit: 60000,
      refund: 0,
      retained: 60000,
      retainReason: "Damage deposit forfeited — demo",
    },
  ];

  for (const [index, scenario] of scenarios.entries()) {
    const rental = await upsertRental(prisma, {
      bookingNumber: scenario.booking,
      customerId: customers[index].id,
      vehicleId: vehicles[index + 2].id,
      rentalType: "SELF_DRIVE",
      ratePlanType: "DAILY",
      pickupDate: daysFromNow(now, -20 - index),
      returnDate: daysFromNow(now, -18 - index),
      rentalDays: 2,
      dailyRate: 8000,
      includedKm: 400,
      extraKmRate: 100,
      securityDeposit: scenario.deposit,
      estimatedTotal: 16000,
      finalTotal: 16000,
      totalPaid: 16000,
      balance: 0,
      status: "COMPLETED",
      createdById: employee.id,
    });

    const existingDeposit = await prisma.securityDeposit.findFirst({
      where: { rentalId: rental.id },
    });

    if (!existingDeposit) {
      await prisma.securityDeposit.create({
        data: {
          rentalId: rental.id,
          depositAmount: scenario.deposit,
          paymentMethod: "CASH",
          status: scenario.status,
          refundAmount: scenario.refund,
          amountRetained: scenario.retained,
          retainReason: scenario.retainReason,
          refundDate: scenario.refund > 0 ? daysFromNow(now, -17 - index) : null,
          refundMethod: scenario.refund > 0 ? "BANK_TRANSFER" : null,
        },
      });
    } else {
      await prisma.securityDeposit.update({
        where: { id: existingDeposit.id },
        data: {
          status: scenario.status,
          refundAmount: scenario.refund,
          amountRetained: scenario.retained,
          retainReason: scenario.retainReason,
        },
      });
    }

    await upsertPayment(prisma, {
      paymentCode: `PAY-DEP-${index + 1}`,
      rentalId: rental.id,
      customerId: customers[index].id,
      amount: 16000,
      paymentMethod: "CASH",
      paymentType: "FINAL_PAYMENT",
      recordedById: index % 2 === 0 ? manager.id : admin.id,
    });
  }
}

async function seedDamageScenarios(
  prisma: PrismaClient,
  customers: Customer[],
  vehicles: Vehicle[],
  rentalReturned: Rental,
  admin: SeedUserRef,
  employee: SeedUserRef,
  now: Date
) {
  const damages = [
    {
      code: "DMG-00002",
      rentalId: rentalReturned.id,
      vehicleId: vehicles[6].id,
      customerId: customers[4].id,
      status: "ASSESSED" as const,
      paymentStatus: "UNPAID" as const,
      charge: 25000,
    },
    {
      code: "DMG-00003",
      rentalId: rentalReturned.id,
      vehicleId: vehicles[6].id,
      customerId: customers[4].id,
      status: "CHARGED" as const,
      paymentStatus: "PARTIALLY_PAID" as const,
      charge: 12000,
    },
    {
      code: "DMG-00004",
      rentalId: rentalReturned.id,
      vehicleId: vehicles[6].id,
      customerId: customers[4].id,
      status: "REPORTED" as const,
      paymentStatus: "UNPAID" as const,
      charge: 8000,
    },
  ];

  for (const damage of damages) {
    await prisma.rentalDamage.upsert({
      where: { damageCode: damage.code },
      update: {
        status: damage.status,
        paymentStatus: damage.paymentStatus,
        customerCharge: damage.charge,
      },
      create: {
        damageCode: damage.code,
        rentalId: damage.rentalId,
        vehicleId: damage.vehicleId,
        customerId: damage.customerId,
        damageType: "Panel damage",
        description: `Demo damage — ${damage.status} / ${damage.paymentStatus}`,
        estimatedCost: damage.charge,
        customerCharge: damage.charge,
        status: damage.status,
        paymentStatus: damage.paymentStatus,
        damageDate: daysFromNow(now, -1),
      },
    });
  }

  await prisma.rentalCharge.upsert({
    where: { id: "seed-charge-late-001" },
    update: {},
    create: {
      id: "seed-charge-late-001",
      rentalId: rentalReturned.id,
      description: "Late return cleaning fee",
      amount: 3500,
    },
  });

  await upsertPayment(prisma, {
    paymentCode: "PAY-DMG-001",
    rentalId: rentalReturned.id,
    customerId: customers[4].id,
    amount: 5000,
    paymentMethod: "OTHER",
    paymentType: "DAMAGE_PAYMENT",
    notes: "Partial damage payment demo",
    recordedById: admin.id,
  });
}

async function seedDriverRecords(
  prisma: PrismaClient,
  drivers: Driver[],
  rentalMonthly: Rental,
  now: Date
) {
  await prisma.driverPayment.upsert({
    where: { id: "seed-drv-pay-002" },
    update: {},
    create: {
      id: "seed-drv-pay-002",
      driverId: drivers[1].id,
      rentalId: rentalMonthly.id,
      amount: 120000,
      paymentMethod: "BANK_TRANSFER",
      paymentDate: daysFromNow(now, -4),
      referenceNumber: "DRV-PAY-002",
    },
  });

  const expenseTypes = ["FOOD", "ACCOMMODATION", "TRAVEL", "OTHER"] as const;
  for (const [index, expenseType] of expenseTypes.entries()) {
    await prisma.driverExpense.upsert({
      where: { id: `seed-drv-exp-${index + 1}` },
      update: {},
      create: {
        id: `seed-drv-exp-${index + 1}`,
        driverId: drivers[0].id,
        rentalId: rentalMonthly.id,
        expenseType,
        amount: 1500 + index * 500,
        expenseDate: daysFromNow(now, -10 + index),
        description: `Driver ${expenseType.toLowerCase()} expense demo`,
      },
    });
  }
}

async function seedExpenseCategories(
  prisma: PrismaClient,
  vehicles: Vehicle[],
  owners: VehicleOwner[],
  brokers: Broker[],
  rental: Rental,
  admin: SeedUserRef,
  manager: SeedUserRef,
  employee: SeedUserRef,
  now: Date
) {
  const categories = [
    "FUEL",
    "MAINTENANCE",
    "REPAIR",
    "INSURANCE",
    "REVENUE_LICENCE",
    "EMISSION_TEST",
    "DRIVER_PAYMENT",
    "DRIVER_ACCOMMODATION",
    "PARKING",
    "TOLL",
    "CLEANING",
    "OWNER_PAYMENT",
    "BROKER_COMMISSION",
    "OTHER",
  ] as const;

  for (const [index, category] of categories.entries()) {
    await prisma.expense.upsert({
      where: { expenseCode: `EXP-DEMO-${String(index + 1).padStart(2, "0")}` },
      update: { amount: 1000 + index * 250 },
      create: {
        expenseCode: `EXP-DEMO-${String(index + 1).padStart(2, "0")}`,
        category,
        amount: 1000 + index * 250,
        expenseDate: daysFromNow(now, -30 + index),
        description: `Demo expense — ${category}`,
        vehicleId: vehicles[index % vehicles.length].id,
        rentalId: index % 3 === 0 ? rental.id : undefined,
        ownerId: index === 11 ? owners[1].id : undefined,
        brokerId: index === 12 ? brokers[0].id : undefined,
        createdById: index % 2 === 0 ? admin.id : index % 3 === 0 ? manager.id : employee.id,
      },
    });
  }
}

async function seedMaintenanceRecords(
  prisma: PrismaClient,
  vehicles: Vehicle[],
  admin: SeedUserRef,
  employee: SeedUserRef,
  now: Date
) {
  const types = [
    "OIL_CHANGE",
    "BRAKE_SERVICE",
    "TYRES",
    "BATTERY",
    "AC_REPAIR",
    "ENGINE_REPAIR",
    "BODY_REPAIR",
    "ACCIDENT_REPAIR",
    "OTHER",
  ] as const;

  for (const [index, maintenanceType] of types.entries()) {
    await prisma.vehicleMaintenance.upsert({
      where: { maintenanceCode: `MNT-DEMO-${String(index + 1).padStart(2, "0")}` },
      update: {},
      create: {
        maintenanceCode: `MNT-DEMO-${String(index + 1).padStart(2, "0")}`,
        vehicleId: vehicles[(index + 1) % vehicles.length].id,
        maintenanceType,
        date: daysFromNow(now, -60 + index * 3),
        odometer: 40000 + index * 1000,
        description: `Demo maintenance record — ${maintenanceType}`,
        serviceProvider: "RedKnot Workshop",
        cost: 5000 + index * 1500,
        nextServiceDate: daysFromNow(now, 30 + index * 5),
        nextServiceKm: 45000 + index * 1000,
        createdById: index % 2 === 0 ? admin.id : employee.id,
      },
    });
  }
}

async function seedNotifications(
  prisma: PrismaClient,
  admin: SeedUserRef,
  driverUser: SeedUserRef,
  vehicles: Vehicle[],
  rentalInquiry: Rental,
  rentalReturned: Rental,
  now: Date
) {
  const count = await prisma.notification.count({
    where: { title: { startsWith: "[DEMO]" } },
  });
  if (count > 0) return;

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        title: "[DEMO] Critical insurance expired",
        message: `${vehicles[2].registrationNumber} insurance expired — test CRITICAL alert`,
        severity: "CRITICAL",
        entityType: "VehicleDocument",
        entityId: vehicles[2].id,
      },
      {
        userId: driverUser.id,
        title: "[DEMO] Assigned rental reminder",
        message: `Booking ${rentalInquiry.bookingNumber} is still in inquiry status`,
        severity: "INFO",
        entityType: "Rental",
        entityId: rentalInquiry.id,
      },
      {
        title: "[DEMO] Outstanding balance",
        message: `Booking ${rentalReturned.bookingNumber} has an outstanding balance after return`,
        severity: "WARNING",
        entityType: "Rental",
        entityId: rentalReturned.id,
      },
    ],
  });
}

async function seedAuditLogs(
  prisma: PrismaClient,
  admin: SeedUserRef,
  manager: SeedUserRef,
  rentalQuoted: Rental,
  rentalCancelled: Rental,
  customer: Customer
) {
  const count = await prisma.auditLog.count({
    where: { entityType: "SeedDemo" },
  });
  if (count > 0) return;

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "CREATE",
        entityType: "SeedDemo",
        entityId: customer.id,
        details: { module: "customers", note: "Demo audit log" },
      },
      {
        userId: manager.id,
        action: "UPDATE",
        entityType: "SeedDemo",
        entityId: rentalQuoted.id,
        details: { module: "rentals", status: "QUOTED" },
      },
      {
        userId: admin.id,
        action: "STATUS_CHANGE",
        entityType: "SeedDemo",
        entityId: rentalCancelled.id,
        details: { module: "rentals", status: "CANCELLED" },
      },
      {
        userId: manager.id,
        action: "PAYMENT",
        entityType: "SeedDemo",
        entityId: "PAY-DEMO",
        details: { module: "payments" },
      },
      {
        userId: admin.id,
        action: "SETTLEMENT",
        entityType: "SeedDemo",
        entityId: "SET-DEMO",
        details: { module: "settlements" },
      },
      {
        userId: admin.id,
        action: "BLACKLIST",
        entityType: "SeedDemo",
        entityId: customer.id,
        details: { module: "customers" },
      },
    ],
  });
}
