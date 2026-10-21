import test from "node:test";
import assert from "node:assert/strict";
import {
  addWarrantyDuration,
  isValidWarranty,
  itemFingerprint,
  parseReceiptDate,
} from "./warranty.js";

test("warranty duration clamps month ends and handles leap years", () => {
  assert.equal(addWarrantyDuration("2025-01-31", 1, "months"), "2025-02-28");
  assert.equal(addWarrantyDuration("2024-01-31", 1, "months"), "2024-02-29");
  assert.equal(addWarrantyDuration("2025-04-05", 2, "years"), "2027-04-05");
});

test("receipt date parsing defaults ambiguous values to day/month", () => {
  assert.equal(parseReceiptDate("05/04/2025"), "2025-04-05");
  assert.equal(parseReceiptDate("13/04/2025"), "2025-04-13");
  assert.equal(parseReceiptDate("04/13/2025"), "2025-04-13");
  assert.equal(parseReceiptDate("31/02/2025"), null);
});

test("backup duplicate key ignores casing and surrounding spaces", () => {
  assert.equal(
    itemFingerprint({ name: "  Studio Display ", purchase_date: "2025-02-01" }),
    itemFingerprint({ name: "studio display", purchase_date: "2025-02-01" }),
  );
});

test("warranty validation rejects incomplete or reversed dates", () => {
  assert.equal(
    isValidWarranty({
      name: "Camera",
      purchase_date: "2025-02-02",
      warranty_end: "2026-02-02",
    }),
    true,
  );
  assert.equal(
    isValidWarranty({
      name: "Camera",
      purchase_date: "2025-02-02",
      warranty_end: "2024-02-02",
    }),
    false,
  );
  assert.equal(
    isValidWarranty({
      name: "Camera",
      purchase_date: "2025-02-30",
      warranty_end: "2026-02-02",
    }),
    false,
  );
  assert.equal(
    isValidWarranty({
      name: "Camera",
      purchase_date: "2025-02-02",
      warranty_end: "2025-02-02",
    }),
    false,
  );
  assert.equal(
    isValidWarranty({
      name: "  ",
      purchase_date: "2025-02-02",
      warranty_end: "2026-02-02",
    }),
    false,
  );
});
