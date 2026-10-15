import test from "node:test";
import assert from "node:assert/strict";
import {
  assessMyInvois,
  calculateCompanyDeadlines,
  getComplianceProfile,
  retentionUntil,
} from "../app/lib/lhdn-compliance.ts";

test("YA 2026 MITRS applies to company Form C but is not listed for ordinary Form B or BE", () => {
  assert.equal(getComplianceProfile("company").find((rule) => rule.id === "mitrs")?.status, "required");
  assert.equal(getComplianceProfile("business").find((rule) => rule.id === "mitrs")?.status, "not-currently-required");
  assert.equal(getComplianceProfile("personal").find((rule) => rule.id === "mitrs")?.status, "not-currently-required");
});

test("company profile includes Form C, CP204, MITRS and seven-year records", () => {
  const profile = getComplianceProfile("company");
  assert.deepEqual(profile.map((rule) => rule.id), ["return", "mitrs", "records", "tax-estimate"]);
  assert.ok(profile.every((rule) => rule.status === "required"));
});

test("MyInvois assessment keeps the sub-RM3m result conditional", () => {
  assert.equal(assessMyInvois(2_999_999.99, false), "potential-exemption");
  assert.equal(assessMyInvois(3_000_000, false), "required-2026");
  assert.equal(assessMyInvois(1_000_000, true), "related-entity-review");
  assert.equal(assessMyInvois(null, false), "turnover-needed");
});

test("company deadline calculator applies seven months then 30 calendar days", () => {
  assert.deepEqual(calculateCompanyDeadlines("2026-12-31"), { formCDue: "2027-07-31", mitrsDue: "2027-08-30" });
  assert.deepEqual(calculateCompanyDeadlines("2026-06-30"), { formCDue: "2027-01-30", mitrsDue: "2027-03-01" });
  assert.equal(calculateCompanyDeadlines("2026-02-30"), null);
});

test("seven-year retention runs from the end of filing year", () => {
  assert.equal(retentionUntil(2027), "2034-12-31");
  assert.equal(retentionUntil(0), null);
});
