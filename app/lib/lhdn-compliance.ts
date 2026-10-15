export type LhdnEntity = "personal" | "business" | "company";

export type ComplianceStatus = "required" | "not-currently-required" | "review";

export type ComplianceRule = {
  id: "return" | "mitrs" | "records" | "tax-estimate";
  status: ComplianceStatus;
  sourceKey: keyof typeof LHDN_SOURCES;
};

export type MyInvoisAssessmentCode =
  | "turnover-needed"
  | "related-entity-review"
  | "potential-exemption"
  | "required-2026"
  | "required-2025-july"
  | "required-2025-january"
  | "required-2024";

export const LHDN_RULES_AS_OF = "2026-10-15";
export const LHDN_MITRS_PAGE_UPDATED = "2026-10-13";
export const MYINVOIS_TIMELINE_UPDATED = "2026-08-30";

export const LHDN_SOURCES = {
  individualFaq: {
    title: "HASiL individual FAQ",
    url: "https://www.hasil.gov.my/individu/soalan-lazim-individu/",
  },
  corporateTax: {
    title: "HASiL corporate tax",
    url: "https://www.hasil.gov.my/syarikat/cukai-korporat/",
  },
  companyEstimate: {
    title: "HASiL company tax estimate",
    url: "https://www.hasil.gov.my/syarikat/anggaran-cukai/",
  },
  mitrs2026: {
    title: "HASiL MITRS YA 2026",
    url: "https://www.hasil.gov.my/borang/program-memfail-dokumen-yang-ditentukan-di-bawah-seksyen-82b-acp-1967-melalui-mitrs/tahun-taksiran-2026/",
  },
  eInvoiceTimeline: {
    title: "HASiL e-Invoice implementation timeline",
    url: "https://www.hasil.gov.my/en/e-invois/pelaksanaan-e-invois-di-malaysia/garis-masa-pelaksanaan-e-invois/",
  },
  eInvoiceFaq: {
    title: "HASiL e-Invoice general FAQ",
    url: "https://www.hasil.gov.my/media/0xqitc2t/lhdnm-e-invoice-general-faqs.pdf",
  },
} as const;

export function getComplianceProfile(entity: LhdnEntity): ComplianceRule[] {
  if (entity === "company") {
    return [
      { id: "return", status: "required", sourceKey: "corporateTax" },
      { id: "mitrs", status: "required", sourceKey: "mitrs2026" },
      { id: "records", status: "required", sourceKey: "corporateTax" },
      { id: "tax-estimate", status: "required", sourceKey: "companyEstimate" },
    ];
  }

  return [
    { id: "return", status: "required", sourceKey: "individualFaq" },
    { id: "mitrs", status: "not-currently-required", sourceKey: "mitrs2026" },
    { id: "records", status: "required", sourceKey: "individualFaq" },
    { id: "tax-estimate", status: "review", sourceKey: "individualFaq" },
  ];
}

export function assessMyInvois(turnover: number | null, hasRelatedEntity: boolean): MyInvoisAssessmentCode {
  if (turnover === null || !Number.isFinite(turnover) || turnover < 0) return "turnover-needed";
  if (hasRelatedEntity) return "related-entity-review";
  if (turnover < 3_000_000) return "potential-exemption";
  if (turnover <= 5_000_000) return "required-2026";
  if (turnover <= 25_000_000) return "required-2025-july";
  if (turnover <= 100_000_000) return "required-2025-january";
  return "required-2024";
}

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addCalendarMonths(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number);
  const targetMonthStart = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth() + 1, 0)).getUTCDate();
  targetMonthStart.setUTCDate(Math.min(day, lastDay));
  return targetMonthStart;
}

export function calculateCompanyDeadlines(accountingClose: string) {
  if (!validIsoDate(accountingClose)) return null;
  const formCDue = addCalendarMonths(accountingClose, 7);
  const mitrsDue = new Date(formCDue);
  mitrsDue.setUTCDate(mitrsDue.getUTCDate() + 30);
  return { formCDue: toIso(formCDue), mitrsDue: toIso(mitrsDue) };
}

export function retentionUntil(filingYear: number) {
  if (!Number.isInteger(filingYear) || filingYear < 1967 || filingYear > 9992) return null;
  return `${filingYear + 7}-12-31`;
}
