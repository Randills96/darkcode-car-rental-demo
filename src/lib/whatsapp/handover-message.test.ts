import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildHandoverWhatsAppMessage,
  buildHandoverWhatsAppPayload,
} from "./handover-message";

const sample = {
  companyName: "Ready Cabs",
  currencySymbol: "Rs.",
  customerName: "Kasun Perera",
  customerPhone: "0771234567",
  customerWhatsapp: "0771234567",
  bookingNumber: "RK-2026-00001",
  vehicleLabel: "Toyota Aqua (CAA-1234)",
  rentalType: "SELF_DRIVE" as const,
  pickupDate: new Date(2026, 8, 22),
  pickupTime: "10:00",
  returnDate: new Date(2026, 8, 25),
  returnTime: "10:00",
  pickupLocation: "BIA Airport",
  rentalDays: 3,
  dailyRate: 8000,
  estimatedTotal: 24000,
  includedKmPerDay: 150,
  includedKmExtraDay: 100,
  extraKmRate: 80,
  securityDeposit: 20000,
  advancePayment: 5000,
  startingOdometer: 45230,
  startingFuelLevel: "FULL" as const,
};

test("handover WhatsApp message includes pickup, free km, price, extra km and start odo", () => {
  const message = buildHandoverWhatsAppMessage(sample);
  assert.match(message, /Kasun Perera/);
  assert.match(message, /RK-2026-00001/);
  assert.match(message, /Toyota Aqua \(CAA-1234\)/);
  assert.match(message, /10:00/);
  assert.match(message, /BIA Airport/);
  assert.match(message, /45,230 km/);
  assert.match(message, /350 km/);
  assert.match(message, /Day 1: 150 km/);
  assert.match(message, /100 km × 2 extra days/);
  assert.match(message, /Rs\. 8,000\.00 \/ day/);
  assert.match(message, /Rs\. 80\.00 per km/);
  assert.match(message, /Rs\. 20,000\.00/);
  assert.match(message, /Rs\. 5,000\.00/);
  assert.match(message, /Ready Cabs/);
});

test("handover WhatsApp payload opens wa.me for a Sri Lankan mobile number", () => {
  const payload = buildHandoverWhatsAppPayload(sample);
  assert.ok(payload.url);
  assert.match(payload.url ?? "", /^https:\/\/wa\.me\/94771234567\?text=/);
  assert.equal(decodeURIComponent(payload.url!.split("text=")[1]), payload.message);
});
