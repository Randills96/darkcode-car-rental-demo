import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all operational data...");
  console.log("Keeping: users, system settings\n");

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany();
    await tx.notification.deleteMany();
    await tx.driverExpense.deleteMany();
    await tx.driverPayment.deleteMany();
    await tx.brokerCommission.deleteMany();
    await tx.ownerSettlement.deleteMany();
    await tx.securityDeposit.deleteMany();
    await tx.payment.deleteMany();
    await tx.rentalCharge.deleteMany();
    await tx.rentalDamage.deleteMany();
    await tx.rentalReturn.deleteMany();
    await tx.rentalHandover.deleteMany();
    await tx.expense.deleteMany();
    await tx.rental.deleteMany();
    await tx.vehicleMaintenance.deleteMany();
    await tx.vehicleUnavailablePeriod.deleteMany();
    await tx.vehicleDocument.deleteMany();
    await tx.ratePlan.deleteMany();
    await tx.customerDocument.deleteMany();
    await tx.customerBlacklist.deleteMany();
    await tx.customer.deleteMany();
    await tx.vehicle.deleteMany();
    await tx.driver.deleteMany();
    await tx.broker.deleteMany();
    await tx.vehicleOwner.deleteMany();
  });

  const [users, settings] = await Promise.all([
    prisma.user.count(),
    prisma.systemSetting.count(),
  ]);

  console.log("Done. Database is ready for your own test data.");
  console.log(`  Users kept: ${users}`);
  console.log(`  System settings kept: ${settings}`);
  console.log("\nLogin credentials unchanged:");
  console.log("  admin@redknot.lk / Admin@123");
}

main()
  .catch((error) => {
    console.error("Failed to clear data:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
