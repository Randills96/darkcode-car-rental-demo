import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessRoute,
  canManageAnnualAccountFee,
  hasPermission,
} from "./index";
import {
  canAccessHireReceipt,
  canAccessHireRecordPages,
  canAccessSettlementReceipt,
  canCancelRental,
  isDriverRole,
} from "../auth/driver-access";

describe("role permissions", () => {
  it("blocks Employee from cancelling rentals", () => {
    assert.equal(hasPermission("EMPLOYEE", "rentals.cancel"), false);
    assert.equal(canCancelRental("EMPLOYEE"), false);
    assert.equal(hasPermission("ADMIN", "rentals.cancel"), true);
    assert.equal(hasPermission("SUPER_ADMIN", "rentals.cancel"), true);
  });

  it("gives Employee expense create/view but not edit/delete", () => {
    assert.equal(hasPermission("EMPLOYEE", "expenses.view"), true);
    assert.equal(hasPermission("EMPLOYEE", "expenses.create"), true);
    assert.equal(hasPermission("EMPLOYEE", "expenses.edit"), false);
    assert.equal(hasPermission("EMPLOYEE", "expenses.delete"), false);
  });

  it("gives company administrators expense edit and delete", () => {
    assert.equal(hasPermission("ADMIN", "expenses.edit"), true);
    assert.equal(hasPermission("ADMIN", "expenses.delete"), true);
    assert.equal(hasPermission("SUPER_ADMIN", "expenses.edit"), true);
    assert.equal(hasPermission("SUPER_ADMIN", "expenses.delete"), true);
  });

  it("does not let DRIVER open hire receipts or settlement PDFs", () => {
    assert.equal(isDriverRole("DRIVER"), true);
    assert.equal(hasPermission("DRIVER", "rentals.receipt"), false);
    assert.equal(canAccessHireReceipt("DRIVER"), false);
    assert.equal(canAccessHireReceipt("EMPLOYEE"), true);
    assert.equal(canAccessSettlementReceipt("DRIVER"), false);
    assert.equal(canAccessSettlementReceipt("ADMIN"), true);
  });

  it("lets Employee open Settings to change their password but not company settings", () => {
    assert.equal(hasPermission("EMPLOYEE", "settings.view"), true);
    assert.equal(hasPermission("EMPLOYEE", "settings.edit"), false);
    assert.equal(canAccessRoute("EMPLOYEE", "/settings"), true);
    assert.equal(hasPermission("ADMIN", "settings.view"), true);
    assert.equal(hasPermission("ADMIN", "settings.edit"), true);
  });

  it("keeps annual account fee settings Super Admin only", () => {
    assert.equal(canManageAnnualAccountFee("SUPER_ADMIN"), true);
    assert.equal(canManageAnnualAccountFee("ADMIN"), false);
    assert.equal(canManageAnnualAccountFee("EMPLOYEE"), false);
    assert.equal(canManageAnnualAccountFee("DRIVER"), false);
  });

  it("blocks DRIVER from hire record URLs while keeping the rentals list", () => {
    assert.equal(canAccessHireRecordPages("DRIVER"), false);
    assert.equal(canAccessHireRecordPages("EMPLOYEE"), true);
    assert.equal(canAccessRoute("DRIVER", "/rentals"), true);
    assert.equal(canAccessRoute("DRIVER", "/rentals/abc123"), false);
    assert.equal(canAccessRoute("DRIVER", "/rentals/abc123/receipt"), false);
    assert.equal(canAccessRoute("EMPLOYEE", "/rentals/abc123/receipt"), true);
  });
});
