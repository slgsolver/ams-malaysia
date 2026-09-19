import assert from "node:assert/strict";
import test from "node:test";
import { estimateStampDuty, isValidStampDate, normalizeStampRecord, progressiveTransferDuty, stampDeadline, stampRetentionUntil } from "../app/lib/stamp-duty.ts";

const base = { id: "x", entity: "company", title: "Test agreement", category: "lease", executedAt: "2026-09-19", executionPlace: "malaysia", status: "draft" };

test("lease item 49(a) rounds each RM250 and uses the term band", () => {
  assert.equal(estimateStampDuty({ ...base, annualRent: 14400, termMonths: 12 }).amount, 58);
  assert.equal(estimateStampDuty({ ...base, annualRent: 14400, termMonths: 24 }).amount, 174);
  assert.equal(estimateStampDuty({ ...base, annualRent: 14400, termMonths: 48 }).amount, 290);
  assert.equal(estimateStampDuty({ ...base, annualRent: 14400, termMonths: 72 }).amount, 406);
  assert.equal(estimateStampDuty({ ...base, annualRent: 250.01, termMonths: 12 }).amount, 2);
});

test("lease premium stops automatic calculation", () => {
  assert.equal(estimateStampDuty({ ...base, annualRent: 14400, termMonths: 24, hasPremium: true }).amount, null);
});

test("unlisted share duty uses higher supported amount and RM1,000 fractions", () => {
  assert.equal(estimateStampDuty({ ...base, category: "shares", consideration: 1000, assessedValue: 1000.01 }).amount, 6);
  assert.equal(estimateStampDuty({ ...base, category: "shares", consideration: 3000, assessedValue: 2000 }).amount, 9);
  assert.equal(estimateStampDuty({ ...base, category: "shares", consideration: 3000 }).amount, null);
});

test("property progressive bands round each RM100 fraction", () => {
  assert.equal(progressiveTransferDuty(100000), 1000);
  assert.equal(progressiveTransferDuty(100000.01), 1002);
  assert.equal(progressiveTransferDuty(500000), 9000);
  assert.equal(progressiveTransferDuty(1000000), 24000);
  assert.equal(progressiveTransferDuty(1000000.01), 24004);
  assert.equal(progressiveTransferDuty(-1), null);
});

test("property uses higher value and 2026 foreign-buyer rate when applicable", () => {
  assert.equal(estimateStampDuty({ ...base, category: "property", consideration: 450000, assessedValue: 500000 }).amount, 9000);
  assert.equal(estimateStampDuty({ ...base, category: "property", consideration: 450000, assessedValue: 500000, foreignBuyer: true }).amount, 20000);
  assert.equal(estimateStampDuty({ ...base, category: "property", consideration: 450000, assessedValue: 500000, foreignBuyer: true, residential: true }).amount, 40000);
});

test("general stamping needs explicit legal-effect review and is only indicative", () => {
  assert.equal(estimateStampDuty({ ...base, category: "general" }).amount, null);
  assert.equal(estimateStampDuty({ ...base, category: "general", generalConfirmed: true }).amount, 10);
  assert.equal(estimateStampDuty({ ...base, category: "security", generalConfirmed: true }).amount, null);
});

test("complex transfers and pre-2026 instruments stay in manual review", () => {
  for (const category of ["business-transfer", "other-transfer", "security"]) assert.equal(estimateStampDuty({ ...base, category }).amount, null);
  assert.equal(estimateStampDuty({ ...base, executedAt: "2025-12-31", annualRent: 14400, termMonths: 12 }).amount, null);
});

test("30-day deadline uses Malaysia signing or first receipt date", () => {
  assert.equal(stampDeadline(base), "2026-10-19");
  assert.equal(stampDeadline({ ...base, executionPlace: "overseas" }), null);
  assert.equal(stampDeadline({ ...base, executionPlace: "overseas", receivedInMalaysiaAt: "2026-10-01" }), "2026-10-31");
  assert.equal(stampDeadline({ ...base, executedAt: "2026-02-30" }), null);
});

test("retention runs seven years from duty payment and invalid dates are rejected", () => {
  assert.equal(stampRetentionUntil("2026-09-19"), "2033-09-19");
  assert.equal(stampRetentionUntil("2026-02-30"), null);
  assert.equal(isValidStampDate("2026-02-30"), false);
  assert.equal(normalizeStampRecord({ ...base, executedAt: "2026-02-30" }), null);
});
