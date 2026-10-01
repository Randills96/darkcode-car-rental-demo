/**
 * READ-ONLY diagnostic: why is an owner settlement (and its PDF) missing?
 *
 * Usage:
 *   npx tsx scripts/diagnose-owner-settlement.ts                 # scans all owners
 *   npx tsx scripts/diagnose-owner-settlement.ts "Kalindu"       # filter by owner name
 *
 * Point DATABASE_URL at the database you are investigating (e.g. the Vercel one)
 * before running. This script only reads - it never writes.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const nameFilter = process.argv[2] ?? "";

function money(v: unknown) {
  return v === null || v === undefined ? "null" : String(v);
}

async function main() {
  console.log("=".repeat(72));
  console.log("OWNER SETTLEMENT DIAGNOSTIC");
  console.log("DB:", (process.env.DATABASE_URL ?? "(unset)").replace(/:\/\/[^@]*@/, "://***@"));
  if (nameFilter) console.log("Owner filter:", nameFilter);
  console.log("=".repeat(72));

  const owners = await prisma.vehicleOwner.findMany({
    where: nameFilter ? { name: { contains: nameFilter } } : {},
    include: {
      vehicles: {
        select: {
          id: true,
          registrationNumber: true,
          ownerId: true,
          ownershipType: true,
          ownerDailyRate: true,
          ownerExtraKmRate: true,
        },
      },
    },
  });

  if (owners.length === 0) {
    console.log("\n!! No owner found matching that name.");
    console.log("   All owners in this DB:");
    const all = await prisma.vehicleOwner.findMany({ select: { name: true, ownerCode: true } });
    all.forEach((o) => console.log(`     - ${o.name} (${o.ownerCode})`));
    return;
  }

  for (const owner of owners) {
    console.log(`\nOWNER: ${owner.name} (${owner.ownerCode})`);
    console.log(`  email: ${owner.email ?? "(none - blocks emailing the receipt)"}`);
    console.log(`  vehicles: ${owner.vehicles.length}`);

    for (const v of owner.vehicles) {
      console.log(`\n  VEHICLE ${v.registrationNumber}`);
      console.log(`    ownershipType : ${v.ownershipType}${v.ownershipType === "COMPANY_OWNED" ? "   <-- blocks settlement creation" : ""}`);
      console.log(`    ownerId set   : ${v.ownerId ? "yes" : "no   <-- blocks settlement creation"}`);
      console.log(`    ownerDailyRate: ${money(v.ownerDailyRate)}`);
      console.log(`    ownerExtraKm  : ${money(v.ownerExtraKmRate)}`);

      const rentals = await prisma.rental.findMany({
        where: { vehicleId: v.id },
        include: { ownerSettlement: { select: { id: true, ownerPayable: true, status: true } } },
        orderBy: { createdAt: "desc" },
      });

      if (rentals.length === 0) {
        console.log("    (no rentals on this vehicle)");
        continue;
      }

      for (const r of rentals) {
        console.log(`    - ${r.bookingNumber}  status=${r.status}`);
        console.log(`        rental.ownerDailyRate  = ${money(r.ownerDailyRate)}`);
        console.log(`        rental.ownerExtraKmRate= ${money(r.ownerExtraKmRate)}`);
        console.log(`        finalTotal=${money(r.finalTotal)} days=${r.rentalDays} extraKm=${r.extraKm}`);

        if (r.ownerSettlement) {
          console.log(`        SETTLEMENT: EXISTS  payable=${money(r.ownerSettlement.ownerPayable)} status=${r.ownerSettlement.status}`);
          console.log(`        PDF: /api/settlements/owner/${r.ownerSettlement.id}/receipt`);
        } else if (r.status !== "COMPLETED") {
          console.log(`        SETTLEMENT: none - rental is ${r.status}, not COMPLETED yet`);
        } else {
          console.log("        SETTLEMENT: *** MISSING despite COMPLETED ***");
          if (!v.ownerId) console.log("          reason: vehicle has no ownerId");
          else if (v.ownershipType === "COMPANY_OWNED") console.log("          reason: vehicle is COMPANY_OWNED");
          else console.log("          reason: vehicle looks correct NOW - it was probably");
          console.log("                  COMPANY_OWNED / owner-less at the moment the");
          console.log("                  rental was completed. Settlement is only created");
          console.log("                  once, at the COMPLETED transition.");
        }
      }
    }
  }

  // Global orphan scan
  console.log(`\n${"=".repeat(72)}`);
  console.log("ALL COMPLETED RENTALS MISSING AN OWNER SETTLEMENT:");
  const orphans = await prisma.rental.findMany({
    where: {
      status: "COMPLETED",
      ownerSettlement: null,
      vehicle: { ownerId: { not: null }, ownershipType: { not: "COMPANY_OWNED" } },
    },
    include: {
      vehicle: { select: { registrationNumber: true, owner: { select: { name: true } } } },
    },
  });
  if (orphans.length === 0) {
    console.log("  (none)");
  } else {
    orphans.forEach((r) =>
      console.log(`  - ${r.bookingNumber}  ${r.vehicle?.registrationNumber}  owner=${r.vehicle?.owner?.name}`)
    );
    console.log(`\n  ${orphans.length} rental(s) need a settlement backfill.`);
  }
}

main()
  .catch((e) => {
    console.error("Diagnostic failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
