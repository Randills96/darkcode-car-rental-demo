import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateBalance,
  calculatePricing,
  calculateRentalDays,
  getRentalDurationInfo,
} from "./pricing";
import {
  calculateBrokerCommission,
  calculateOwnerSettlement,
  vehiclePaysAnOwner,
  deriveOwnerRatesFromCustomerRates,
} from "./commission-calculator";

describe("calculateRentalDays", () => {
  it("counts same-day rental as 1 day", () => {
    const pickup = new Date("2026-01-10T00:00:00");
    const ret = new Date("2026-01-10T00:00:00");
    assert.equal(calculateRentalDays(pickup, ret, "09:00", "18:00"), 1);
  });

  it("counts ada aran heta (next-day return) as 1 day regardless of time variation", () => {
    const pickup = new Date("2026-01-10T00:00:00");
    const ret = new Date("2026-01-11T00:00:00");
    assert.equal(calculateRentalDays(pickup, ret, "08:00", "20:00"), 1);
    assert.equal(calculateRentalDays(pickup, ret, "10:00", "10:00"), 1);
    assert.equal(calculateRentalDays(pickup, ret, "14:00", "09:00"), 1);
  });

  it("calculates multi-day rentals by calendar date difference", () => {
    const pickup = new Date("2026-01-10T00:00:00");
    const ret2Days = new Date("2026-01-12T00:00:00");
    const ret5Days = new Date("2026-01-15T00:00:00");
    assert.equal(calculateRentalDays(pickup, ret2Days, "09:00", "09:00"), 2);
    assert.equal(calculateRentalDays(pickup, ret5Days, "09:00", "18:00"), 5);
  });

  it("detects extra hours when rental duration exceeds 24h cycle", () => {
    const pickup = new Date("2026-01-10T00:00:00");
    const ret = new Date("2026-01-11T00:00:00");
    // 8am on Jan 10 to 4pm (16:00) on Jan 11 is 32 hours (8 extra hours beyond 24h)
    const info = getRentalDurationInfo(pickup, ret, "08:00", "16:00");
    assert.equal(info.rentalDays, 1);
    assert.equal(info.totalHours, 32);
    assert.equal(info.expectedHours, 24);
    assert.equal(info.extraHours, 8);
    assert.equal(info.isOverdue24h, true);

    // Standard 24h rental has 0 extra hours
    const standard = getRentalDurationInfo(pickup, ret, "09:00", "09:00");
    assert.equal(standard.rentalDays, 1);
    assert.equal(standard.totalHours, 24);
    assert.equal(standard.extraHours, 0);
    assert.equal(standard.isOverdue24h, false);
  });
});

describe("calculatePricing", () => {
  it("charges extra km beyond included allowance", () => {
    const result = calculatePricing({
      dailyRate: 10_000,
      rentalDays: 1,
      includedKmPerDay: 200,
      extraKmRate: 100,
      startingOdometer: 10_000,
      endingOdometer: 10_250,
    });

    assert.equal(result.includedKm, 200);
    assert.equal(result.totalKm, 250);
    assert.equal(result.extraKm, 50);
    assert.equal(result.extraKmCharge, 5_000);
    assert.equal(result.baseAmount, 10_000);
    assert.equal(result.finalTotal, 15_000);
  });

  it("does not charge extra km when within allowance", () => {
    const result = calculatePricing({
      dailyRate: 10_000,
      rentalDays: 1,
      includedKmPerDay: 200,
      extraKmRate: 100,
      startingOdometer: 10_000,
      endingOdometer: 10_150,
    });

    assert.equal(result.extraKm, 0);
    assert.equal(result.extraKmCharge, 0);
    assert.equal(result.finalTotal, 10_000);
  });

  it("scales included km with rental days", () => {
    const result = calculatePricing({
      dailyRate: 10_000,
      rentalDays: 2,
      includedKmPerDay: 200,
      extraKmRate: 100,
      startingOdometer: 0,
      endingOdometer: 450,
    });

    assert.equal(result.includedKm, 400);
    assert.equal(result.extraKm, 50);
    assert.equal(result.extraKmCharge, 5_000);
    assert.equal(result.baseAmount, 20_000);
    assert.equal(result.finalTotal, 25_000);
  });

  it("applies discount without going negative", () => {
    const result = calculatePricing({
      dailyRate: 5_000,
      rentalDays: 1,
      includedKmPerDay: 200,
      extraKmRate: 100,
      discount: 6_000,
    });

    assert.equal(result.finalTotal, 0);
  });

  it("uses 150 km on day 1 and 100 km on each extra day", () => {
    const result = calculatePricing({
      dailyRate: 10_000,
      rentalDays: 3,
      includedKmPerDay: 150,
      includedKmExtraDay: 100,
      extraKmRate: 80,
      startingOdometer: 0,
      endingOdometer: 400,
    });

    assert.equal(result.includedKm, 350);
    assert.equal(result.extraKm, 50);
    assert.equal(result.extraKmCharge, 4_000);
    assert.equal(result.baseAmount, 30_000);
    assert.equal(result.finalTotal, 34_000);
  });
});

