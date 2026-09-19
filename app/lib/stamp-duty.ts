// Indicative working-paper rules from HASiL's 30 June 2026 First Schedule guide.
// Classification, exemptions, relief and the final assessment remain with MyTax/HASiL.
export const STAMP_GUIDE_URL = "https://www.hasil.gov.my/wp-content/uploads/garis-panduan-pengenaan-duti-setem-jadual-pertama-as-1949.pdf";
export const STSDS_URL = "https://www.hasil.gov.my/duti-setem/sistem-taksir-sendiri-duti-setem-stsds/";
export const STAMP_DEADLINE_URL = "https://www.hasil.gov.my/duti-setem/penalti-duti-setem/";
export const STAMP_RULE_VERSION = "HASiL guide · 30 Jun 2026";

export type StampCategory = "lease" | "shares" | "property" | "business-transfer" | "other-transfer" | "security" | "general";
export type StampEntity = "personal" | "business" | "company";
export type StampStatus = "draft" | "submitted" | "stamped";

export type StampRecord = {
  id: string;
  entity: StampEntity;
  title: string;
  category: StampCategory;
  executedAt: string;
  executionPlace: "malaysia" | "overseas";
  receivedInMalaysiaAt?: string;
  annualRent?: number;
  termMonths?: number;
  hasPremium?: boolean;
  consideration?: number;
  assessedValue?: number;
  foreignBuyer?: boolean;
  residential?: boolean;
  generalConfirmed?: boolean;
  status: StampStatus;
  submittedAt?: string;
  paidAt?: string;
  officialDuty?: number;
  certificateReference?: string;
  notes?: string;
  fileName?: string;
  hasEvidence?: boolean;
};

export const STAMP_CATEGORIES: { id: StampCategory; label: string; section: string }[] = [
  { id: "lease", label: "Rent / lease", section: "A · item 49" },
  { id: "shares", label: "Unlisted shares", section: "B · item 32(b)" },
  { id: "property", label: "Real property transfer", section: "C · item 32" },
  { id: "business-transfer", label: "Business transfer", section: "D · item 32" },
  { id: "other-transfer", label: "Other property / rights transfer", section: "E · item 32 / 12(c)" },
  { id: "security", label: "Security / financing", section: "F · various items" },
  { id: "general", label: "General stamping", section: "G · usually RM10" },
];

function dateMs(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? time : null;
}

export function isValidStampDate(value: string): boolean { return dateMs(value) !== null; }

export function stampDeadline(record: Pick<StampRecord, "executedAt" | "executionPlace" | "receivedInMalaysiaAt">): string | null {
  const date = record.executionPlace === "overseas" ? record.receivedInMalaysiaAt : record.executedAt;
  const time = dateMs(date || "");
  return time === null ? null : new Date(time + 30 * 86_400_000).toISOString().slice(0, 10);
}

export function stampRetentionUntil(paidAt: string): string | null {
  const time = dateMs(paidAt);
  if (time === null) return null;
  const date = new Date(time);
  date.setUTCFullYear(date.getUTCFullYear() + 7);
  return date.toISOString().slice(0, 10);
}

function validMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000_000;
}

export function progressiveTransferDuty(value: number): number | null {
  if (!validMoney(value) || value <= 0) return null;
  const bands: [number, number][] = [[100_000, 1], [400_000, 2], [500_000, 3], [Infinity, 4]];
  let remaining = value;
  let duty = 0;
  for (const [width, rate] of bands) {
    const portion = Math.min(remaining, width);
    duty += Math.ceil(portion / 100) * rate;
    remaining -= portion;
    if (remaining <= 0) break;
  }
  return duty;
}

export type StampEstimate = { amount: number | null; provision: string; payer: string; review: string };

