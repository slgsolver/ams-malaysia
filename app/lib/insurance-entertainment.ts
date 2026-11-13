export const insuranceEntertainmentPurposes = [
  "existing-client",
  "potential-client",
  "employee-meal",
  "sales-event",
  "private-meal",
] as const;

export type InsuranceEntertainmentPurpose = typeof insuranceEntertainmentPurposes[number];

export type InsuranceEntertainmentTreatment = {
  taxUse: "Business" | "Personal" | "Review";
  businessUse: number;
  ready: boolean;
  needsClient: boolean;
  needsBusinessPurpose: boolean;
  label: string;
};

const purposeValues = new Set<string>(insuranceEntertainmentPurposes);

export function normalizeInsuranceEntertainmentPurpose(value: unknown): InsuranceEntertainmentPurpose | undefined {
  return typeof value === "string" && purposeValues.has(value) ? value as InsuranceEntertainmentPurpose : undefined;
}

export function isSoleProprietorEntertainment(entity: string, category: string) {
  return entity === "business" && (category === "Food & Beverage" || category === "Entertainment");
}

export function insuranceEntertainmentTreatment(value: {
  entertainmentPurpose?: unknown;
  clientName?: unknown;
  businessPurpose?: unknown;
}): InsuranceEntertainmentTreatment {
  const purpose = normalizeInsuranceEntertainmentPurpose(value.entertainmentPurpose);
  const clientName = typeof value.clientName === "string" ? value.clientName.trim() : "";
  const businessPurpose = typeof value.businessPurpose === "string" ? value.businessPurpose.trim() : "";

  if (purpose === "private-meal") {
    return { taxUse: "Personal", businessUse: 0, ready: true, needsClient: false, needsBusinessPurpose: false, label: "Private / owner meal · 0% deductible" };
  }
  if (purpose === "potential-client") {
    return { taxUse: "Review", businessUse: 0, ready: false, needsClient: true, needsBusinessPurpose: true, label: "Potential client · Review required · no automatic deduction" };
  }
  if (purpose === "existing-client") {
    const ready = Boolean(clientName && businessPurpose);
    return ready
      ? { taxUse: "Business", businessUse: 50, ready: true, needsClient: true, needsBusinessPurpose: true, label: "Existing client entertainment · 50% deductible" }
      : { taxUse: "Review", businessUse: 0, ready: false, needsClient: true, needsBusinessPurpose: true, label: "Add the client and business purpose · kept in Review" };
  }
  if (purpose === "employee-meal") {
    const ready = Boolean(businessPurpose);
    return ready
      ? { taxUse: "Business", businessUse: 100, ready: true, needsClient: false, needsBusinessPurpose: true, label: "Employee meal / welfare · 100% deductible" }
      : { taxUse: "Review", businessUse: 0, ready: false, needsClient: false, needsBusinessPurpose: true, label: "Add the employee event purpose · kept in Review" };
  }
  if (purpose === "sales-event") {
    const ready = Boolean(businessPurpose);
    return ready
      ? { taxUse: "Business", businessUse: 100, ready: true, needsClient: false, needsBusinessPurpose: true, label: "Sales launch / public promotion · 100% deductible" }
      : { taxUse: "Review", businessUse: 0, ready: false, needsClient: false, needsBusinessPurpose: true, label: "Add the sales-event purpose · kept in Review" };
  }
  return { taxUse: "Review", businessUse: 0, ready: false, needsClient: false, needsBusinessPurpose: false, label: "Select the meal purpose · no automatic deduction" };
}
