import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeScannedNic } from "./document-scan";

test("normalizeScannedNic strips spaces and hyphens", () => {
  assert.equal(normalizeScannedNic("1990 1234-5678"), "199012345678");
  assert.equal(normalizeScannedNic("901234567v"), "901234567V");
  assert.equal(normalizeScannedNic("  199612345678  "), "199612345678");
});