describe("calculateBalance", () => {
  it("never returns negative outstanding balance", () => {
    assert.equal(calculateBalance(10_000, 7_500), 2_500);
    assert.equal(calculateBalance(10_000, 12_000), 0);
  });
});

describe("calculateBrokerCommission", () => {
  it("uses per-day and per-extra-km formula, not percentage", () => {
    const result = calculateBrokerCommission({
      brokerId: "broker-1",
      brokerCommissionPerDay: 500,
      brokerCommissionPerExtraKm: 50,
      rentalDays: 3,
      extraKm: 40,
    });

    assert.ok(result);
    assert.equal(result.usesFormula, true);
    assert.equal(result.commissionAmount, 500 * 3 + 50 * 40);
  });

  it("falls back to flat commission when formula rates are zero", () => {
    const result = calculateBrokerCommission({
      brokerId: "broker-1",
      brokerCommissionPerDay: 0,
      brokerCommissionPerExtraKm: 0,
      rentalDays: 2,
      extraKm: 10,
      fallbackFlatCommission: 1_500,
    });

    assert.ok(result);
    assert.equal(result.usesFormula, false);
    assert.equal(result.commissionAmount, 1_500);
  });
});

describe("calculateOwnerSettlement", () => {
  it("computes owner payable from owner rates", () => {
    const result = calculateOwnerSettlement({
      ownershipType: "THIRD_PARTY_OWNED",
      ownerId: "owner-1",
      ownerDailyRate: 8_000,
      ownerExtraKmRate: 80,
      customerDailyRate: 10_000,
      customerExtraKmRate: 100,
      rentalDays: 2,
      extraKm: 50,
      finalTotal: 25_000,
    });

    assert.ok(result);
    assert.equal(result.ownerPayable, 8_000 * 2 + 80 * 50);
    assert.equal(result.companyCommission, (10_000 - 8_000) * 2 + (100 - 80) * 50);
  });

  it("uses flat commission fallback when owner rates are missing", () => {
    const result = calculateOwnerSettlement({
      ownershipType: "THIRD_PARTY_OWNED",
      ownerId: "owner-1",
      ownerDailyRate: null,
      ownerExtraKmRate: null,
      customerDailyRate: 10_000,
      customerExtraKmRate: 100,
      rentalDays: 1,
      extraKm: 0,
      finalTotal: 10_000,
      fallbackFlatCommission: 2_000,
    });

    assert.ok(result);
    assert.equal(result.ownerPayable, 8_000);
    assert.equal(result.companyCommission, 2_000);
  });

  it("creates a settlement when the vehicle has an owner even if marked company-owned", () => {
    const result = calculateOwnerSettlement({
      ownershipType: "COMPANY_OWNED",
      ownerId: "owner-1",
      ownerDailyRate: null,
      ownerExtraKmRate: null,
      customerDailyRate: 12_000,
      customerExtraKmRate: 80,
      rentalDays: 1,
      extraKm: 0,
      finalTotal: 12_000,
      fallbackFlatCommission: 30_000,
    });

    assert.ok(result);
    assert.equal(result.ownerPayable, 12_000);
    assert.equal(result.companyCommission, 0);
  });
});

describe("vehiclePaysAnOwner", () => {
  it("treats linked owners and third-party cars as payable", () => {
    assert.equal(vehiclePaysAnOwner({ ownerId: "owner-1", ownershipType: "COMPANY_OWNED" }), true);
    assert.equal(vehiclePaysAnOwner({ ownerId: null, ownershipType: "THIRD_PARTY_OWNED" }), true);
    assert.equal(vehiclePaysAnOwner({ ownerId: null, ownershipType: "COMPANY_OWNED" }), false);
  });
});

describe("deriveOwnerRatesFromCustomerRates", () => {
  it("computes the company margin from customer minus owner rates", () => {
    const result = deriveOwnerRatesFromCustomerRates({
      customerDailyRate: 6_000,
      customerExtraKmRate: 50,
      ownerDailyRate: 5_000,
      ownerExtraKmRate: 40,
    });
    assert.equal(result.companyDailyMargin, 1_000);
    assert.equal(result.companyExtraKmMargin, 10);
  });
});
