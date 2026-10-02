import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDemoScenarios } from "./seed-demo-data";
import { upsertPayment, upsertRentalHandover, upsertRentalReturn } from "./seed-helpers";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Ready Cabs database...");

  // System Settings
  const settings = [
    { key: "rental_day_start_time", value: "19:00", description: "Rental day boundary time (7 PM)" },
    { key: "default_included_km", value: "200", description: "Default included KM per rental day" },
    { key: "currency", value: "LKR", description: "Primary currency" },
    { key: "currency_symbol", value: "Rs.", description: "Currency display symbol" },
    { key: "block_blacklisted_booking", value: "false", description: "Auto-block blacklisted customers from booking" },
    { key: "company_name", value: "Dark Code Car Rental", description: "Company name" },
    { key: "default_owner_commission", value: "30000", description: "Fixed company commission per owner settlement (LKR)" },
    { key: "default_broker_commission", value: "5000", description: "Fixed broker commission per rental (LKR)" },
    { key: "annual_fee_amount", value: "0", description: "Annual fee for Manager and Staff accounts (LKR)" },
    { key: "bank_name", value: "", description: "Company bank name for annual fee payments" },
    { key: "bank_account_name", value: "", description: "Company bank account name for annual fee payments" },
    { key: "bank_account_number", value: "", description: "Company bank account number for annual fee payments" },
    { key: "bank_branch", value: "", description: "Company bank branch for annual fee payments" },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting,
    });
  }

  // Users — Super Admin only. Manager/Staff/Driver logins are created in User Management.
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@darkcode.lk" },
    update: { password: passwordHash, status: "ACTIVE", deletedAt: null },
    create: {
      email: "admin@darkcode.lk",
      password: passwordHash,
      name: "Dark Code Administrator",
      phone: "0771234567",
      role: "SUPER_ADMIN",
    },
  });

  const extraUsers = await prisma.user.findMany({
    where: { role: { not: "SUPER_ADMIN" }, deletedAt: null },
    select: { id: true, email: true },
  });
  if (extraUsers.length > 0) {
    const extraIds = extraUsers.map((user) => user.id);
    await prisma.notification.deleteMany({ where: { userId: { in: extraIds } } });
    await prisma.$transaction(
      extraUsers.map((user) =>
        prisma.user.update({
          where: { id: user.id },
          data: {
            status: "INACTIVE",
            deletedAt: new Date(),
            email: `removed.${user.id}@deleted.local`,
          },
        })
      )
    );
  }

  const manager = admin;
  const employee = admin;
  const driverUser = admin;

  // Vehicle Owners
  const companyOwner = await prisma.vehicleOwner.upsert({
    where: { ownerCode: "OWN-00001" },
    update: {},
    create: {
      ownerCode: "OWN-00001",
      name: "RedKnot Tours (Pvt) Ltd",
      phone: "0112345678",
      whatsapp: "0771234567",
      address: "No. 45, Galle Road, Colombo 03",
      bankName: "Bank of Ceylon",
      bankAccount: "1234567890",
      bankBranch: "Colombo Fort",
    },
  });

  const owner2 = await prisma.vehicleOwner.upsert({
    where: { ownerCode: "OWN-00002" },
    update: {},
    create: {
      ownerCode: "OWN-00002",
      name: "Sunil Jayawardena",
      nic: "196512345678",
      phone: "0774567890",
      whatsapp: "0774567890",
      address: "No. 12, Kandy Road, Kadawatha",
      bankName: "Commercial Bank",
      bankAccount: "9876543210",
      bankBranch: "Kadawatha",
    },
  });

  const owner3 = await prisma.vehicleOwner.upsert({
    where: { ownerCode: "OWN-00003" },
    update: {},
    create: {
      ownerCode: "OWN-00003",
      name: "Priya Wickramasinghe",
      nic: "197812345678",
      phone: "0715678901",
      address: "No. 78, Negombo Road, Wattala",
      bankName: "Sampath Bank",
      bankAccount: "5544332211",
      bankBranch: "Wattala",
    },
  });

  const owners = [companyOwner, owner2, owner3];

  // Vehicles
  const vehiclesData = [
    { code: "VEH-00001", reg: "CAB-1234", type: "CAR" as const, make: "Toyota", model: "Axio", year: 2019, colour: "Silver", ownership: "COMPANY_OWNED" as const, ownerId: companyOwner.id, daily: 8000, odo: 45000 },
    { code: "VEH-00002", reg: "CAB-5678", type: "CAR" as const, make: "Toyota", model: "Premio", year: 2020, colour: "White", ownership: "COMPANY_OWNED" as const, ownerId: companyOwner.id, daily: 9000, odo: 38000 },
    { code: "VEH-00003", reg: "CAB-9012", type: "CAR" as const, make: "Honda", model: "Grace", year: 2021, colour: "Blue", ownership: "COMPANY_OWNED" as const, ownerId: companyOwner.id, daily: 8500, odo: 22000 },
    { code: "VEH-00004", reg: "CAB-3456", type: "SUV" as const, make: "Toyota", model: "Prado", year: 2018, colour: "Black", ownership: "PERSONALLY_OWNED" as const, ownerId: owner2.id, daily: 25000, odo: 78000 },
    { code: "VEH-00005", reg: "CAB-7890", type: "SUV" as const, make: "Mitsubishi", model: "Montero", year: 2019, colour: "White", ownership: "THIRD_PARTY_OWNED" as const, ownerId: owner3.id, daily: 22000, odo: 65000 },
    { code: "VEH-00006", reg: "CAB-2345", type: "CAR" as const, make: "Suzuki", model: "Wagon R", year: 2022, colour: "Red", ownership: "COMPANY_OWNED" as const, ownerId: companyOwner.id, daily: 6000, odo: 15000 },
    { code: "VEH-00007", reg: "CAB-6789", type: "CAR" as const, make: "Toyota", model: "Allion", year: 2020, colour: "Grey", ownership: "THIRD_PARTY_OWNED" as const, ownerId: owner3.id, daily: 9500, odo: 42000 },
    { code: "VEH-00008", reg: "CAB-0123", type: "VAN" as const, make: "Toyota", model: "Hiace", year: 2017, colour: "White", ownership: "PERSONALLY_OWNED" as const, ownerId: owner2.id, daily: 15000, odo: 120000 },
    { code: "VEH-00009", reg: "CAB-4567", type: "CAR" as const, make: "Nissan", model: "Sunny", year: 2021, colour: "Silver", ownership: "COMPANY_OWNED" as const, ownerId: companyOwner.id, daily: 7000, odo: 30000 },
    { code: "VEH-00010", reg: "CAB-8901", type: "SUV" as const, make: "Toyota", model: "Fortuner", year: 2022, colour: "Pearl White", ownership: "THIRD_PARTY_OWNED" as const, ownerId: owner3.id, daily: 28000, odo: 18000 },
    { code: "VEH-00011", reg: "CAD-7788", type: "CAR" as const, make: "Mercedes-Benz", model: "C200 AMG", year: 2023, colour: "Obsidian Black", ownership: "COMPANY_OWNED" as const, ownerId: companyOwner.id, daily: 45000, odo: 12000 },
    { code: "VEH-00012", reg: "CBF-3344", type: "SUV" as const, make: "Honda", model: "Vezel RS", year: 2021, colour: "Pearl White", ownership: "COMPANY_OWNED" as const, ownerId: companyOwner.id, daily: 16000, odo: 34000 },
    { code: "VEH-00013", reg: "ND-5566", type: "VAN" as const, make: "Toyota", model: "KDH Super GL", year: 2020, colour: "Silver", ownership: "PERSONALLY_OWNED" as const, ownerId: owner2.id, daily: 24000, odo: 68000 },
    { code: "VEH-00014", reg: "CBA-9911", type: "CAR" as const, make: "Suzuki", model: "Alto 800", year: 2022, colour: "Wine Red", ownership: "COMPANY_OWNED" as const, ownerId: companyOwner.id, daily: 4500, odo: 21000 },
    { code: "VEH-00015", reg: "CBD-2255", type: "SUV" as const, make: "Toyota", model: "Raize Turbo", year: 2023, colour: "Turquoise Blue", ownership: "COMPANY_OWNED" as const, ownerId: companyOwner.id, daily: 14000, odo: 18000 },
    { code: "VEH-00016", reg: "CAG-1122", type: "CAR" as const, make: "BMW", model: "520d M-Sport", year: 2022, colour: "Alpine White", ownership: "THIRD_PARTY_OWNED" as const, ownerId: owner3.id, daily: 55000, odo: 25000 },
  ];

  const vehicles = [];
  for (const v of vehiclesData) {
    const vehicle = await prisma.vehicle.upsert({
      where: { vehicleCode: v.code },
      update: { registrationNumber: v.reg },
      create: {
        vehicleCode: v.code,
        registrationNumber: v.reg,
        vehicleType: v.type,
        make: v.make,
        model: v.model,
        year: v.year,
        colour: v.colour,
        ownershipType: v.ownership,
        ownerId: v.ownerId,
        dailyRate: v.daily,
        includedKm: 200,
        extraKmRate: 100,
        weeklyRate: v.daily * 6,
        monthlyRate: v.daily * 25,
        currentOdometer: v.odo,
        status: "AVAILABLE",
      },
    });
    vehicles.push(vehicle);

    // Add documents once per vehicle
    const docCount = await prisma.vehicleDocument.count({ where: { vehicleId: vehicle.id } });
    if (docCount === 0) {
      await prisma.vehicleDocument.createMany({
        data: [
          {
            vehicleId: vehicle.id,
            documentType: "INSURANCE",
            documentNumber: `INS-${v.reg}`,
            issueDate: new Date("2025-06-01"),
            expiryDate: new Date("2026-06-01"),
          },
          {
            vehicleId: vehicle.id,
            documentType: "REVENUE_LICENCE",
            documentNumber: `RL-${v.reg}`,
            issueDate: new Date("2025-01-01"),
            expiryDate: new Date("2026-01-01"),
          },
          {
            vehicleId: vehicle.id,
            documentType: "EMISSION_CERTIFICATE",
            documentNumber: `EC-${v.reg}`,
            issueDate: new Date("2025-03-01"),
            expiryDate: new Date("2026-03-01"),
          },
        ],
      });
    }
  }

  // Set one vehicle to have expiring insurance
  await prisma.vehicleDocument.updateMany({
    where: { vehicleId: vehicles[0].id, documentType: "INSURANCE" },
    data: { expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
  });

  // Customers
  const customersData = [
    { code: "CUS-00001", name: "Amara Silva", nic: "199012345678", phone: "0771111111", address: "No. 10, Station Road, Nugegoda" },
    { code: "CUS-00002", name: "Dinesh Ratnayake", nic: "198512345679", phone: "0772222222", address: "No. 25, Lake Road, Boralesgamuwa" },
    { code: "CUS-00003", name: "Chathuri Mendis", nic: "199512345680", phone: "0773333333", address: "No. 8, Temple Road, Dehiwala" },
    { code: "CUS-00004", name: "Ruwan Bandara", nic: "198012345681", phone: "0774444444", address: "No. 33, Main Street, Panadura" },
    { code: "CUS-00005", name: "Kavindi Jayasinghe", nic: "199812345682", phone: "0775555555", address: "No. 15, Hill Street, Kandy" },
    { code: "CUS-00006", name: "Tharindu Wijesuriya", nic: "199312345683", phone: "0776666666", address: "No. 42, Beach Road, Mount Lavinia", status: "BLACKLISTED" as const },
    { code: "CUS-00007", name: "Dr. Kasun Fernando", nic: "198712345684", phone: "0777123456", address: "No. 18, Gregory's Road, Colombo 07" },
    { code: "CUS-00008", name: "Nilmini Perera", nic: "199112345685", phone: "0778234567", address: "No. 54, School Lane, Nawala" },
    { code: "CUS-00009", name: "Sanjeewa Bandara", nic: "198312345686", phone: "0779345678", address: "No. 22, Lighthouse Street, Galle Fort" },
    { code: "CUS-00010", name: "David Miller", nic: "990123456V", phone: "0770456789", address: "Cinnamon Grand Hotel, Colombo 03" },
  ];

  const customers = [];
  for (const c of customersData) {
    const customer = await prisma.customer.upsert({
      where: { customerCode: c.code },
      update: { nic: c.nic },
      create: {
        customerCode: c.code,
        fullName: c.name,
        nic: c.nic,
        phone: c.phone,
        whatsapp: c.phone,
        address: c.address,
        drivingLicenceNumber: `DL-${c.nic.slice(-6)}`,
        drivingLicenceExpiry: new Date("2027-12-31"),
        emergencyContact: "0770000000",
        createdById: admin.id,
        status: c.status || "NORMAL",
        ...(c.status === "BLACKLISTED" && {
          blacklistReason: "Previous rental damage not paid",
          blacklistDate: new Date("2025-11-01"),
          blacklistedById: admin.id,
        }),
      },
    });
    customers.push(customer);
  }

  // Drivers
  const driversData = [
    { code: "DRV-00001", name: "Ajith Kumara", nic: "197512345684", phone: "0711111111", daily: 5000 },
    { code: "DRV-00002", name: "Lasantha Perera", nic: "198212345685", phone: "0712222222", daily: 4500 },
    { code: "DRV-00003", name: "Mahesh Gunasekara", nic: "197812345686", phone: "0713333333", daily: 5000 },
  ];

  const drivers = [];
  for (const d of driversData) {
    const driver = await prisma.driver.upsert({
      where: { driverCode: d.code },
      update: { nic: d.nic },
      create: {
        driverCode: d.code,
        name: d.name,
        nic: d.nic,
        phone: d.phone,
        whatsapp: d.phone,
        address: "Colombo",
        drivingLicence: `DL-${d.nic.slice(-6)}`,
        licenceExpiry: new Date("2026-12-31"),
        dailyPayment: d.daily,
      },
    });
    drivers.push(driver);
  }

  // Brokers
  const brokersData = [
    { code: "BRK-00001", name: "Travel Lanka Agency", phone: "0111111111" },
    { code: "BRK-00002", name: "Ceylon Tours", phone: "0112222222" },
    { code: "BRK-00003", name: "Island Explorer", phone: "0113333333" },
  ];

  const brokers = [];
  for (const b of brokersData) {
    const broker = await prisma.broker.upsert({
      where: { brokerCode: b.code },
      update: {},
      create: {
        brokerCode: b.code,
        name: b.name,
        phone: b.phone,
        whatsapp: b.phone,
        address: "Colombo",
      },
    });
    brokers.push(broker);
  }

  // Sample Rentals
  const now = new Date();
  const rental1 = await prisma.rental.upsert({
    where: { bookingNumber: "RK-2026-00001" },
    update: {},
    create: {
      bookingNumber: "RK-2026-00001",
      customerId: customers[0].id,
      vehicleId: vehicles[0].id,
      rentalType: "SELF_DRIVE",
      ratePlanType: "DAILY",
      pickupDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      returnDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      pickupLocation: "Colombo Office",
      returnLocation: "Colombo Office",
      rentalDays: 3,
      dailyRate: 8000,
      includedKm: 600,
      extraKmRate: 100,
      estimatedTotal: 24000,
      securityDeposit: 50000,
      advancePayment: 10000,
      finalTotal: 24000,
      totalPaid: 10000,
      balance: 14000,
      status: "ACTIVE",
      createdById: employee.id,
    },
  });

  await prisma.vehicle.update({
    where: { id: vehicles[0].id },
    data: { status: "RENTED" },
  });

  await upsertRentalHandover(prisma, {
    rentalId: rental1.id,
    handoverDate: rental1.pickupDate,
    handoverTime: "19:00",
    startingOdometer: 45000,
    startingFuelLevel: "FULL",
    vehicleCondition: "Good condition, no visible damage",
    customerAcknowledged: true,
  });

  await upsertPayment(prisma, {
    paymentCode: "PAY-00001",
    rentalId: rental1.id,
    customerId: customers[0].id,
    amount: 10000,
    paymentMethod: "CASH",
    paymentType: "ADVANCE",
    recordedById: employee.id,
  });

  const deposit1 = await prisma.securityDeposit.findFirst({ where: { rentalId: rental1.id } });
  if (!deposit1) {
    await prisma.securityDeposit.create({
      data: {
        rentalId: rental1.id,
        depositAmount: 50000,
        paymentMethod: "CASH",
        status: "HELD",
      },
    });
  }

  const rental2 = await prisma.rental.upsert({
    where: { bookingNumber: "RK-2026-00002" },
    update: {},
    create: {
      bookingNumber: "RK-2026-00002",
      customerId: customers[1].id,
      vehicleId: vehicles[3].id,
      rentalType: "WITH_DRIVER",
      ratePlanType: "DAILY",
      pickupDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      returnDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      rentalDays: 4,
      dailyRate: 25000,
      driverCharge: 20000,
      includedKm: 800,
      extraKmRate: 150,
      estimatedTotal: 120000,
      deliveryCharge: 5000,
      finalTotal: 125000,
      totalPaid: 125000,
      balance: 0,
      status: "COMPLETED",
      driverId: drivers[0].id,
      brokerId: brokers[0].id,
      createdById: manager.id,
    },
  });

  await upsertRentalHandover(prisma, {
    rentalId: rental2.id,
    handoverDate: rental2.pickupDate,
    handoverTime: "19:00",
    startingOdometer: 78000,
    startingFuelLevel: "FULL",
    customerAcknowledged: true,
  });

  await upsertRentalReturn(prisma, {
    rentalId: rental2.id,
    returnDate: rental2.returnDate,
    returnTime: "19:00",
    endingOdometer: 78550,
    endingFuelLevel: "THREE_QUARTER",
    totalKm: 550,
    freeKm: 800,
    extraKm: 0,
    extraKmCharge: 0,
    cleaningStatus: "CLEAN",
  });

  await upsertPayment(prisma, {
    paymentCode: "PAY-00002",
    rentalId: rental2.id,
    customerId: customers[1].id,
    amount: 50000,
    paymentMethod: "BANK_TRANSFER",
    paymentType: "ADVANCE",
    referenceNumber: "TRF-001",
    recordedById: manager.id,
  });

  await upsertPayment(prisma, {
    paymentCode: "PAY-00003",
    rentalId: rental2.id,
    customerId: customers[1].id,
    amount: 75000,
    paymentMethod: "BANK_TRANSFER",
    paymentType: "FINAL_PAYMENT",
    referenceNumber: "TRF-002",
    recordedById: manager.id,
  });

  await prisma.ownerSettlement.upsert({
    where: { rentalId: rental2.id },
    update: {},
    create: {
      rentalId: rental2.id,
      ownerId: owner2.id,
      rentalRevenue: 125000,
      companyCommission: 30000,
      ownerPayable: 95000,
      paidAmount: 95000,
      paymentDate: new Date(),
      paymentMethod: "BANK_TRANSFER",
      referenceNumber: "OWN-TRF-001",
      status: "PAID",
      paidById: manager.id,
    },
  });

  await prisma.brokerCommission.upsert({
    where: { rentalId: rental2.id },
    update: {},
    create: {
      rentalId: rental2.id,
      brokerId: brokers[0].id,
      rentalValue: 125000,
      commissionAmount: 5000,
      paidAmount: 5000,
      paymentDate: new Date(),
      paymentMethod: "CASH",
      status: "PAID",
      paidById: manager.id,
    },
  });

  await prisma.driverPayment.upsert({
    where: { id: "seed-drv-pay-001" },
    update: {},
    create: {
      id: "seed-drv-pay-001",
      driverId: drivers[0].id,
      rentalId: rental2.id,
      amount: 20000,
      paymentMethod: "BANK_TRANSFER",
      paymentDate: new Date(),
      referenceNumber: "DRV-PAY-001",
      notes: "Driver payment for completed rental",
    },
  });

  // Maintenance
  await prisma.vehicleMaintenance.upsert({
    where: { maintenanceCode: "MNT-00001" },
    update: {},
    create: {
      maintenanceCode: "MNT-00001",
      vehicleId: vehicles[0].id,
      maintenanceType: "FULL_SERVICE",
      date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      odometer: 44000,
      description: "Full service including oil change, filter replacement",
      serviceProvider: "Toyota Service Center, Nugegoda",
      cost: 35000,
      nextServiceDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      nextServiceKm: 49000,
      createdById: admin.id,
    },
  });

  for (const expense of [
    {
      expenseCode: "EXP-00001",
      category: "INSURANCE" as const,
      amount: 45000,
      description: "Annual insurance - CAB-1234",
      vehicleId: vehicles[0].id,
      createdById: admin.id,
    },
    {
      expenseCode: "EXP-00002",
      category: "FUEL" as const,
      amount: 8000,
      description: "Fuel refill for fleet",
      vehicleId: vehicles[2].id,
      createdById: employee.id,
    },
    {
      expenseCode: "EXP-00003",
      category: "DRIVER_PAYMENT" as const,
      amount: 20000,
      description: "Driver payment for RK-2026-00002",
      rentalId: rental2.id,
      createdById: manager.id,
    },
  ]) {
    await prisma.expense.upsert({
      where: { expenseCode: expense.expenseCode },
      update: { amount: expense.amount },
      create: expense,
    });
  }

  await prisma.rentalDamage.upsert({
    where: { damageCode: "DMG-00001" },
    update: {},
    create: {
      damageCode: "DMG-00001",
      rentalId: rental2.id,
      vehicleId: vehicles[3].id,
      customerId: customers[1].id,
      damageType: "Scratch",
      description: "Minor scratch on rear bumper",
      estimatedCost: 15000,
      customerCharge: 0,
      status: "RESOLVED",
      paymentStatus: "PAID",
    },
  });

  const notificationCount = await prisma.notification.count();
  if (notificationCount <= 3) {
    await prisma.notification.createMany({
      data: [
        {
          title: "Insurance Expiring Soon",
          message: `${vehicles[0].registrationNumber} (Toyota Axio) — comprehensive insurance expires in 3 days`,
          severity: "WARNING",
          entityType: "VehicleDocument",
          entityId: "seed-alert-1",
        },
        {
          title: "Revenue Licence Renewal Due",
          message: `${vehicles[1].registrationNumber} (Toyota Premio) — annual revenue licence expires next week`,
          severity: "WARNING",
          entityType: "VehicleDocument",
          entityId: "seed-alert-rev",
        },
        {
          title: "Service Due Soon",
          message: `${vehicles[0].registrationNumber} — FULL SERVICE due within 250 km`,
          severity: "WARNING",
          entityType: "VehicleMaintenance",
          entityId: "seed-alert-2",
        },
        {
          title: "Call Ahead — Pickup Tomorrow",
          message: "Call Dinesh Ratnayake (0772222222) about RK-2026-00004. Handover scheduled for 10:00 AM.",
          severity: "INFO",
          entityType: "Rental",
          entityId: "seed-alert-call-1",
        },
        {
          title: "Call Ahead — Return Due Tomorrow",
          message: "Call Amara Silva (0771111111) about RK-2026-00001. Vehicle inspection and return due at 07:00 PM.",
          severity: "WARNING",
          entityType: "Rental",
          entityId: "seed-alert-call-2",
        },
        {
          title: "Outstanding Balance Follow-up",
          message: "Customer Ruwan Bandara owes Rs. 14,000 for rental RK-2026-00006. Awaiting final payment settlement.",
          severity: "WARNING",
          entityType: "Payment",
          entityId: "seed-alert-bal",
        },
        {
          userId: admin.id,
          title: "Welcome to Dark Code Car Rental Back Office",
          message: "Live system notifications for call-aheads, document expiry, overdue rentals, and balances appear here.",
          severity: "INFO",
        },
      ],
    });
  }

  await seedDemoScenarios(
    { prisma, now, admin, manager, employee, driverUser },
    { customers, vehicles, drivers, brokers, owners }
  );

  console.log("Seed completed successfully!");
  console.log("\nDefault login credentials:");
  console.log("  Super Admin: admin@darkcode.lk / Admin@123");
  console.log("\nDemo bookings to explore:");
  console.log("  RK-2026-00001 ACTIVE (handover + advance + deposit held)");
  console.log("  RK-2026-00002 COMPLETED (settlements paid)");
  console.log("  RK-2026-00003 INQUIRY | RK-2026-00004 QUOTED | RK-2026-00005 CONFIRMED");
  console.log("  RK-2026-00006 RETURNED (balance + damages) | RK-2026-00007 CANCELLED");
  console.log("  RK-2026-00008 COMPLETED (extra km Rs.5,000 test case)");
  console.log("  RK-2026-00009 ACTIVE (pending owner/broker settlements)");
  console.log("  RK-2026-00010 WEEKLY | RK-2026-00011 MONTHLY rate plans");
  console.log("  RK-2026-00012–014 security deposit REFUNDED / PARTIAL / FORFEITED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