export function estimateStampDuty(record: StampRecord): StampEstimate {
  const manual = (provision: string, payer: string, review: string): StampEstimate => ({ amount: null, provision, payer, review });
  if (dateMs(record.executedAt) === null) return manual("First Schedule", "Check Third Schedule", "Enter a valid execution/signing date first.");
  if (record.executedAt < "2026-01-01") return manual("Historical instrument", "Check Third Schedule", "This 2026 working-paper rate table is not applied automatically to pre-2026 instruments. Check the law and relief in force on the signing date.");
  if (record.category === "lease") {
    if (!validMoney(record.annualRent) || record.annualRent <= 0 || !Number.isFinite(record.termMonths) || !record.termMonths || record.termMonths <= 0) {
      return manual("49(a)", "Tenant / lessee (principal instrument)", "Enter average annual rent/other yearly consideration and lease duration.");
    }
    if (record.hasPremium) return manual("49(a) + 49(b)/(c)", "Tenant / lessee (principal instrument)", "A fine or premium may attract additional duty. Obtain a full assessment.");
    const rate = record.termMonths <= 12 ? 1 : record.termMonths <= 36 ? 3 : record.termMonths <= 60 ? 5 : 7;
    return { amount: Math.ceil(record.annualRent / 250) * rate, provision: "49(a)", payer: "Tenant / lessee (principal instrument)", review: "Indicative only; confirm actual annual consideration, term, exemptions and document clauses." };
  }
  if (record.category === "shares") {
    if (!validMoney(record.consideration) || !validMoney(record.assessedValue) || Math.max(record.consideration, record.assessedValue) <= 0) {
      return manual("32(b)", "Buyer / transferee", "Enter both consideration and a supported share valuation (for ordinary shares, assess NTA where applicable).");
    }
    return { amount: Math.ceil(Math.max(record.consideration, record.assessedValue) / 1_000) * 3, provision: "32(b)", payer: "Buyer / transferee", review: "Uses the higher input. Verify NTA, preference-share valuation, relief and the instrument's legal effect." };
  }
  if (record.category === "property") {
    if (!validMoney(record.consideration) || !validMoney(record.assessedValue) || Math.max(record.consideration, record.assessedValue) <= 0) {
      return manual("32(a)/(aa)/(ab)", "Buyer / transferee", "Enter both consideration and market value. Use the higher amount.");
    }
    const base = Math.max(record.consideration, record.assessedValue);
    if (record.foreignBuyer) {
      if (record.residential && record.executedAt >= "2026-01-01") return { amount: Math.ceil(base / 100) * 8, provision: "32(ab)", payer: "Buyer / transferee", review: "2026 foreign-buyer residential rate. Confirm citizenship/PR status, transaction date and exemptions." };
      return { amount: Math.ceil(base / 100) * 4, provision: "32(aa)", payer: "Buyer / transferee", review: "Foreign-buyer rate. Confirm citizenship/PR status, property type and exemptions." };
    }
    return { amount: progressiveTransferDuty(base), provision: "32(a)", payer: "Buyer / transferee", review: "Progressive rate on the higher input. Confirm valuation, exemption/remission and instrument type." };
  }
  if (record.category === "general") {
    if (!record.generalConfirmed) return manual("General stamping", "Signatory / executing party", "Confirm the document does not create a lease, transfer, security or another special charge, and check exemptions.");
    return { amount: 10, provision: "General stamping · usually RM10", payer: "Signatory / executing party", review: "RM10 is a typical fixed duty, not a universal rate. Verify the correct First Schedule item and exemptions." };
  }
  if (record.category === "business-transfer") return manual("32(a)", "Buyer / transferee", "Transfer may include assets, liabilities and goodwill. Obtain transaction-specific valuation and review.");
  if (record.category === "other-transfer") return manual("32 / 12(c)", "Assignee / transferee", "Rights, policies and gifts can follow different items. Review the actual legal effect and valuation.");
  return manual("Various First Schedule items", "Obligor / security provider, as applicable", "Security and financing instruments have different items and possible relief. Do not apply a generic RM10 rate.");
}

export function normalizeStampRecord(value: unknown): StampRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<StampRecord>;
  if (typeof raw.id !== "string" || !raw.id || typeof raw.title !== "string" || !raw.title.trim() || !STAMP_CATEGORIES.some((item) => item.id === raw.category) || !["personal", "business", "company"].includes(raw.entity || "") || !["draft", "submitted", "stamped"].includes(raw.status || "") || dateMs(raw.executedAt || "") === null || !["malaysia", "overseas"].includes(raw.executionPlace || "")) return null;
  const text = (item: unknown, limit: number) => typeof item === "string" ? item.trim().slice(0, limit) : undefined;
  const money = (item: unknown) => validMoney(item) ? Math.round(item * 100) / 100 : undefined;
  return {
    id: raw.id.slice(0, 160), entity: raw.entity!, title: raw.title.trim().slice(0, 160), category: raw.category!, executedAt: raw.executedAt!, executionPlace: raw.executionPlace!,
    receivedInMalaysiaAt: dateMs(raw.receivedInMalaysiaAt || "") === null ? undefined : raw.receivedInMalaysiaAt,
    annualRent: money(raw.annualRent), termMonths: typeof raw.termMonths === "number" && Number.isFinite(raw.termMonths) && raw.termMonths > 0 && raw.termMonths <= 1200 ? raw.termMonths : undefined,
    hasPremium: raw.hasPremium === true, consideration: money(raw.consideration), assessedValue: money(raw.assessedValue), foreignBuyer: raw.foreignBuyer === true, residential: raw.residential === true, generalConfirmed: raw.generalConfirmed === true,
    status: raw.status!, submittedAt: dateMs(raw.submittedAt || "") === null ? undefined : raw.submittedAt,
    paidAt: dateMs(raw.paidAt || "") === null ? undefined : raw.paidAt, officialDuty: money(raw.officialDuty), certificateReference: text(raw.certificateReference, 160), notes: text(raw.notes, 1000), fileName: text(raw.fileName, 240), hasEvidence: raw.hasEvidence === true,
  };
}

export function loadStampRecords(): StampRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem("ams-stamp-duty-v1") || "[]");
    return Array.isArray(raw) ? raw.map(normalizeStampRecord).filter((item): item is StampRecord => item !== null) : [];
  } catch { return []; }
}
