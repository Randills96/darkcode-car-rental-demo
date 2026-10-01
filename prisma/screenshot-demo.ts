import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

/** Noon UTC so Vercel (UTC) and local dashboards both see today/tomorrow jobs. */
function utcNoon(dayOffset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, 12, 0, 0));
}

async function clearOperationalData() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.driverExpense.deleteMany();
  await prisma.driverPayment.deleteMany();
  await prisma.brokerCommission.deleteMany();
  await prisma.ownerSettlement.deleteMany();
  await prisma.securityDeposit.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rentalCharge.deleteMany();
  await prisma.rentalDamage.deleteMany();
  await prisma.rentalReturn.deleteMany();
  await prisma.rentalHandover.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.vehicleMaintenance.deleteMany();
  await prisma.vehicleUnavailablePeriod.deleteMany();
  await prisma.vehicleDocument.deleteMany();
  await prisma.ratePlan.deleteMany();
  await prisma.customerDocument.deleteMany();
  await prisma.customerBlacklist.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.broker.deleteMany();
  await prisma.vehicleOwner.deleteMany();
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", deletedAt: null, status: "ACTIVE" },
  });
  if (!admin) {
    throw new Error("No active Super Admin found. Sign in as admin@redknot.lk first.");
  }

  console.log("Clearing current operational data...");
  await clearOperationalData();
  console.log("Loading screenshot demo data (Super Admin login unchanged)...\n");

  const owners = await Promise.all(
    [
      { ownerCode: "OWN-00001", name: "Ready Cabs Fleet (Pvt) Ltd", nic: null, phone: "0112345678", address: "No. 120, Galle Road, Colombo 03", bankName: "Bank of Ceylon", bankAccount: "0076543210", bankBranch: "Colombo Fort" },
      { ownerCode: "OWN-00002", name: "Sunil Jayawardena", nic: "196512345678", phone: "0774567890", address: "No. 12, Kandy Road, Kadawatha", bankName: "Commercial Bank", bankAccount: "9876543210", bankBranch: "Kadawatha" },
      { ownerCode: "OWN-00003", name: "Priya Wickramasinghe", nic: "197812345678", phone: "0715678901", address: "No. 78, Negombo Road, Wattala", bankName: "Sampath Bank", bankAccount: "5544332211", bankBranch: "Wattala" },
      { ownerCode: "OWN-00004", name: "Mahinda Fernando", nic: "197012348901", phone: "0771122334", address: "No. 4, Beach Road, Negombo", bankName: "HNB", bankAccount: "1122334455", bankBranch: "Negombo" },
      { ownerCode: "OWN-00005", name: "Nadeeka Perera", nic: "198412347890", phone: "0719988776", address: "No. 21, Temple Road, Kandy", bankName: "NSB", bankAccount: "6677889900", bankBranch: "Kandy" },
      { ownerCode: "OWN-00006", name: "Island Motors", nic: null, phone: "0112456789", address: "No. 88, Baseline Road, Colombo 09", bankName: "DFCC", bankAccount: "3344556677", bankBranch: "Borella" },
      { ownerCode: "OWN-00007", name: "Ruwan Senanayake", nic: "197612349012", phone: "0763344556", address: "No. 9, Matara Road, Galle", bankName: "People's Bank", bankAccount: "2211009988", bankBranch: "Galle" },
      { ownerCode: "OWN-00008", name: "Chamari Dias", nic: "198912341234", phone: "0752211443", address: "No. 16, High Level Road, Nugegoda", bankName: "Sampath Bank", bankAccount: "7788990011", bankBranch: "Nugegoda" },
    ].map((owner) => prisma.vehicleOwner.create({ data: owner }))
  );

  const vehicleRows = [
    { vehicleCode: "VEH-00001", registrationNumber: "CAB-1201", vehicleType: "CAR" as const, make: "Toyota", model: "Axio", year: 2019, colour: "Silver", dailyRate: 8000, ownerId: owners[0].id, ownershipType: "COMPANY_OWNED" as const, currentOdometer: 45210, status: "RENTED" as const },
    { vehicleCode: "VEH-00002", registrationNumber: "CAB-1202", vehicleType: "CAR" as const, make: "Toyota", model: "Premio", year: 2020, colour: "White", dailyRate: 9000, ownerId: owners[0].id, ownershipType: "COMPANY_OWNED" as const, currentOdometer: 38140, status: "AVAILABLE" as const },
    { vehicleCode: "VEH-00003", registrationNumber: "CAB-1203", vehicleType: "CAR" as const, make: "Honda", model: "Grace", year: 2021, colour: "Blue", dailyRate: 8500, ownerId: owners[0].id, ownershipType: "COMPANY_OWNED" as const, currentOdometer: 22450, status: "RESERVED" as const },
    { vehicleCode: "VEH-00004", registrationNumber: "KX-8841", vehicleType: "SUV" as const, make: "Toyota", model: "Prado", year: 2018, colour: "Black", dailyRate: 25000, ownerId: owners[1].id, ownershipType: "PERSONALLY_OWNED" as const, currentOdometer: 78220, status: "AVAILABLE" as const, ownerDailyRate: 18000 },
    { vehicleCode: "VEH-00005", registrationNumber: "KW-3310", vehicleType: "SUV" as const, make: "Mitsubishi", model: "Montero", year: 2019, colour: "White", dailyRate: 22000, ownerId: owners[2].id, ownershipType: "THIRD_PARTY_OWNED" as const, currentOdometer: 65110, status: "RENTED" as const, ownerDailyRate: 16000 },
    { vehicleCode: "VEH-00006", registrationNumber: "CAB-2218", vehicleType: "CAR" as const, make: "Suzuki", model: "Wagon R", year: 2022, colour: "Red", dailyRate: 6000, ownerId: owners[0].id, ownershipType: "COMPANY_OWNED" as const, currentOdometer: 15480, status: "AVAILABLE" as const },
    { vehicleCode: "VEH-00007", registrationNumber: "CAL-4412", vehicleType: "CAR" as const, make: "Toyota", model: "Allion", year: 2020, colour: "Grey", dailyRate: 9500, ownerId: owners[2].id, ownershipType: "THIRD_PARTY_OWNED" as const, currentOdometer: 42890, status: "RESERVED" as const, ownerDailyRate: 6500 },
    { vehicleCode: "VEH-00008", registrationNumber: "NB-7723", vehicleType: "VAN" as const, make: "Toyota", model: "Hiace", year: 2017, colour: "White", dailyRate: 15000, ownerId: owners[1].id, ownershipType: "PERSONALLY_OWNED" as const, currentOdometer: 120440, status: "MAINTENANCE" as const, ownerDailyRate: 11000 },
    { vehicleCode: "VEH-00009", registrationNumber: "CAB-3099", vehicleType: "CAR" as const, make: "Nissan", model: "Sunny", year: 2021, colour: "Silver", dailyRate: 7000, ownerId: owners[0].id, ownershipType: "COMPANY_OWNED" as const, currentOdometer: 30120, status: "AVAILABLE" as const },
    { vehicleCode: "VEH-00010", registrationNumber: "CAA-5560", vehicleType: "SUV" as const, make: "Toyota", model: "Fortuner", year: 2022, colour: "Pearl White", dailyRate: 28000, ownerId: owners[3].id, ownershipType: "THIRD_PARTY_OWNED" as const, currentOdometer: 18770, status: "AVAILABLE" as const, ownerDailyRate: 20000 },
    { vehicleCode: "VEH-00011", registrationNumber: "CAC-1188", vehicleType: "CAR" as const, make: "Honda", model: "Vezel", year: 2021, colour: "Green", dailyRate: 12000, ownerId: owners[4].id, ownershipType: "PERSONALLY_OWNED" as const, currentOdometer: 27650, status: "RENTED" as const, ownerDailyRate: 8500 },
    { vehicleCode: "VEH-00012", registrationNumber: "CAB-7744", vehicleType: "CAR" as const, make: "Toyota", model: "Aqua", year: 2023, colour: "White", dailyRate: 7500, ownerId: owners[0].id, ownershipType: "COMPANY_OWNED" as const, currentOdometer: 9800, status: "AVAILABLE" as const },
  ];

  const vehicles = [];
  for (const row of vehicleRows) {
    const vehicle = await prisma.vehicle.create({
      data: {
        ...row,
        includedKm: 200,
        extraKmRate: row.dailyRate >= 20000 ? 150 : 80,
        ownerExtraKmRate: row.ownerDailyRate ? 40 : undefined,
        weeklyRate: row.dailyRate * 6,
        monthlyRate: row.dailyRate * 25,
        seatingCapacity: row.vehicleType === "VAN" ? 14 : row.vehicleType === "SUV" ? 7 : 5,
        transmission: "AUTOMATIC",
        fuelType: row.model === "Aqua" || row.model === "Vezel" ? "HYBRID" : "PETROL",
      },
    });
    vehicles.push(vehicle);
    await prisma.vehicleDocument.createMany({
      data: [
        { vehicleId: vehicle.id, documentType: "INSURANCE", documentNumber: `INS-${vehicle.registrationNumber}`, issueDate: daysFromNow(-200), expiryDate: daysFromNow(vehicle.vehicleCode.endsWith("01") ? 4 : 160) },
        { vehicleId: vehicle.id, documentType: "REVENUE_LICENCE", documentNumber: `RL-${vehicle.registrationNumber}`, issueDate: daysFromNow(-90), expiryDate: daysFromNow(250) },
      ],
    });
    await prisma.ratePlan.create({
      data: { vehicleId: vehicle.id, planType: "DAILY", rate: row.dailyRate, includedKm: 200, extraKmRate: 80 },
    });
  }

  const customers = await Promise.all(
    [
      { customerCode: "CUS-00001", fullName: "Amara Silva", nic: "199012345678", phone: "0771111001", address: "No. 10, Station Road, Nugegoda" },
      { customerCode: "CUS-00002", fullName: "Dinesh Ratnayake", nic: "198512345679", phone: "0771111002", address: "No. 25, Lake Road, Boralesgamuwa" },
      { customerCode: "CUS-00003", fullName: "Chathuri Mendis", nic: "199512345680", phone: "0771111003", address: "No. 8, Temple Road, Dehiwala" },
      { customerCode: "CUS-00004", fullName: "Ruwan Bandara", nic: "198012345681", phone: "0771111004", address: "No. 33, Main Street, Panadura" },
      { customerCode: "CUS-00005", fullName: "Kavindi Jayasinghe", nic: "199812345682", phone: "0771111005", address: "No. 15, Hill Street, Kandy" },
      { customerCode: "CUS-00006", fullName: "Tharindu Wijesuriya", nic: "199312345683", phone: "0771111006", address: "No. 42, Beach Road, Mount Lavinia", status: "BLACKLISTED" as const, blacklistReason: "Unpaid damage from a previous hire" },
      { customerCode: "CUS-00007", fullName: "Nadeesha Fernando", nic: "199212345684", phone: "0771111007", address: "No. 6, Park Lane, Rajagiriya" },
      { customerCode: "CUS-00008", fullName: "Isuru Perera", nic: "198812345685", phone: "0771111008", address: "No. 19, Galle Road, Moratuwa" },
      { customerCode: "CUS-00009", fullName: "Sanduni Wickramasinghe", nic: "199612345686", phone: "0771111009", address: "No. 54, Peradeniya Road, Kandy" },
      { customerCode: "CUS-00010", fullName: "Nuwan Rajapaksa", nic: "198412345687", phone: "0771111010", address: "No. 2, Airport Road, Katunayake" },
      { customerCode: "CUS-00011", fullName: "Malsha Gunawardena", nic: "199712345688", phone: "0771111011", address: "No. 71, Bauddhaloka Mawatha, Colombo 07" },
      { customerCode: "CUS-00012", fullName: "Chamara Dias", nic: "198912345689", phone: "0771111012", address: "No. 11, Matara Road, Galle" },
      { customerCode: "CUS-00013", fullName: "Ishara Senanayake", nic: "199412345690", phone: "0771111013", address: "No. 28, Kurunegala Road, Chilaw" },
      { customerCode: "CUS-00014", fullName: "Pradeep Weerasinghe", nic: "198212345691", phone: "0771111014", address: "No. 3, Hospital Road, Kalutara" },
      { customerCode: "CUS-00015", fullName: "Hashini Karunaratne", nic: "199912345692", phone: "0771111015", address: "No. 40, Flower Road, Colombo 07" },
      { customerCode: "CUS-00016", fullName: "Lasith Abeysekera", nic: "199112345693", phone: "0771111016", address: "No. 17, Duplication Road, Colombo 04" },
    ].map((row) =>
      prisma.customer.create({
        data: {
          customerCode: row.customerCode,
          fullName: row.fullName,
          nic: row.nic,
          phone: row.phone,
          whatsapp: row.phone,
          address: row.address,
          drivingLicenceNumber: `B${row.nic.slice(-7)}`,
          drivingLicenceExpiry: daysFromNow(400),
          emergencyContact: "0770000111",
          createdById: admin.id,
          status: row.status ?? "NORMAL",
          ...(row.status === "BLACKLISTED"
            ? { blacklistReason: row.blacklistReason, blacklistDate: daysFromNow(-40), blacklistedById: admin.id }
            : {}),
        },
      })
    )
  );

  const drivers = await Promise.all(
    [
      { driverCode: "DRV-00001", name: "Ajith Kumara", nic: "197512345701", phone: "0711111001", dailyPayment: 5000 },
      { driverCode: "DRV-00002", name: "Lasantha Perera", nic: "198212345702", phone: "0711111002", dailyPayment: 4500 },
      { driverCode: "DRV-00003", name: "Mahesh Gunasekara", nic: "197812345703", phone: "0711111003", dailyPayment: 5000 },
      { driverCode: "DRV-00004", name: "Saman Rathnayake", nic: "197012345704", phone: "0711111004", dailyPayment: 4800 },
      { driverCode: "DRV-00005", name: "Nalaka Silva", nic: "198512345705", phone: "0711111005", dailyPayment: 5200 },
      { driverCode: "DRV-00006", name: "Upul Jayasuriya", nic: "197412345706", phone: "0711111006", dailyPayment: 4600 },
      { driverCode: "DRV-00007", name: "Roshan Weerakoon", nic: "198012345707", phone: "0711111007", dailyPayment: 5000 },
      { driverCode: "DRV-00008", name: "Janaka Bandara", nic: "197912345708", phone: "0711111008", dailyPayment: 4700 },
    ].map((row) =>
      prisma.driver.create({
        data: {
          ...row,
          whatsapp: row.phone,
          address: "Colombo",
          drivingLicence: `DL-${row.nic.slice(-6)}`,
          licenceExpiry: daysFromNow(row.driverCode.endsWith("08") ? 12 : 320),
        },
      })
    )
  );

  const brokers = await Promise.all(
    [
      { brokerCode: "BRK-00001", name: "Travel Lanka Agency", phone: "0112111001", defaultCommissionPerDay: 1500 },
      { brokerCode: "BRK-00002", name: "Ceylon Tours", phone: "0112111002", defaultCommissionPerDay: 1200 },
      { brokerCode: "BRK-00003", name: "Island Explorer", phone: "0112111003", defaultCommissionPerDay: 1800 },
      { brokerCode: "BRK-00004", name: "Pearl Holidays", phone: "0112111004", defaultCommissionPerDay: 1000 },
      { brokerCode: "BRK-00005", name: "Colombo City Desk", phone: "0112111005", defaultCommissionPerDay: 800 },
      { brokerCode: "BRK-00006", name: "Kandy Weekend Cars", phone: "0812223344", defaultCommissionPerDay: 1300 },
    ].map((row) =>
      prisma.broker.create({
        data: { ...row, whatsapp: row.phone, address: "Sri Lanka", defaultCommissionPerExtraKm: 10 },
      })
    )
  );

  type RentalSeed = {
    bookingNumber: string;
    customer: number;
    vehicle: number;
    status: "INQUIRY" | "QUOTED" | "CONFIRMED" | "ACTIVE" | "RETURNED" | "COMPLETED" | "CANCELLED";
    pickup: number;
    days: number;
    utc?: boolean;
    driver?: number;
    broker?: number;
    type?: "SELF_DRIVE" | "WITH_DRIVER";
  };

  const rentalSeeds: RentalSeed[] = [
    { bookingNumber: "RK-2026-00001", customer: 0, vehicle: 0, status: "ACTIVE", pickup: -3, days: 3, utc: true },
    { bookingNumber: "RK-2026-00002", customer: 1, vehicle: 4, status: "ACTIVE", pickup: -2, days: 3, utc: true, driver: 0, broker: 0, type: "WITH_DRIVER" },
    { bookingNumber: "RK-2026-00003", customer: 2, vehicle: 10, status: "ACTIVE", pickup: -1, days: 4, driver: 1, type: "WITH_DRIVER" },
    { bookingNumber: "RK-2026-00004", customer: 3, vehicle: 2, status: "CONFIRMED", pickup: 0, days: 2, utc: true },
    { bookingNumber: "RK-2026-00005", customer: 4, vehicle: 3, status: "QUOTED", pickup: 5, days: 3, broker: 1 },
    { bookingNumber: "RK-2026-00006", customer: 6, vehicle: 5, status: "INQUIRY", pickup: 8, days: 2 },
    { bookingNumber: "RK-2026-00007", customer: 7, vehicle: 8, status: "CANCELLED", pickup: -6, days: 2 },
    { bookingNumber: "RK-2026-00008", customer: 8, vehicle: 9, status: "COMPLETED", pickup: -12, days: 4, driver: 2, broker: 2, type: "WITH_DRIVER" },
    { bookingNumber: "RK-2026-00009", customer: 9, vehicle: 1, status: "COMPLETED", pickup: -18, days: 3 },
    { bookingNumber: "RK-2026-00010", customer: 10, vehicle: 11, status: "RETURNED", pickup: -4, days: 3 },
    { bookingNumber: "RK-2026-00011", customer: 11, vehicle: 8, status: "COMPLETED", pickup: -20, days: 2, broker: 3 },
    { bookingNumber: "RK-2026-00012", customer: 12, vehicle: 3, status: "COMPLETED", pickup: -25, days: 6, driver: 3, type: "WITH_DRIVER" },
    { bookingNumber: "RK-2026-00013", customer: 13, vehicle: 5, status: "QUOTED", pickup: 10, days: 7 },
    { bookingNumber: "RK-2026-00014", customer: 14, vehicle: 6, status: "CONFIRMED", pickup: 1, days: 2, utc: true, broker: 4 },
    { bookingNumber: "RK-2026-00015", customer: 15, vehicle: 5, status: "COMPLETED", pickup: -9, days: 1 },
    { bookingNumber: "RK-2026-00016", customer: 4, vehicle: 11, status: "INQUIRY", pickup: 14, days: 5, type: "WITH_DRIVER", driver: 4 },
  ];

  const rentals = [];
  for (const seed of rentalSeeds) {
    const vehicle = vehicles[seed.vehicle];
    const customer = customers[seed.customer];
    const rentalDays = seed.days;
    const dailyRate = Number(vehicle.dailyRate);
    const driverCharge = seed.type === "WITH_DRIVER" ? 5000 * rentalDays : 0;
    const estimatedTotal = dailyRate * rentalDays + driverCharge;
    const advance = seed.status === "INQUIRY" || seed.status === "CANCELLED" ? 0 : Math.round(estimatedTotal * 0.4);
    const totalPaid =
      seed.status === "COMPLETED" || seed.status === "RETURNED" ? estimatedTotal : advance;
    const pickupDate = seed.utc ? utcNoon(seed.pickup) : daysFromNow(seed.pickup);
    const returnDate = seed.utc ? utcNoon(seed.pickup + rentalDays) : daysFromNow(seed.pickup + rentalDays);

    const rental = await prisma.rental.create({
      data: {
        bookingNumber: seed.bookingNumber,
        customerId: customer.id,
        vehicleId: vehicle.id,
        rentalType: seed.type ?? "SELF_DRIVE",
        ratePlanType: "DAILY",
        pickupDate,
        returnDate,
        pickupTime: "10:00",
        returnTime: "18:00",
        pickupLocation: "Ready Cabs Colombo",
        returnLocation: "Ready Cabs Colombo",
        rentalDays,
        dailyRate,
        includedKm: 200 * rentalDays,
        extraKmRate: vehicle.extraKmRate,
        estimatedTotal,
        driverCharge,
        securityDeposit: seed.status === "INQUIRY" ? 0 : 50000,
        advancePayment: advance,
        finalTotal: estimatedTotal,
        totalPaid,
        balance: estimatedTotal - totalPaid,
        status: seed.status,
        driverId: seed.driver !== undefined ? drivers[seed.driver].id : undefined,
        brokerId: seed.broker !== undefined ? brokers[seed.broker].id : undefined,
        brokerCommissionPerDay: seed.broker !== undefined ? Number(brokers[seed.broker].defaultCommissionPerDay) : undefined,
        ownerDailyRate: vehicle.ownerDailyRate,
        createdById: admin.id,
      },
    });
    rentals.push(rental);

    const handedOver = ["ACTIVE", "RETURNED", "COMPLETED"].includes(seed.status);
    if (handedOver) {
      await prisma.rentalHandover.create({
        data: {
          rentalId: rental.id,
          handoverDate: pickupDate,
          handoverTime: "10:00",
          startingOdometer: vehicle.currentOdometer,
          startingFuelLevel: "FULL",
          vehicleCondition: "Clean, no new damage at handover",
          customerAcknowledged: true,
        },
      });
      await prisma.securityDeposit.create({
        data: {
          rentalId: rental.id,
          depositAmount: 50000,
          paymentMethod: "CASH",
          status: seed.status === "COMPLETED" ? "REFUNDED" : "HELD",
          refundAmount: seed.status === "COMPLETED" ? 50000 : 0,
          refundDate: seed.status === "COMPLETED" ? returnDate : undefined,
          refundMethod: seed.status === "COMPLETED" ? "CASH" : undefined,
        },
      });
    }

    if (seed.status === "RETURNED" || seed.status === "COMPLETED") {
      const extraKm = seed.bookingNumber.endsWith("10") ? 80 : 0;
      await prisma.rentalReturn.create({
        data: {
          rentalId: rental.id,
          returnDate,
          returnTime: "18:00",
          endingOdometer: vehicle.currentOdometer + 180 * rentalDays + extraKm,
          endingFuelLevel: extraKm ? "HALF" : "THREE_QUARTER",
          totalKm: 180 * rentalDays + extraKm,
          freeKm: 200 * rentalDays,
          extraKm,
          extraKmCharge: extraKm * Number(vehicle.extraKmRate),
          cleaningStatus: extraKm ? "NEEDS_CLEANING" : "CLEAN",
        },
      });
    }

    if (advance > 0) {
      await prisma.payment.create({
        data: {
          paymentCode: `PAY-${seed.bookingNumber.slice(-5)}-A`,
          rentalId: rental.id,
          customerId: customer.id,
          amount: advance,
          paymentMethod: seed.broker !== undefined ? "BANK_TRANSFER" : "CASH",
          paymentType: "ADVANCE",
          paymentDate: pickupDate,
          recordedById: admin.id,
        },
      });
    }
    if (seed.status === "COMPLETED" || seed.status === "RETURNED") {
      const remainder = estimatedTotal - advance;
      if (remainder > 0) {
        await prisma.payment.create({
          data: {
            paymentCode: `PAY-${seed.bookingNumber.slice(-5)}-F`,
            rentalId: rental.id,
            customerId: customer.id,
            amount: remainder,
            paymentMethod: "CARD",
            paymentType: "FINAL_PAYMENT",
            paymentDate: returnDate,
            recordedById: admin.id,
          },
        });
      }
    }

    if (seed.status === "COMPLETED" && vehicle.ownerId && vehicle.ownershipType !== "COMPANY_OWNED") {
      const ownerPayable = Number(vehicle.ownerDailyRate ?? dailyRate * 0.7) * rentalDays;
      await prisma.ownerSettlement.create({
        data: {
          rentalId: rental.id,
          ownerId: vehicle.ownerId,
          rentalRevenue: estimatedTotal,
          companyCommission: 30000,
          ownerDailyRate: vehicle.ownerDailyRate ?? 0,
          billableDays: rentalDays,
          ownerPayable,
          paidAmount: seed.bookingNumber.endsWith("08") ? ownerPayable : 0,
          paymentDate: seed.bookingNumber.endsWith("08") ? returnDate : undefined,
          paymentMethod: seed.bookingNumber.endsWith("08") ? "BANK_TRANSFER" : undefined,
          status: seed.bookingNumber.endsWith("08") ? "PAID" : "PENDING",
          paidById: seed.bookingNumber.endsWith("08") ? admin.id : undefined,
        },
      });
    }

    if (seed.status === "COMPLETED" && seed.broker !== undefined) {
      const commissionAmount = Number(brokers[seed.broker].defaultCommissionPerDay) * rentalDays;
      await prisma.brokerCommission.create({
        data: {
          rentalId: rental.id,
          brokerId: brokers[seed.broker].id,
          rentalValue: estimatedTotal,
          commissionPerDay: brokers[seed.broker].defaultCommissionPerDay,
          billableDays: rentalDays,
          commissionAmount,
          paidAmount: commissionAmount,
          paymentDate: returnDate,
          paymentMethod: "CASH",
          status: "PAID",
          paidById: admin.id,
        },
      });
    }
  }

  await prisma.rentalDamage.createMany({
    data: [
      {
        damageCode: "DMG-00001",
        rentalId: rentals[7].id,
        vehicleId: vehicles[9].id,
        customerId: customers[8].id,
        damageType: "Scratch",
        description: "Rear bumper scratch after airport drop",
        estimatedCost: 18000,
        customerCharge: 18000,
        status: "CHARGED",
        paymentStatus: "PAID",
        damageDate: daysFromNow(-8),
      },
      {
        damageCode: "DMG-00002",
        rentalId: rentals[9].id,
        vehicleId: vehicles[11].id,
        customerId: customers[10].id,
        damageType: "Dent",
        description: "Small dent on front left door",
        estimatedCost: 25000,
        customerCharge: 25000,
        status: "ASSESSED",
        paymentStatus: "UNPAID",
        damageDate: daysFromNow(-1),
      },
      {
        damageCode: "DMG-00003",
        rentalId: rentals[11].id,
        vehicleId: vehicles[3].id,
        customerId: customers[12].id,
        damageType: "Interior stain",
        description: "Rear seat stain after wedding hire",
        estimatedCost: 8000,
        customerCharge: 0,
        status: "RESOLVED",
        paymentStatus: "PAID",
        damageDate: daysFromNow(-20),
      },
    ],
  });

  await prisma.vehicleMaintenance.createMany({
    data: [
      { maintenanceCode: "MNT-00001", vehicleId: vehicles[7].id, maintenanceType: "FULL_SERVICE", date: daysFromNow(-1), odometer: 120440, description: "Hiace in workshop for full service and brake pads", serviceProvider: "Toyota Lanka, Ratmalana", cost: 86000, nextServiceKm: 125000, createdById: admin.id },
      { maintenanceCode: "MNT-00002", vehicleId: vehicles[0].id, maintenanceType: "OIL_CHANGE", date: daysFromNow(-28), odometer: 44800, description: "Oil and filter change before current hire", serviceProvider: "Quick Lube Nugegoda", cost: 12500, nextServiceDate: daysFromNow(40), createdById: admin.id },
      { maintenanceCode: "MNT-00003", vehicleId: vehicles[4].id, maintenanceType: "TYRES", date: daysFromNow(-15), odometer: 64800, description: "Replaced two rear tyres", serviceProvider: "Kelani Tyres", cost: 42000, createdById: admin.id },
      { maintenanceCode: "MNT-00004", vehicleId: vehicles[9].id, maintenanceType: "AC_REPAIR", date: daysFromNow(-6), odometer: 18600, description: "AC gas refill and filter clean", serviceProvider: "Cool Auto, Wattala", cost: 9800, createdById: admin.id },
      { maintenanceCode: "MNT-00005", vehicleId: vehicles[2].id, maintenanceType: "BATTERY", date: daysFromNow(-45), odometer: 21000, description: "New battery fitted", serviceProvider: "Amaron Centre", cost: 28500, createdById: admin.id },
      { maintenanceCode: "MNT-00006", vehicleId: vehicles[11].id, maintenanceType: "BODY_REPAIR", date: daysFromNow(-3), odometer: 9750, description: "Touch-up after minor door ding", serviceProvider: "City Spray, Kohuwala", cost: 15000, createdById: admin.id },
    ],
  });

  await prisma.expense.createMany({
    data: [
      { expenseCode: "EXP-00001", category: "INSURANCE", amount: 28000, description: "Fleet comprehensive insurance installment", vehicleId: vehicles[0].id, createdById: admin.id, expenseDate: daysFromNow(-20) },
      { expenseCode: "EXP-00002", category: "FUEL", amount: 8500, description: "Fuel top-up before Prado hire", vehicleId: vehicles[3].id, createdById: admin.id, expenseDate: daysFromNow(-4) },
      { expenseCode: "EXP-00003", category: "CLEANING", amount: 3500, description: "Interior detail after wedding hire", vehicleId: vehicles[9].id, createdById: admin.id, expenseDate: daysFromNow(-7) },
      { expenseCode: "EXP-00004", category: "REVENUE_LICENCE", amount: 6200, description: "Revenue licence renewal CAB-1202", vehicleId: vehicles[1].id, createdById: admin.id, expenseDate: daysFromNow(-30) },
      { expenseCode: "EXP-00005", category: "DRIVER_PAYMENT", amount: 20000, description: "Driver pay for RK-2026-00008", rentalId: rentals[7].id, createdById: admin.id, expenseDate: daysFromNow(-8) },
      { expenseCode: "EXP-00006", category: "OWNER_PAYMENT", amount: 32000, description: "Owner payout for completed Fortuner hire", ownerId: owners[3].id, rentalId: rentals[7].id, createdById: admin.id, expenseDate: daysFromNow(-8) },
      { expenseCode: "EXP-00007", category: "BROKER_COMMISSION", amount: 5000, description: "Broker commission Island Explorer", brokerId: brokers[2].id, rentalId: rentals[7].id, createdById: admin.id, expenseDate: daysFromNow(-8) },
      { expenseCode: "EXP-00008", category: "MAINTENANCE", amount: 18000, description: "Hiace workshop bill", vehicleId: vehicles[7].id, createdById: admin.id, expenseDate: daysFromNow(-1) },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: admin.id, title: "Insurance expiring soon", message: "CAB-1201 comprehensive insurance expires in 4 days.", severity: "WARNING", entityType: "VehicleDocument" },
      { userId: admin.id, title: "Active hires on the road", message: "3 vehicles are currently on hire. Check balances before return.", severity: "INFO" },
      { userId: admin.id, title: "Unpaid damage", message: "DMG-00002 on RK-2026-00010 is assessed and still unpaid.", severity: "CRITICAL", entityType: "RentalDamage" },
      { userId: admin.id, title: "Hiace in workshop", message: "NB-7723 is off the road for full service.", severity: "WARNING", entityType: "VehicleMaintenance" },
    ],
  });

  const counts = {
    owners: owners.length,
    vehicles: vehicles.length,
    customers: customers.length,
    drivers: drivers.length,
    brokers: brokers.length,
    rentals: rentals.length,
  };
  const total =
    counts.owners + counts.vehicles + counts.customers + counts.drivers + counts.brokers + counts.rentals;

  console.log("Screenshot demo data is ready.");
  console.log(`  Owners ${counts.owners} | Vehicles ${counts.vehicles} | Customers ${counts.customers}`);
  console.log(`  Drivers ${counts.drivers} | Brokers ${counts.brokers} | Rentals ${counts.rentals}`);
  console.log(`  Primary records: ${total}`);
  console.log("\nSign in as Super Admin: admin@redknot.lk / Admin@123");
  console.log("When screenshots are done, run: npm run db:clear");
}

main()
  .catch((error) => {
    console.error("Failed to load screenshot demo data:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
