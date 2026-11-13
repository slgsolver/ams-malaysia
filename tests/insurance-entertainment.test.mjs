import assert from "node:assert/strict";
import test from "node:test";

import { insuranceEntertainmentTreatment, isSoleProprietorEntertainment } from "../app/lib/insurance-entertainment.ts";

test("sole proprietor restaurant and entertainment receipts use the insurance workflow", () => {
  assert.equal(isSoleProprietorEntertainment("business", "Food & Beverage"), true);
  assert.equal(isSoleProprietorEntertainment("business", "Entertainment"), true);
  assert.equal(isSoleProprietorEntertainment("company", "Entertainment"), false);
});

test("documented existing-client entertainment is limited to fifty percent", () => {
  assert.deepEqual(insuranceEntertainmentTreatment({ entertainmentPurpose: "existing-client", clientName: "A Client", businessPurpose: "Policy renewal review" }), {
    taxUse: "Business",
    businessUse: 50,
    ready: true,
    needsClient: true,
    needsBusinessPurpose: true,
    label: "Existing client entertainment · 50% deductible",
  });
});

test("existing-client meals stay out of the deduction until documented", () => {
  const result = insuranceEntertainmentTreatment({ entertainmentPurpose: "existing-client", clientName: "", businessPurpose: "Policy review" });
  assert.equal(result.taxUse, "Review");
  assert.equal(result.businessUse, 0);
  assert.equal(result.ready, false);
});

test("potential-client meals are never deducted automatically", () => {
  const result = insuranceEntertainmentTreatment({ entertainmentPurpose: "potential-client", clientName: "Prospect", businessPurpose: "Insurance proposal discussion" });
  assert.equal(result.taxUse, "Review");
  assert.equal(result.businessUse, 0);
});

test("employee meals and sales events qualify for full business treatment when documented", () => {
  assert.equal(insuranceEntertainmentTreatment({ entertainmentPurpose: "employee-meal", businessPurpose: "Staff annual dinner" }).businessUse, 100);
  assert.equal(insuranceEntertainmentTreatment({ entertainmentPurpose: "sales-event", businessPurpose: "Public insurance product launch" }).businessUse, 100);
});

test("private owner meals are non-deductible", () => {
  const result = insuranceEntertainmentTreatment({ entertainmentPurpose: "private-meal" });
  assert.equal(result.taxUse, "Personal");
  assert.equal(result.businessUse, 0);
  assert.equal(result.ready, true);
});
