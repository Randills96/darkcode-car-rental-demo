import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, addYears, subDays } from "date-fns";
import {
  addAnnualSubscriptionPeriod,
  formatAnnualFeePaymentMessage,
  isAnnualFeeRole,
  isInAnnualFeeReminderWindow,
  isSubscriptionExpired,
  subscriptionFieldsForRole,
  wasNotifiedForCurrentCycle,
} from "./user-subscription";

describe("annual user subscription", () => {
  it("only Manager and Staff pay the annual fee", () => {
    assert.equal(isAnnualFeeRole("ADMIN"), true);
    assert.equal(isAnnualFeeRole("EMPLOYEE"), true);
    assert.equal(isAnnualFeeRole("SUPER_ADMIN"), false);
    assert.equal(isAnnualFeeRole("DRIVER"), false);
  });

  it("starts a one-year term for Manager and Staff", () => {
    const from = new Date("2026-09-19T00:00:00.000Z");
    const fields = subscriptionFieldsForRole("ADMIN", from);
    assert.equal(fields.subscriptionExpiresAt?.toISOString(), addYears(from, 1).toISOString());
    assert.equal(fields.annualFeeNotifiedAt, null);
    assert.equal(subscriptionFieldsForRole("SUPER_ADMIN", from).subscriptionExpiresAt, null);
  });

  it("does not deactivate Super Admin even if an expiry date exists", () => {
    const now = new Date("2027-09-19T00:00:00.000Z");
    assert.equal(isSubscriptionExpired("SUPER_ADMIN", subDays(now, 1), now), false);
    assert.equal(isSubscriptionExpired("ADMIN", subDays(now, 1), now), true);
    assert.equal(isSubscriptionExpired("EMPLOYEE", now, now), true);
    assert.equal(isSubscriptionExpired("ADMIN", addDays(now, 1), now), false);
  });

  it("reminds 7 days before expiry and not after", () => {
    const now = new Date("2027-09-12T08:00:00.000Z");
    const expiresAt = addDays(now, 7);
    assert.equal(isInAnnualFeeReminderWindow("EMPLOYEE", expiresAt, now), true);
    assert.equal(isInAnnualFeeReminderWindow("ADMIN", addDays(now, 8), now), false);
    assert.equal(isInAnnualFeeReminderWindow("ADMIN", subDays(now, 1), now), false);
    assert.equal(isInAnnualFeeReminderWindow("SUPER_ADMIN", expiresAt, now), false);
  });

  it("treats a reminder in the current 7-day window as already sent", () => {
    const expiresAt = new Date("2027-09-19T00:00:00.000Z");
    assert.equal(wasNotifiedForCurrentCycle(addDays(expiresAt, -7), expiresAt), true);
    assert.equal(wasNotifiedForCurrentCycle(addDays(expiresAt, -8), expiresAt), false);
    assert.equal(wasNotifiedForCurrentCycle(null, expiresAt), false);
  });

  it("includes bank details in the payment reminder", () => {
    const message = formatAnnualFeePaymentMessage({
      amount: 25000,
      currencySymbol: "Rs.",
      bankName: "Bank of Ceylon",
      bankAccountName: "Ready Cabs",
      bankAccountNumber: "1234567890",
      bankBranch: "Colombo",
      expiresAt: addAnnualSubscriptionPeriod(new Date("2026-09-19T00:00:00.000Z")),
    });
    assert.match(message, /Rs\.\s*25,000\.00/);
    assert.match(message, /Bank of Ceylon/);
    assert.match(message, /1234567890/);
    assert.match(message, /Super Admin can activate/);
  });
});
