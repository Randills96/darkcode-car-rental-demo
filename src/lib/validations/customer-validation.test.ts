import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, normalizeNic, phoneRegex, nicRegex } from "@/lib/utils";
import { customerFormSchema } from "@/lib/validations/customer";

test("normalizePhone handles Sri Lankan and international numbers", () => {
  assert.equal(normalizePhone("077 123 4567"), "0771234567");
  assert.equal(normalizePhone("+94 77 123 4567"), "0771234567");
  assert.equal(normalizePhone("+94771234567"), "0771234567");
  assert.equal(normalizePhone("0094771234567"), "0771234567");
  assert.equal(normalizePhone("94771234567"), "0771234567");
  assert.equal(normalizePhone("077-123-4567"), "0771234567");
  assert.equal(normalizePhone("  0771234567  "), "0771234567");
  assert.equal(normalizePhone("771234567"), "0771234567");
  assert.equal(normalizePhone("+447911123456"), "+447911123456");
  assert.equal(normalizePhone("+14155552671"), "+14155552671");
  assert.equal(normalizePhone(""), "");
  assert.equal(normalizePhone(null), "");
  assert.equal(normalizePhone(undefined), "");
});

test("normalizeNic trims and uppercases NIC and passport values", () => {
  assert.equal(normalizeNic(" 199012345678 "), "199012345678");
  assert.equal(normalizeNic("901234567v"), "901234567V");
  assert.equal(normalizeNic("901234567x"), "901234567X");
  assert.equal(normalizeNic("n 1234567"), "N1234567");
  assert.equal(normalizeNic(""), "");
});

test("phoneRegex matches valid normalized phone numbers", () => {
  assert.ok(phoneRegex.test("0771234567"));
  assert.ok(phoneRegex.test("0112345678"));
  assert.ok(phoneRegex.test("+447911123456"));
  assert.ok(phoneRegex.test("+14155552671"));
  assert.equal(phoneRegex.test("123"), false);
  assert.equal(phoneRegex.test("abcdefghij"), false);
});

test("nicRegex matches old NIC, new NIC, and passports", () => {
  assert.ok(nicRegex.test("199012345678"));
  assert.ok(nicRegex.test("901234567V"));
  assert.ok(nicRegex.test("901234567X"));
  assert.ok(nicRegex.test("N1234567"));
  assert.equal(nicRegex.test("123"), false);
});

test("customerFormSchema validates inputs with spaces and Sri Lankan prefixes", () => {
  const result = customerFormSchema.safeParse({
    fullName: "  John Doe  ",
    nic: " 199012345678 ",
    passportNumber: " N1234567 ",
    phone: " +94 77 123 4567 ",
    whatsapp: " 077-987-6543 ",
    address: "  No 123, Main Street, Colombo 03  ",
    drivingLicenceNumber: " B1234567 ",
    drivingLicenceExpiry: "2030-01-01",
    emergencyContact: " 071 000 1111 ",
    notes: "  Special customer notes  ",
  });

  assert.ok(result.success);
  if (result.success) {
    assert.equal(normalizeNic(result.data.nic), "199012345678");
    assert.equal(normalizePhone(result.data.phone), "0771234567");
    assert.equal(normalizePhone(result.data.whatsapp), "0779876543");
    assert.equal(normalizePhone(result.data.emergencyContact), "0710001111");
  }
});
