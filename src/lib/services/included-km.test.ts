import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateIncludedKmAllowance,
  describeIncludedKmPolicy,
  exampleIncludedKmPolicy,
} from "./included-km";

test("one-day hire uses only the day-1 allowance", () => {
  assert.equal(calculateIncludedKmAllowance(1, 150, 100), 150);
});

test("three-day hire is 150 + 100 + 100", () => {
  assert.equal(calculateIncludedKmAllowance(3, 150, 100), 350);
});

test("falls back to a flat per-day allowance when extra-day km is omitted", () => {
  assert.equal(calculateIncludedKmAllowance(3, 200), 600);
});

test("describes the stepped policy in plain language", () => {
  assert.equal(describeIncludedKmPolicy(1, 150, 100), "150 km free on day 1");
  assert.match(describeIncludedKmPolicy(3, 150, 100), /Day 1: 150 km/);
  assert.match(describeIncludedKmPolicy(3, 150, 100), /350 km total/);
  assert.equal(describeIncludedKmPolicy(2, 200, 200), "200 km/day × 2 days = 400 km");
});

test("example text matches the company 150/100 policy", () => {
  assert.match(exampleIncludedKmPolicy(150, 100), /1 day = 150 km/);
  assert.match(exampleIncludedKmPolicy(150, 100), /3 days = 350 km/);
});
