import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDepositRefundUiState,
  remainingDepositAmount,
  resolveDepositStatus,
} from "./security-deposit";
import { VALID_STATUS_TRANSITIONS } from "./rental";
import { formatCurrency, setDefaultCurrencySymbol } from "../utils";

describe("rental cancel transitions", () => {
  it("allows cancel from operational statuses but not after return or completion", () => {
    assert.equal(VALID_STATUS_TRANSITIONS.INQUIRY.includes("CANCELLED"), true);
    assert.equal(VALID_STATUS_TRANSITIONS.QUOTED.includes("CANCELLED"), true);
    assert.equal(VALID_STATUS_TRANSITIONS.CONFIRMED.includes("CANCELLED"), true);
    assert.equal(VALID_STATUS_TRANSITIONS.ACTIVE.includes("CANCELLED"), true);
    assert.equal(VALID_STATUS_TRANSITIONS.RETURNED.includes("CANCELLED"), false);
    assert.equal(VALID_STATUS_TRANSITIONS.COMPLETED.includes("CANCELLED"), false);
  });
});

describe("security deposit remaining", () => {
  it("subtracts refunded and retained amounts and never goes negative", () => {
    assert.equal(
      remainingDepositAmount({ depositAmount: 50000, refundAmount: 20000, amountRetained: 5000 }),
      25000
    );
    assert.equal(
      remainingDepositAmount({ depositAmount: 50000, refundAmount: 50000, amountRetained: 0 }),
      0
    );
    assert.equal(
      remainingDepositAmount({ depositAmount: 10000, refundAmount: 12000, amountRetained: 0 }),
      0
    );
  });

  it("marks a fully refunded deposit as settled in the UI state", () => {
    const state = getDepositRefundUiState([
      { status: "REFUNDED", depositAmount: 50000, refundAmount: 50000, amountRetained: 0 },
    ]);
    assert.equal(state.hasActive, false);
    assert.equal(state.isFullySettled, true);
    assert.equal(resolveDepositStatus(50000, 50000, 0), "REFUNDED");
  });
});

describe("currency display", () => {
  it("uses the supplied settings symbol without changing the numeric amount", () => {
    setDefaultCurrencySymbol("Rs.");
    assert.equal(formatCurrency(1500), "Rs. 1,500.00");
    assert.equal(formatCurrency(1500, "LKR"), "LKR 1,500.00");
    setDefaultCurrencySymbol("Rs.");
  });
});
