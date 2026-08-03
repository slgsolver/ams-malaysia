"use client";

import {
  AlertCircle,
  Archive,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CarFront,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  FileUp,
  FileCheck2,
  FileText,
  Fuel,
  Gauge,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  Landmark,
  Languages,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  ScanLine,
  Save,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  UtensilsCrossed,
  WalletCards,
  Wifi,
  X,
} from "lucide-react";
import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import CompanyAccounting, { CompanyAccountingView } from "./components/company-accounting";
import { balanceSheet, cashFlowStatement, chartOfAccounts, profitAndLoss, sanitizeJournalEntries, seedJournalEntries, seedSoleProprietorJournalEntries, soleProprietorChartOfAccounts, taxComputation } from "./lib/accounting";
import type { AccountingReceipt, JournalEntry } from "./lib/accounting";
import { translateToChinese } from "./i18n";

type Entity = "personal" | "business" | "company";
type Category = "Food & Beverage" | "Stationery" | "Petrol" | "Toll Fee" | "Mobile" | "Entertainment" | "Office Rent" | "Software & Subscriptions" | "Professional Fees" | "Advertising & Marketing" | "Utilities" | "Medical" | "Lifestyle" | "Education" | "Insurance" | "EPF & SOCSO" | "Zakat" | "Others";
type Receipt = {
  id: string;
  entity: Entity;
  merchant: string;
  date: string;
  amount: number;
  category: Category;
  taxUse: "Business" | "Relief" | "Personal" | "Review";
  businessUse: number;
  businessPurpose?: string;
  myInvoisUuid?: string;
  confidence: number;
  fileName?: string;
  paymentAccountCode?: string;
};

const categoryMeta: Record<Category, { icon: typeof Fuel; tone: string }> = {
  "Food & Beverage": { icon: UtensilsCrossed, tone: "coral" },
  Stationery: { icon: Pencil, tone: "blue" },
  Petrol: { icon: Fuel, tone: "amber" },
  "Toll Fee": { icon: CarFront, tone: "violet" },
  Mobile: { icon: Phone, tone: "green" },
  Entertainment: { icon: Ticket, tone: "pink" },
  "Office Rent": { icon: BriefcaseBusiness, tone: "violet" },
  "Software & Subscriptions": { icon: Wifi, tone: "green" },
  "Professional Fees": { icon: FileText, tone: "blue" },
  "Advertising & Marketing": { icon: TrendingUp, tone: "coral" },
  Utilities: { icon: Gauge, tone: "amber" },
  Medical: { icon: HeartPulse, tone: "coral" },
  Lifestyle: { icon: Ticket, tone: "violet" },
  Education: { icon: GraduationCap, tone: "blue" },
  Insurance: { icon: ShieldCheck, tone: "green" },
  "EPF & SOCSO": { icon: WalletCards, tone: "amber" },
  Zakat: { icon: BadgeCheck, tone: "green" },
  Others: { icon: MoreHorizontal, tone: "slate" },
};

const categoryValues = new Set<Category>(Object.keys(categoryMeta) as Category[]);
const entityValues = new Set<Entity>(["personal", "business", "company"]);
const taxUseValues = new Set<Receipt["taxUse"]>(["Business", "Relief", "Personal", "Review"]);

function shortText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeReceipt(value: unknown): Receipt | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Receipt>;
  const id = shortText(item.id, 160);
  const merchant = shortText(item.merchant, 160);
  const date = shortText(item.date, 40);
  const amount = Number(item.amount);
  const businessUse = Number(item.businessUse);
  const confidence = Number(item.confidence);
  if (!id || !merchant || !date || !Number.isFinite(amount) || amount <= 0 || amount > 999_999_999.99) return null;
  if (!item.entity || !entityValues.has(item.entity) || !item.category || !categoryValues.has(item.category) || !item.taxUse || !taxUseValues.has(item.taxUse)) return null;
  if (item.entity === "personal" && item.taxUse === "Business") return null;
  if (item.entity !== "personal" && item.taxUse === "Relief") return null;
  return {
    id,
    entity: item.entity,
    merchant,
    date,
    amount: Math.round(amount * 100) / 100,
    category: item.category,
    taxUse: item.taxUse,
    businessUse: Number.isFinite(businessUse) ? Math.max(0, Math.min(100, businessUse)) : 0,
    businessPurpose: shortText(item.businessPurpose, 500) || undefined,
    myInvoisUuid: shortText(item.myInvoisUuid, 160) || undefined,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : 0,
    fileName: shortText(item.fileName, 240) || undefined,
    paymentAccountCode: item.entity === "company" && ["1000", "1010", "2000", "2600"].includes(shortText(item.paymentAccountCode, 4)) ? shortText(item.paymentAccountCode, 4) : item.entity === "business" && ["1000", "1010", "2000", "3000"].includes(shortText(item.paymentAccountCode, 4)) ? shortText(item.paymentAccountCode, 4) : item.entity === "personal" ? undefined : "1010",
  };
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function normalizedHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function moneyValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.abs(value) : 0;
  const text = String(value ?? "").trim();
  const negative = /^\(.*\)$/.test(text) || /^-/.test(text);
  const amount = Number(text.replace(/[()RM$\s]/gi, "").replaceAll(",", ""));
  return Number.isFinite(amount) ? Math.abs(negative ? -amount : amount) : 0;
}

function displayDate(value: unknown) {
  const text = shortText(value, 40);
  if (!text) return new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
  if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.valueOf()) ? text : new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(parsed);
}

function isoDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "" : new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kuala_Lumpur" }).format(parsed);
}

function extractReceiptDate(text: string) {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const malaysia = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (malaysia) return `${malaysia[3]}-${malaysia[2].padStart(2, "0")}-${malaysia[1].padStart(2, "0")}`;
  return "";
}

const seedReceipts: Receipt[] = [
  { id: "1", entity: "company", merchant: "PETRONAS Station", date: "28 Jul 2026", amount: 120.5, category: "Petrol", taxUse: "Business", businessUse: 80, businessPurpose: "Client visit — Petaling Jaya", myInvoisUuid: "EI-98F2-71A0", confidence: 98 },
  { id: "2", entity: "company", merchant: "Touch 'n Go eWallet", date: "27 Jul 2026", amount: 36.8, category: "Toll Fee", taxUse: "Business", businessUse: 100, businessPurpose: "Delivery and client travel", confidence: 96 },
  { id: "3", entity: "company", merchant: "Maxis Berhad", date: "25 Jul 2026", amount: 128, category: "Mobile", taxUse: "Business", businessUse: 70, businessPurpose: "Shared business mobile plan", myInvoisUuid: "EI-44B1-901D", confidence: 99 },
  { id: "4", entity: "company", merchant: "POPULAR Bookstore", date: "23 Jul 2026", amount: 54.9, category: "Stationery", taxUse: "Business", businessUse: 100, businessPurpose: "Office supplies", confidence: 94 },
  { id: "5", entity: "company", merchant: "Google Workspace", date: "20 Jul 2026", amount: 72, category: "Software & Subscriptions", taxUse: "Business", businessUse: 100, businessPurpose: "Business email and cloud storage", confidence: 99 },
  { id: "6", entity: "company", merchant: "Meta Platforms", date: "16 Jul 2026", amount: 350, category: "Advertising & Marketing", taxUse: "Business", businessUse: 100, businessPurpose: "July course promotion", confidence: 97 },
  { id: "p1", entity: "personal", merchant: "KPJ Specialist Centre", date: "18 Jul 2026", amount: 180, category: "Medical", taxUse: "Relief", businessUse: 0, businessPurpose: "Medical receipt", confidence: 97 },
  { id: "p2", entity: "personal", merchant: "POPULAR Bookstore", date: "12 Jul 2026", amount: 128, category: "Lifestyle", taxUse: "Relief", businessUse: 0, businessPurpose: "Books for personal reading", confidence: 93 },
  { id: "p3", entity: "personal", merchant: "Prudential Assurance", date: "05 Jul 2026", amount: 260, category: "Insurance", taxUse: "Relief", businessUse: 0, businessPurpose: "Life insurance premium", confidence: 99 },
  { id: "p4", entity: "personal", merchant: "Lembaga Zakat Selangor", date: "01 Jul 2026", amount: 300, category: "Zakat", taxUse: "Relief", businessUse: 0, businessPurpose: "Zakat payment", confidence: 99 },
  { id: "p5", entity: "personal", merchant: "Village Grocer", date: "29 Jun 2026", amount: 186.4, category: "Food & Beverage", taxUse: "Personal", businessUse: 0, businessPurpose: "Household groceries", confidence: 96 },
];

const bankTransactions = [
  { date: "28 Jul", description: "PETRONAS TAMAN SEA", amount: 120.5, matched: "PETRONAS Station", status: "Matched" },
  { date: "27 Jul", description: "TNG EWALLET RELOAD", amount: 36.8, matched: "Touch 'n Go eWallet", status: "Matched" },
  { date: "25 Jul", description: "MAXIS AUTOPAY", amount: 128, matched: "Maxis Berhad", status: "Matched" },
  { date: "21 Jul", description: "DUITNOW QR SUPPLIER", amount: 86.4, matched: "", status: "Missing receipt" },
];

type FilingItem = { id: string; label: string; detail: string; required?: boolean };
type FilingSection = { id: string; title: string; note: string; items: FilingItem[] };

function filingSections(entity: Entity): FilingSection[] {
  if (entity === "company") return [
    { id: "company-profile", title: "A · Company particulars", note: "Solver Academy Sdn. Bhd. · Borang C", items: [
      { id: "tin", label: "Company Tax Identification Number (TIN)", detail: "Company TIN registered with HASiL", required: true },
      { id: "ssm", label: "SSM registration number and company name", detail: "Legal name and BRN must match the company profile", required: true },
      { id: "business-code", label: "Business code and principal activity", detail: "Education and training activity code used in Form C", required: true },
      { id: "address", label: "Registered and business addresses", detail: "Current correspondence and operating addresses", required: true },
      { id: "accounting-period", label: "Accounting period", detail: "1 January to 31 December 2026", required: true },
      { id: "directors", label: "Directors, tax representative and audit status", detail: "Director particulars and audited or qualifying unaudited status", required: true },
    ]},
    { id: "financial-statements", title: "B · MPERS financial statements", note: "Generated from the posted General Ledger", items: [
      { id: "trial-balance", label: "Balanced Trial Balance", detail: "Every journal must have equal debit and credit", required: true },
      { id: "profit-loss", label: "Profit & Loss and detailed income statement", detail: "Revenue, expenses, finance costs and profit before tax", required: true },
      { id: "balance-sheet", label: "Balance Sheet", detail: "Assets must equal liabilities plus equity", required: true },
      { id: "cash-flow", label: "Cash Flow Statement", detail: "MPERS indirect method reconciled to closing cash", required: true },
      { id: "comparatives", label: "Prior-year comparative figures", detail: "Opening balances and prior-year signed accounts" },
    ]},
    { id: "tax-computation", title: "C · Company tax computation", note: "Book-to-tax reconciliation for Borang C", items: [
      { id: "profit-before-tax", label: "Profit before tax", detail: "Linked to the MPERS Profit & Loss", required: true },
      { id: "addbacks", label: "Non-deductible expenses and tax adjustments", detail: "Depreciation, private, capital and restricted items", required: true },
      { id: "capital-allowance", label: "Capital allowance schedule", detail: "Schedule 3 asset cost, initial, annual and balancing allowances", required: true },
      { id: "losses", label: "Unabsorbed losses and allowances", detail: "Prior-year balances and utilisation" },
      { id: "incentives", label: "Tax incentives and exempt income", detail: "Include detailed computation only when claimed" },
      { id: "chargeable-income", label: "Chargeable income and tax payable", detail: "Confirm SME status, related-company conditions and applicable YA rates", required: true },
    ]},
    { id: "tax-estimation", title: "D · CP204 and tax payments", note: "Company estimate, revisions and instalments", items: [
      { id: "cp204", label: "CP204 estimated tax payable", detail: "Annual estimate and submission confirmation", required: true },
      { id: "cp204a", label: "CP204A revisions", detail: "Review months 6, 9 and 11 where applicable" },
      { id: "instalments", label: "Monthly tax instalments", detail: "Payment schedule, receipts and outstanding amounts", required: true },
      { id: "balance-tax", label: "Balance of tax payable", detail: "Reconcile actual liability to CP204 instalments", required: true },
      { id: "withholding", label: "Withholding tax records", detail: "Contracts and payment evidence for relevant non-resident payments" },
    ]},
    { id: "mitrs", title: "E · Form C, MITRS and retention", note: "Submission pack and seven-year audit trail", items: [
      { id: "form-c", label: "Borang C submission", detail: "Due within seven months after the accounting year end", required: true },
      { id: "financial-pdf", label: "Audited / unaudited financial statements PDF", detail: "Financial statements forming the basis of the tax computation", required: true },
      { id: "tax-computation-pdf", label: "Income tax computation PDF", detail: "Detailed P&L and tax adjustments", required: true },
      { id: "capital-allowance-pdf", label: "Capital allowance schedule PDF", detail: "Required through MITRS when capital allowance is claimed" },
      { id: "mitrs-deadline", label: "MITRS submission", detail: "Within 30 days after the Form C due date", required: true },
      { id: "retention", label: "Seven-year accounting records", detail: "Keep ledgers, invoices, receipts and working papers", required: true },
    ]},
  ];
  const common: FilingSection[] = [
    { id: "identity", title: "A · Taxpayer particulars", note: "Personal details shown in the return", items: [
      { id: "tin", label: "Tax Identification Number (TIN)", detail: "Individual TIN registered with HASiL", required: true },
      { id: "id", label: "MyKad / passport number", detail: "Identification registered with HASiL", required: true },
      { id: "contact", label: "Correspondence address and contact", detail: "Current address, postcode, state, email and phone", required: true },
      { id: "personal", label: "Personal status", detail: "Citizenship, gender, date of birth and marital status", required: true },
      { id: "assessment", label: "Assessment election", detail: "Separate or joint assessment; spouse TIN where relevant", required: true },
      { id: "bank", label: "Bank account for refund", detail: "Account holder name, Malaysian bank and account number", required: true },
    ]},
  ];
  if (entity === "personal") return [...common,
    { id: "income", title: "B · Income records", note: "All taxable income, not only salary", items: [
      { id: "ea", label: "EA / EC employment statement", detail: "Salary, bonus, allowances, benefits-in-kind and tax borne by employer", required: true },
      { id: "pension", label: "Pension / annuity", detail: "Taxable pension or annuity received, if any" },
      { id: "rent", label: "Rental income", detail: "Gross rent, allowable direct expenses and statutory income" },
      { id: "interest", label: "Interest, discounts and royalties", detail: "Taxable Malaysian-source amounts, if any" },
      { id: "other-income", label: "Other and foreign income", detail: "Other taxable income and foreign income received in Malaysia, where applicable" },
      { id: "exempt", label: "Exempt income", detail: "Supporting statement for exempt income reported" },
    ]},
    { id: "relief", title: "G · Reliefs and deductions", note: "Evidence and limits must match the relevant YA", items: [
      { id: "self", label: "Individual and dependent relatives", detail: "Basic individual relief is handled in the tax computation", required: true },
      { id: "parents", label: "Parents’ medical / care expenses", detail: "Receipts and practitioner certification where required" },
      { id: "medical", label: "Medical expenses", detail: "Self, spouse or child; keep invoices and supporting certification" },
      { id: "education", label: "Education and upskilling fees", detail: "Course invoice and proof of payment" },
      { id: "lifestyle", label: "Lifestyle and sports", detail: "Books, devices, internet or sports evidence within applicable limits" },
      { id: "insurance", label: "Life / medical insurance", detail: "Annual premium statement" },
      { id: "epf", label: "EPF, SOCSO and approved contributions", detail: "Annual contribution statement" },
      { id: "spouse-child", label: "Spouse and child relief", detail: "Marriage, study, disability or childcare evidence where applicable" },
      { id: "sspn-prs", label: "SSPN / PRS / deferred annuity", detail: "Official annual statement where applicable" },
      { id: "donation", label: "Approved gifts and donations", detail: "Official receipt naming an approved body" },
    ]},
    { id: "payments", title: "Tax rebates and payments", note: "Amounts already paid or withheld", items: [
      { id: "pcb", label: "PCB / MTD deducted", detail: "Total from EA forms and payslips", required: true },
      { id: "zakat", label: "Zakat / fitrah", detail: "Official payment receipt for rebate" },
      { id: "section110", label: "Section 110 tax deducted", detail: "Dividend / other tax deduction certificates where applicable" },
      { id: "foreign-tax", label: "Foreign tax credit", detail: "HK-8 / HK-9 working sheets and foreign tax proof where applicable" },
    ]},
    { id: "declaration", title: "Declaration and filing", note: "Final checks before e-BE submission", items: [
      { id: "agent", label: "Tax agent particulars", detail: "Name, approval number and signature only if an agent prepares the return" },
      { id: "declaration", label: "Declaration of true and complete information", detail: "Review all income sources and claims before submission", required: true },
      { id: "retention", label: "Seven-year document retention", detail: "Keep records, documents and working sheets", required: true },
    ]},
  ];
  return [...common,
    { id: "business-profile", title: "B · Sole proprietor particulars", note: "For Sim Lip Geap carrying on an individual business", items: [
      { id: "business-name", label: "Business name and registration number", detail: "SSM business name / BRN and principal address", required: true },
      { id: "business-code", label: "Business code and activity", detail: "Relevant HASiL business code and activity description", required: true },
      { id: "accounting-period", label: "Accounting period", detail: "Opening and closing date of the sole proprietor accounts", required: true },
      { id: "bank", label: "Business bank and cash records", detail: "Statements and reconciliations kept separately from private spending", required: true },
    ]},
    { id: "profit-loss", title: "C · Business income computation", note: "Sole proprietor P&L and tax adjustments", items: [
      { id: "sales", label: "Sales / gross business receipts", detail: "Invoices, platform settlements and cash sales", required: true },
      { id: "cost-sales", label: "Purchases and cost of sales", detail: "Supplier invoices and direct business costs" },
      { id: "expenses", label: "Allowable business expenses", detail: "Receipt register, business purpose and private-use adjustment", required: true },
      { id: "non-allowable", label: "Non-allowable and private expenses", detail: "Add back private, capital and prohibited items", required: true },
      { id: "capital-allowance", label: "Capital allowance schedule", detail: "Business assets purchased or disposed" },
      { id: "losses", label: "Current and brought-forward business losses", detail: "Working sheets and prior-year balances" },
      { id: "statutory-income", label: "Adjusted and statutory business income", detail: "Borang B tax computation reconciliation", required: true },
    ]},
    { id: "reliefs-payments", title: "D · Personal reliefs and tax paid", note: "Form B remains the individual taxpayer’s return", items: [
      { id: "personal-reliefs", label: "Personal relief schedule", detail: "Use Sim Lip Geap’s personal evidence and applicable YA limits", required: true },
      { id: "zakat", label: "Zakat / fitrah rebate", detail: "Official payment receipt" },
      { id: "cp500", label: "CP500 instalments", detail: "All individual business instalments paid", required: true },
      { id: "pcb", label: "PCB / MTD", detail: "Employment tax deductions if Sim is also employed" },
    ]},
    { id: "declaration", title: "E · Declaration and supporting records", note: "Final e-B filing and audit support", items: [
      { id: "myinvois", label: "MyInvois purchase and sales register", detail: "UUID references and separate validation evidence where applicable" },
      { id: "declaration", label: "Declaration of true and complete information", detail: "Review every income source and claim", required: true },
      { id: "retention", label: "Seven-year document retention", detail: "Keep accounts, invoices, receipts and working sheets", required: true },
    ]},
  ];
}

function defaultFilingChecks(entity: Entity): Record<string, boolean> {
  // Readiness is a taxpayer confirmation, so no compliance item is pre-ticked.
  // The entity argument is retained to keep saved checklists isolated by form.
  void entity;
  return {};
}

const monetaryFilingKeys = new Set([
  "income:ea", "income:pension", "income:rent", "income:interest", "income:other-income", "income:exempt",
  "relief:parents", "relief:medical", "relief:education", "relief:lifestyle", "relief:insurance", "relief:epf", "relief:spouse-child", "relief:sspn-prs", "relief:donation",
  "payments:pcb", "payments:zakat", "payments:section110", "payments:foreign-tax",
  "profit-loss:sales", "profit-loss:stock", "profit-loss:cost-sales", "profit-loss:expenses", "profit-loss:non-allowable", "profit-loss:capital-allowance", "profit-loss:losses", "profit-loss:statutory-income",
  "tax-computation:profit-before-tax", "tax-computation:addbacks", "tax-computation:capital-allowance", "tax-computation:losses", "tax-computation:chargeable-income",
  "tax-estimation:cp204", "tax-estimation:instalments", "tax-estimation:balance-tax",
  "other-income:employment", "other-income:rental", "other-income:interest-royalty", "other-income:foreign-other", "other-income:donations",
  "reliefs-payments:personal-reliefs", "reliefs-payments:zakat", "reliefs-payments:cp500", "reliefs-payments:pcb", "reliefs-payments:section110",
]);

type AutoFilingAmount = { amount: number; receiptCount: number; source: string };

function autoFilingAmount(key: string, receipts: Receipt[]): AutoFilingAmount | null {
  const personalReliefs = receipts.filter((receipt) => receipt.entity === "personal" && receipt.taxUse === "Relief");
  const categoryTotal = (category: Category) => {
    const matched = personalReliefs.filter((receipt) => receipt.category === category);
    return { amount: matched.reduce((sum, receipt) => sum + receipt.amount, 0), receiptCount: matched.length, source: "Sim Lip Geap receipts" };
  };
  const categoryMap: Record<string, Category> = {
    "relief:medical": "Medical",
    "relief:education": "Education",
    "relief:lifestyle": "Lifestyle",
    "relief:insurance": "Insurance",
    "relief:epf": "EPF & SOCSO",
    "payments:zakat": "Zakat",
  };
  if (categoryMap[key]) return categoryTotal(categoryMap[key]);
  if (key === "profit-loss:expenses") {
    const matched = receipts.filter((receipt) => receipt.entity === "business" && receipt.taxUse === "Business" && receipt.businessUse > 0 && Boolean(receipt.businessPurpose?.trim()));
    return { amount: matched.reduce((sum, receipt) => sum + receipt.amount * receipt.businessUse / 100, 0), receiptCount: matched.length, source: "Sole proprietor receipts" };
  }
  if (key === "reliefs-payments:personal-reliefs") {
    const matched = personalReliefs.filter((receipt) => receipt.category !== "Zakat");
    return { amount: matched.reduce((sum, receipt) => sum + receipt.amount, 0), receiptCount: matched.length, source: "Sim Lip Geap receipts" };
  }
  if (key === "reliefs-payments:zakat") return categoryTotal("Zakat");
  return null;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(current.trim()); current = ""; }
    else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}

function classify(text: string): Category {
  const value = text.toLowerCase();
  if (/petronas|shell|petrol|fuel|caltex|bhpetrol/.test(value)) return "Petrol";
  if (/touch.n.go|toll|plus malaysia|rfid/.test(value)) return "Toll Fee";
  if (/maxis|celcom|digi|unifi|mobile|yes 5g|u mobile/.test(value)) return "Mobile";
  if (/hospital|clinic|medical|pharmacy|doctor|kpj|pantai|sunway medical/.test(value)) return "Medical";
  if (/insurance|prudential|aia|great eastern|etiqa/.test(value)) return "Insurance";
  if (/tuition|course|university|college|education/.test(value)) return "Education";
  if (/zakat|pusat pungutan zakat/.test(value)) return "Zakat";
  if (/google workspace|microsoft 365|adobe|canva|software|subscription/.test(value)) return "Software & Subscriptions";
  if (/facebook ads|meta platforms|google ads|advertising|marketing/.test(value)) return "Advertising & Marketing";
  if (/accounting fee|audit fee|legal fee|professional fee/.test(value)) return "Professional Fees";
  if (/office rent|rental|tenancy/.test(value)) return "Office Rent";
  if (/tnb|syabas|air selangor|electricity|utility/.test(value)) return "Utilities";
  if (/popular|stationery|office|book|paper|ink|pen/.test(value)) return "Stationery";
  if (/cinema|gsc|tgv|netflix|entertainment|karaoke/.test(value)) return "Entertainment";
  if (/restaurant|cafe|coffee|food|mcd|starbucks|kopitiam|makan/.test(value)) return "Food & Beverage";
  return "Others";
}

function extractAmount(text: string) {
  const matches = [...text.matchAll(/(?:RM\s*)?(\d{1,5}[.,]\d{2})/gi)];
  const values = matches.map((match) => Number(match[1].replace(",", "."))).filter(Number.isFinite);
  return values.length ? Math.max(...values) : 0;
}

export default function Home() {
  const [receipts, setReceipts] = useState(seedReceipts);
  const [receiptsReady, setReceiptsReady] = useState(false);
  const [entity, setEntity] = useState<Entity>("company");
  const [tab, setTab] = useState<"overview" | "receipts" | "bank" | "myinvois" | "ledger" | "pl" | "balance" | "cashflow" | "filing" | "tax" | "audit">("overview");
  const [activeForm, setActiveForm] = useState<"B" | "C" | "BE">("C");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState<Receipt | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [bankRowsByEntity, setBankRowsByEntity] = useState<Record<"business" | "company", typeof bankTransactions>>({ business: [], company: bankTransactions });
  const [filingChecks, setFilingChecks] = useState<Record<string, boolean>>(defaultFilingChecks("company"));
  const [filingAmounts, setFilingAmounts] = useState<Record<string, number>>({});
  const [manualAmountKeys, setManualAmountKeys] = useState<string[]>([]);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [languageReady, setLanguageReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const entityReceipts = useMemo(() => receipts.filter((item) => item.entity === entity), [receipts, entity]);
  const entityInvoices = useMemo(() => entityReceipts.filter((item) => item.myInvoisUuid), [entityReceipts]);
  const companyAccountingReceipts = useMemo<AccountingReceipt[]>(() => receipts.filter((item) => item.entity === "company").map((item) => ({ id: item.id, merchant: item.merchant, date: item.date, amount: item.amount, category: item.category, businessUse: item.businessUse, taxUse: item.taxUse, businessPurpose: item.businessPurpose, fileName: item.fileName, paymentAccountCode: item.paymentAccountCode })), [receipts]);
  const soleProprietorAccountingReceipts = useMemo<AccountingReceipt[]>(() => receipts.filter((item) => item.entity === "business").map((item) => ({ id: item.id, merchant: item.merchant, date: item.date, amount: item.amount, category: item.category, businessUse: item.businessUse, taxUse: item.taxUse, businessPurpose: item.businessPurpose, fileName: item.fileName, paymentAccountCode: item.paymentAccountCode })), [receipts]);
  const totals = useMemo(() => {
    const total = entityReceipts.reduce((sum, item) => sum + item.amount, 0);
    const business = entityReceipts.filter((item) => item.taxUse === "Business").reduce((sum, item) => sum + item.amount * item.businessUse / 100, 0);
    const relief = entityReceipts.filter((item) => item.taxUse === "Relief").reduce((sum, item) => sum + item.amount, 0);
    return { total, business, relief, review: entityReceipts.filter((item) => item.taxUse === "Review").length };
  }, [entityReceipts]);

  const filtered = entityReceipts.filter((receipt) => `${receipt.merchant} ${receipt.category}`.toLowerCase().includes(query.toLowerCase()));
  const currentFilingSections = useMemo(() => filingSections(entity), [entity]);
  const filingItems = currentFilingSections.flatMap((section) => section.items.map((item) => ({ ...item, key: `${section.id}:${item.id}` })));
  const filingDone = filingItems.filter((item) => filingChecks[item.key]).length;
  const filingPercent = Math.round(filingDone / Math.max(filingItems.length, 1) * 100);
  const autoFilingAmounts = useMemo(() => Object.fromEntries(filingItems.map((item) => [item.key, autoFilingAmount(item.key, receiptsReady ? receipts : [])]).filter(([, amount]) => amount !== null)) as Record<string, AutoFilingAmount>, [filingItems, receipts, receiptsReady]);
  const autoFilledFields = Object.values(autoFilingAmounts).filter((item) => item.amount > 0).length;
  const isPersonal = entity === "personal";
  const isCompany = entity === "company";
  const currentForm = isPersonal ? "BE" : isCompany ? "C" : "B";
  const currentName = isCompany ? "Solver Academy" : "Sim Lip Geap";
  const currentAccountLabel = isPersonal ? "Personal" : isCompany ? "Sdn. Bhd." : "Sole proprietor";
  const bankRows = isPersonal ? [] : bankRowsByEntity[entity];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the saved display language after mount
    if (window.localStorage.getItem("ams-language") === "zh") setLanguage("zh");
    setLanguageReady(true);
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("ams-receipts");
      if (stored) {
        let savedReceipts: unknown = JSON.parse(stored);
        if (Array.isArray(savedReceipts) && !window.localStorage.getItem("ams-company-entity-v1-migrated")) {
          savedReceipts = savedReceipts.map((receipt) => receipt?.entity === "business" ? { ...receipt, entity: "company" } : receipt);
          window.localStorage.setItem("ams-company-entity-v1-migrated", "true");
        }
        const hydrated = Array.isArray(savedReceipts) ? savedReceipts.map(normalizeReceipt).filter((receipt): receipt is Receipt => Boolean(receipt)) : [];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate saved receipt records after mount
        if (Array.isArray(savedReceipts)) setReceipts(hydrated);
      }
    } catch {
      // Keep the built-in examples when the browser blocks local storage.
    } finally {
      try { window.localStorage.setItem("ams-company-entity-v1-migrated", "true"); } catch { /* Storage can be unavailable. */ }
      setReceiptsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!receiptsReady) return;
    try {
      window.localStorage.setItem("ams-receipts", JSON.stringify(receipts));
    } catch {
      // The current page remains usable; the Audit Pack is the fallback backup.
    }
  }, [receipts, receiptsReady]);

  useEffect(() => {
    if (!languageReady) return;
    window.localStorage.setItem("ams-language", language);
    document.documentElement.lang = language === "zh" ? "zh-Hans-MY" : "en-MY";
    if (language !== "zh") return;
    const root = document.querySelector<HTMLElement>(".app-shell");
    if (!root) return;
    const originals = new WeakMap<Text, string>();
    const translatedNodes = new Set<Text>();
    const originalAttributes = new Map<Element, Map<string, string>>();

    const translateTextNode = (node: Text) => {
      const current = node.nodeValue || "";
      const prior = originals.get(node);
      if (prior && current !== prior && current !== translateToChinese(prior)) originals.set(node, current);
      if (!originals.has(node)) originals.set(node, current);
      const translated = translateToChinese(originals.get(node) || current);
      translatedNodes.add(node);
      if (current !== translated) node.nodeValue = translated;
    };
    const translateElement = (element: Element) => {
      if (element instanceof HTMLOptionElement && !element.hasAttribute("value")) element.setAttribute("value", element.textContent?.trim() || "");
      for (const attribute of ["placeholder", "aria-label", "title"]) {
        const value = element.getAttribute(attribute);
        if (!value) continue;
        if (!originalAttributes.has(element)) originalAttributes.set(element, new Map());
        const attributes = originalAttributes.get(element)!;
        if (!attributes.has(attribute)) attributes.set(attribute, value);
        element.setAttribute(attribute, translateToChinese(attributes.get(attribute)!));
      }
    };
    const translateTree = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
      if (node.nodeType === Node.ELEMENT_NODE) {
        translateElement(node as Element);
        node.childNodes.forEach(translateTree);
      }
    };
    translateTree(root);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTextNode(mutation.target as Text);
        mutation.addedNodes.forEach(translateTree);
      }
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      translatedNodes.forEach((node) => { if (node.isConnected) node.nodeValue = originals.get(node) || node.nodeValue; });
      originalAttributes.forEach((attributes, element) => attributes.forEach((value, attribute) => element.setAttribute(attribute, value)));
    };
  }, [language, languageReady]);

  useEffect(() => {
    const defaults = defaultFilingChecks(entity);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset checklist state when switching legal entities
    setFilingChecks(defaults);
    setFilingAmounts({});
    setManualAmountKeys([]);
    try {
      const saved = window.localStorage.getItem(`ams-filing-${entity}`);
      if (!saved) return;
      const profile = JSON.parse(saved);
      const checks = profile?.checklist && typeof profile.checklist === "object" && !Array.isArray(profile.checklist) ? Object.fromEntries(Object.entries(profile.checklist).filter(([key, value]) => key.length <= 160 && typeof value === "boolean")) as Record<string, boolean> : {};
      const amounts = profile?.amounts && typeof profile.amounts === "object" && !Array.isArray(profile.amounts) ? Object.fromEntries(Object.entries(profile.amounts).filter(([key, value]) => key.length <= 160 && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 999_999_999.99)) as Record<string, number> : {};
      const manualKeys = Array.isArray(profile?.manualAmountKeys) ? profile.manualAmountKeys.filter((key: unknown): key is string => typeof key === "string" && key in amounts) : [];
      setFilingChecks({ ...defaults, ...checks });
      setFilingAmounts(amounts);
      setManualAmountKeys(manualKeys);
    } catch {
      // Use the form defaults when the browser blocks local storage.
    }
  }, [entity]);

  function saveFilingChecklist() {
    setSavingChecklist(true);
    try {
      window.localStorage.setItem(`ams-filing-${entity}`, JSON.stringify({ checklist: filingChecks, amounts: filingAmounts, manualAmountKeys }));
      setToast("Filing checklist saved on this browser.");
    } catch {
      setToast("Your browser could not save this checklist.");
    } finally {
      setSavingChecklist(false);
      setTimeout(() => setToast(""), 3000);
    }
  }

  function changeEntity(next: Entity) {
    setEntity(next);
    setActiveForm(next === "personal" ? "BE" : next === "business" ? "B" : "C");
    setTab("overview");
    setQuery("");
    setToast(next === "personal" ? "Switched to Sim Lip Geap · Personal" : next === "business" ? "Switched to Sim Lip Geap · Sole proprietor · Form B" : "Switched to Solver Academy Sdn. Bhd. · Form C");
    setTimeout(() => setToast(""), 2500);
  }

  async function handleFile(file: File) {
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type) || !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      setToast("Use a JPG, PNG or WEBP receipt image.");
      setTimeout(() => setToast(""), 3200);
      return;
    }
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      setToast("Receipt image must be between 1 byte and 10 MB.");
      setTimeout(() => setToast(""), 3200);
      return;
    }
    setProcessing(true);
    setDraft(null);
    setProgress(12);
    const fileLabel = file.name.replace(/[-_]/g, " ");
    let ocrText = "";
    try {
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(file, "eng", {
        logger: (message) => {
          if (message.status === "recognizing text") setProgress(Math.max(18, Math.round(message.progress * 88)));
        },
      });
      ocrText = result.data.text;
    } catch {
      setProgress(86);
    }
    const text = `${ocrText}\n${fileLabel}`;
    const lines = ocrText.split(/\n/).map((line) => line.trim()).filter(Boolean);
    const merchant = lines.find((line) => /[a-z]{3}/i.test(line) && line.length <= 80)?.replace(/\.(jpg|jpeg|png|webp|pdf)$/i, "") || fileLabel.replace(/\.(jpg|jpeg|png|webp)$/i, "") || "New receipt";
    const category = classify(text);
    const amount = extractAmount(text) || 0;
    setProgress(100);
    setDraft({
      id: crypto.randomUUID(),
      entity,
      merchant: merchant.slice(0, 34),
      date: displayDate(extractReceiptDate(text) || new Date().toISOString()),
      amount,
      category,
      taxUse: entity === "personal" ? (["Medical", "Lifestyle", "Education", "Insurance", "EPF & SOCSO", "Zakat"] as Category[]).includes(category) ? "Relief" : "Personal" : category === "Entertainment" ? "Review" : "Business",
      businessUse: entity !== "personal" ? category === "Mobile" || category === "Petrol" ? 70 : 100 : 0,
      businessPurpose: "",
      confidence: category === "Others" ? 72 : 93,
      fileName: file.name,
      paymentAccountCode: entity === "personal" ? undefined : "1010",
    });
    setProcessing(false);
  }

  function saveReceipt(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const normalized = normalizeReceipt(draft);
    if (!normalized) {
      setToast("Enter a merchant, date and an amount greater than RM0.00.");
      setTimeout(() => setToast(""), 3200);
      return;
    }
    const existing = receipts.some((item) => item.id === normalized.id);
    setReceipts((current) => existing ? current.map((item) => item.id === normalized.id ? normalized : item) : [normalized, ...current]);
    setUploadOpen(false);
    setDraft(null);
    setToast(existing ? "Receipt updated. Any linked draft journal was refreshed." : "Receipt saved on this browser and included in your tax summary.");
    setTimeout(() => setToast(""), 3200);
  }

  function exportCsv() {
    const header = "Date,Merchant,Category,Tax use,Business use %,Gross amount (MYR),Claimable amount (MYR),Payment account,Business purpose,MyInvois UUID";
    const rows = entityReceipts.map((r) => [csvCell(r.date), csvCell(r.merchant), csvCell(r.category), csvCell(r.taxUse), r.businessUse, r.amount.toFixed(2), (r.taxUse === "Business" ? r.amount * r.businessUse / 100 : r.taxUse === "Relief" ? r.amount : 0).toFixed(2), csvCell(r.paymentAccountCode || ""), csvCell(r.businessPurpose || ""), csvCell(r.myInvoisUuid || "")].join(","));
    const blob = new Blob([`\uFEFF${[header, ...rows].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `AMS-2026-${isCompany ? "Solver-Academy-Sdn-Bhd-Form-C" : isPersonal ? "Sim-Lip-Geap-Form-BE" : "Sim-Lip-Geap-Form-B"}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
    setToast("Tax summary exported as CSV.");
    setTimeout(() => setToast(""), 3200);
  }

  function downloadAuditPack() {
    const accountingChart = isCompany ? undefined : soleProprietorChartOfAccounts;
    let accountingJournals: JournalEntry[] = isCompany ? seedJournalEntries : seedSoleProprietorJournalEntries;
    if (!isPersonal) {
      try {
        const stored = window.localStorage.getItem(isCompany ? "ams-company-journals-v1" : "ams-sole-proprietor-journals-v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) accountingJournals = sanitizeJournalEntries(parsed, accountingChart || chartOfAccounts);
        }
      } catch {
        // Export the selected built-in ledger when browser storage is unavailable.
      }
    }
    const pack = {
      product: "AMS Malaysia",
      entity: isCompany ? "Solver Academy Sdn. Bhd." : isPersonal ? "Sim Lip Geap · Personal" : "Sim Lip Geap · Sole proprietor",
      yearOfAssessment: 2026,
      form: `Form ${activeForm}`,
      generatedAt: new Date().toISOString(),
      sevenYearRetentionUntil: "31 Dec 2034 (indicative if the YA 2026 return is filed during 2027; recalculate from the end of the actual filing year)",
      summary: { grossExpenses: totals.total, potentialBusinessDeductions: totals.business, personalReliefReceipts: totals.relief },
      receipts: entityReceipts,
      bankReconciliation: bankRows,
      businessAccounting: !isPersonal ? {
        framework: isCompany ? "MPERS" : "Sole proprietor business accounts",
        functionalCurrency: "MYR",
        accountingPeriod: "1 Jan 2026 to 31 Dec 2026",
        journals: accountingJournals,
        profitAndLoss: profitAndLoss(accountingJournals, accountingChart),
        balanceSheet: balanceSheet(accountingJournals, accountingChart),
        cashFlowIndirectMethod: cashFlowStatement(accountingJournals, accountingChart),
        taxWorkingPaper: taxComputation(accountingJournals, accountingChart),
      } : undefined,
      disclaimer: "Prepared for review. Final tax treatment must be confirmed by the taxpayer or licensed tax agent.",
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `AMS-YA2026-Form${activeForm}-Audit-Pack.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
    setToast("Seven-year Audit Pack downloaded.");
    setTimeout(() => setToast(""), 3200);
  }

  async function importBankStatement(file: File) {
    if (!/\.csv$/i.test(file.name) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setToast("Use a non-empty CSV bank statement up to 5 MB.");
      setTimeout(() => setToast(""), 3600);
      return;
    }
    const text = await file.text();
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim()).slice(0, 10_001);
    const headers = parseCsvLine(lines[0] || "").map(normalizedHeader);
    const column = (...names: string[]) => headers.findIndex((header) => names.includes(header));
    const dateIndex = column("date", "transactiondate", "valuedate", "tarikh");
    const descriptionIndex = column("description", "transactiondescription", "details", "narrative", "reference", "butiran");
    const amountIndex = column("amount", "transactionamount", "amaun");
    const debitIndex = column("debit", "withdrawal", "moneyout", "keluar");
    const creditIndex = column("credit", "deposit", "moneyin", "masuk");
    if (dateIndex < 0 || descriptionIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) {
      setToast("CSV needs Date, Description and Amount columns (or Debit/Credit columns).");
      setTimeout(() => setToast(""), 3600);
      return;
    }
    const usedReceiptIds = new Set<string>();
    const parsed = lines.slice(1).map((line) => {
      const cells = parseCsvLine(line);
      const amount = amountIndex >= 0 ? moneyValue(cells[amountIndex]) : Math.max(moneyValue(cells[debitIndex]), moneyValue(cells[creditIndex]));
      const description = shortText(cells[descriptionIndex], 300) || "Bank transaction";
      const candidates = entityReceipts.filter((receipt) => !usedReceiptIds.has(receipt.id) && (receipt.paymentAccountCode || "1010") === "1010" && Math.abs(receipt.amount - amount) < 0.01);
      const descriptionWords = description.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 4);
      const scored = candidates.map((receipt) => ({ receipt, score: descriptionWords.filter((word) => receipt.merchant.toLowerCase().includes(word)).length + (receipt.date.toLowerCase().includes((cells[dateIndex] || "").toLowerCase()) ? 2 : 0) })).sort((a, b) => b.score - a.score);
      const match = candidates.length === 1 || (scored[0]?.score > (scored[1]?.score || 0) && scored[0].score > 0) ? scored[0]?.receipt : undefined;
      if (match) usedReceiptIds.add(match.id);
      return { date: shortText(cells[dateIndex], 40) || "—", description, amount, matched: match?.merchant || "", status: match ? "Matched" : "Missing receipt" };
    }).filter((row) => row.amount > 0);
    if (!parsed.length) {
      setToast("No transactions found. Use CSV columns: Date, Description, Amount.");
    } else {
      if (entity !== "personal") setBankRowsByEntity((current) => ({ ...current, [entity]: parsed }));
      setToast(`${file.name} imported — ${parsed.filter((row) => row.status === "Matched").length} matches found.`);
    }
    setTimeout(() => setToast(""), 3600);
  }

  async function importMyInvois(file: File) {
    if (!/\.(csv|json)$/i.test(file.name) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setToast("Use a non-empty MyInvois CSV or JSON file up to 5 MB.");
      setTimeout(() => setToast(""), 3600);
      return;
    }
    try {
      const text = await file.text();
      let records: Record<string, unknown>[] = [];
      if (/\.json$/i.test(file.name)) {
        const parsed: unknown = JSON.parse(text);
        const source = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as { documents?: unknown }).documents) ? (parsed as { documents: unknown[] }).documents : parsed && typeof parsed === "object" && Array.isArray((parsed as { invoices?: unknown }).invoices) ? (parsed as { invoices: unknown[] }).invoices : [];
        records = source.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)).slice(0, 10_000);
      } else {
        const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim()).slice(0, 10_001);
        const headers = parseCsvLine(lines[0] || "").map(normalizedHeader);
        records = lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, parseCsvLine(line)[index] ?? ""])));
      }
      const read = (record: Record<string, unknown>, ...names: string[]) => {
        const entries = Object.entries(record);
        return entries.find(([key]) => names.includes(normalizedHeader(key)))?.[1];
      };
      const knownUuids = new Set(receipts.filter((item) => item.entity === entity && item.myInvoisUuid).map((item) => item.myInvoisUuid!.toLowerCase()));
      const additions: Receipt[] = [];
      for (const record of records) {
        const uuid = shortText(read(record, "uuid", "invoiceuuid", "myinvoisuuid", "longid"), 160);
        const merchant = shortText(read(record, "merchant", "supplier", "suppliername", "issuername", "sellername"), 160);
        const amount = moneyValue(read(record, "amount", "totalamount", "invoicetotal", "payableamount", "totalpayableamount"));
        if (!uuid || !merchant || amount <= 0 || knownUuids.has(uuid.toLowerCase())) continue;
        const description = shortText(read(record, "description", "itemdescription", "classification"), 500);
        const category = classify(`${merchant} ${description}`);
        additions.push({ id: crypto.randomUUID(), entity, merchant, date: displayDate(read(record, "date", "invoicedate", "issuedate")), amount, category, taxUse: "Review", businessUse: 0, businessPurpose: description || undefined, myInvoisUuid: uuid, confidence: category === "Others" ? 65 : 85, fileName: file.name, paymentAccountCode: "2000" });
        knownUuids.add(uuid.toLowerCase());
      }
      if (!additions.length) setToast("No new invoice found. Check that UUID, supplier, date and total amount columns are present.");
      else {
        setReceipts((current) => [...additions, ...current]);
        setToast(`${additions.length} MyInvois reference${additions.length === 1 ? "" : "s"} imported for review.`);
      }
    } catch {
      setToast("MyInvois file could not be read. Check the CSV or JSON format.");
    }
    setTimeout(() => setToast(""), 4000);
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <div className="brand"><span className="brand-mark">A</span><span>AMS<small>Malaysia</small></span></div>
        <div className="entity-switcher">
          <label>Current account</label>
          <button className={entity === "personal" ? "selected" : ""} onClick={() => changeEntity("personal")}><span className="entity-avatar personal">SL</span><div><strong>Sim Lip Geap</strong><small>Personal · Form BE</small></div>{entity === "personal" && <Check />}</button>
          <button className={entity === "business" ? "selected" : ""} onClick={() => changeEntity("business")}><span className="entity-avatar soleprop">SP</span><div><strong>Sim Lip Geap</strong><small>Sole proprietor · Form B</small></div>{entity === "business" && <Check />}</button>
          <button className={entity === "company" ? "selected" : ""} onClick={() => changeEntity("company")}><span className="entity-avatar business">SA</span><div><strong>Solver Academy</strong><small>Sdn. Bhd. · Form C</small></div>{entity === "company" && <Check />}</button>
        </div>
        <nav aria-label="Main navigation">
          <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><LayoutDashboard /> Overview</button>
          <button className={tab === "receipts" ? "active" : ""} onClick={() => setTab("receipts")}><ReceiptText /> Receipts <span className="nav-count">{entityReceipts.length}</span></button>
          {!isPersonal && <button className={tab === "bank" ? "active" : ""} onClick={() => setTab("bank")}><Landmark /> Bank matching {bankRows.some((row) => row.status !== "Matched") && <span className="nav-alert">{bankRows.filter((row) => row.status !== "Matched").length}</span>}</button>}
          {!isPersonal && <button className={tab === "myinvois" ? "active" : ""} onClick={() => setTab("myinvois")}><ScanLine /> MyInvois</button>}
          {!isPersonal && <button className={tab === "ledger" ? "active" : ""} onClick={() => setTab("ledger")}><BookOpen /> General Ledger</button>}
          {!isPersonal && <button className={tab === "pl" ? "active" : ""} onClick={() => setTab("pl")}><TrendingUp /> Profit &amp; Loss</button>}
          {!isPersonal && <button className={tab === "balance" ? "active" : ""} onClick={() => setTab("balance")}><BarChart3 /> Balance Sheet</button>}
          {!isPersonal && <button className={tab === "cashflow" ? "active" : ""} onClick={() => setTab("cashflow")}><CircleDollarSign /> Cash Flow</button>}
          <button className={tab === "filing" ? "active" : ""} onClick={() => setTab("filing")}><ClipboardCheck /> Form checklist <span className="nav-progress">{filingPercent}%</span></button>
          <button className={tab === "tax" ? "active" : ""} onClick={() => setTab("tax")}><FileText /> {isPersonal ? "Tax Report" : isCompany ? "Form C & Tax" : "Form B Tax"}</button>
          <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}><Archive /> Audit Pack</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="tax-card"><span className="mini-icon"><FileCheck2 /></span><strong>YA 2026 · Form {currentForm}</strong><p>{filingPercent}% of filing information marked ready.</p><button onClick={() => setTab("filing")}>Open filing checklist <ArrowUpRight /></button></div>
          <button className="help"><CircleHelp /> Help & tax guide</button>
          <div className="profile"><span>{isCompany ? "SA" : "SL"}</span><div><strong>{currentName}</strong><small>{isPersonal ? "Individual taxpayer" : isCompany ? "Sdn. Bhd. company" : "Sole proprietor"}</small></div><ChevronDown /></div>
        </div>
      </aside>

      <section className="workspace">
        <header>
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div><p className="eyebrow">{isPersonal ? "SIM LIP GEAP · PERSONAL · FORM BE" : isCompany ? "SOLVER ACADEMY SDN. BHD. · MPERS · FORM C" : "SIM LIP GEAP · SOLE PROPRIETOR · FORM B"}</p><h1>{tab === "overview" ? `Good morning, ${isCompany ? "Solver" : "Sim"}` : tab === "receipts" ? `${currentAccountLabel} receipts` : tab === "bank" ? "Bank reconciliation" : tab === "myinvois" ? "MyInvois records" : tab === "ledger" ? "General Ledger & Trial Balance" : tab === "pl" ? "Profit & Loss" : tab === "balance" ? "Balance Sheet" : tab === "cashflow" ? "Cash Flow Statement" : tab === "filing" ? `Borang ${currentForm} information checklist` : tab === "audit" ? "Seven-year Audit Pack" : isPersonal ? "Tax-ready summary" : isCompany ? "Form C tax computation" : "Form B tax summary"}</h1></div>
          <div className="header-actions"><div className="language-switch" role="group" aria-label="Language"><Languages /><button className={language === "zh" ? "active" : ""} aria-pressed={language === "zh"} onClick={() => setLanguage("zh")}>中文</button><button className={language === "en" ? "active" : ""} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button></div><button className="icon-btn" aria-label="Notifications"><Bell /></button><button className="primary" onClick={() => setUploadOpen(true)}><Plus /> Upload receipt</button></div>
        </header>

        {tab === "overview" && (
          <div className="content">
            <section className="welcome-panel">
              <div><span className="pill"><Sparkles /> {isPersonal ? "Personal tax relief" : isCompany ? "Sdn. Bhd. accounting" : "Sole proprietor records"}</span><h2>{isPersonal ? <>Sim Lip Geap’s personal<br />expenses, kept separate.</> : isCompany ? <>Solver Academy’s company<br />accounts, under control.</> : <>Sim Lip Geap’s business<br />expenses for Form B.</>}</h2><p>{isPersonal ? "Track personal spending and identify possible Form BE relief records without mixing them into the company account." : isCompany ? "Turn receipts and journals into a balanced MPERS General Ledger, P&L, Balance Sheet, Cash Flow and Form C working papers." : "Record sole proprietor income and expenses in a separate General Ledger, P&L, Balance Sheet and Cash Flow for Form B."}</p><div className="hero-actions"><button className="dark-button" onClick={() => isPersonal ? setUploadOpen(true) : setTab("ledger")}>{isPersonal ? <Paperclip /> : <BookOpen />} {isPersonal ? "Upload personal receipt" : isCompany ? "Open company accounts" : "Open Form B accounts"}</button>{!isPersonal && <button className="secondary" onClick={() => setUploadOpen(true)}><Paperclip /> {isCompany ? "Upload company receipt" : "Upload Form B receipt"}</button>}</div><small>Saved to {isCompany ? "Solver Academy Sdn. Bhd." : isPersonal ? "Sim Lip Geap · Personal" : "Sim Lip Geap · Sole proprietor"}</small></div>
              <div className="receipt-stack" aria-hidden="true"><div className="receipt-paper back"></div><div className="receipt-paper front"><div className="receipt-top"><span className="logo-dot">{entity === "personal" ? "K" : "P"}</span><div><b>{entity === "personal" ? "KPJ MEDICAL" : "PETRONAS"}</b><small>{entity === "personal" ? "Personal receipt" : "Business receipt"}</small></div><span className="verified"><Check /></span></div><div className="scan-lines"><i></i><i></i><i></i></div><div className="receipt-total"><span>Total</span><strong>{entity === "personal" ? "RM 180.00" : "RM 120.50"}</strong></div><div className="category-tag">{entity === "personal" ? <HeartPulse /> : <Fuel />} {entity === "personal" ? "Medical" : "Petrol"} <span>{entity === "personal" ? "Form BE" : "80% use"}</span></div></div></div>
            </section>

            <section className="expense-guide"><div className="guide-head"><div><span>{isPersonal ? "PERSONAL ACCOUNT" : isCompany ? "COMPANY ACCOUNT" : "SOLE PROPRIETOR ACCOUNT"}</span><h3>{isPersonal ? "What Sim Lip Geap can organise" : isCompany ? "Solver Academy Sdn. Bhd. accounting" : "Sim Lip Geap · Form B business records"}</h3><p>{isPersonal ? "Possible relief evidence is shown separately from ordinary personal spending." : isCompany ? "Company records flow through double-entry journals before appearing in MPERS reports and Form C." : "Only genuine sole proprietor business records appear in Form B."}</p></div><span className={`account-badge ${entity}`}><ShieldCheck /> Form {currentForm}</span></div><div className="guide-grid">{(isPersonal ? [
              { category: "Medical" as Category, note: "Medical treatment and eligible care" }, { category: "Lifestyle" as Category, note: "Books, devices and eligible lifestyle items" }, { category: "Education" as Category, note: "Eligible self-education fees" }, { category: "Insurance" as Category, note: "Life and medical insurance records" }, { category: "EPF & SOCSO" as Category, note: "Contribution statements" }, { category: "Zakat" as Category, note: "Zakat payment receipts" }
            ] : [
              { category: "Petrol" as Category, note: "Business travel, toll and parking" }, { category: "Stationery" as Category, note: "Office supplies and printing" }, { category: "Mobile" as Category, note: "Business-use phone and internet" }, { category: "Software & Subscriptions" as Category, note: "Cloud tools and business software" }, { category: "Advertising & Marketing" as Category, note: "Ads, design and promotion" }, { category: "Professional Fees" as Category, note: "Accounting, audit and legal services" }
            ]).map((item) => { const Icon = categoryMeta[item.category].icon; return <article key={item.category}><span className={`cat-icon ${categoryMeta[item.category].tone}`}><Icon /></span><div><strong>{item.category}</strong><small>{item.note}</small></div><ChevronRight /></article>; })}</div><p className="guide-disclaimer"><AlertCircle /> Categories are record-keeping suggestions. Final eligibility depends on the relevant YA rules and supporting evidence.</p></section>

            <section className="metric-grid">
              <article><div className="metric-icon mint"><WalletCards /></div><span>Total expenses</span><strong>{currency(totals.total)}</strong><small>{entityReceipts.length ? "Current selected account" : "No receipts recorded yet"}</small></article>
              <article><div className="metric-icon peach">{isPersonal ? <FileCheck2 /> : <BriefcaseBusiness />}</div><span>{isPersonal ? "Potential relief records" : "Claimable business use"}</span><strong>{currency(isPersonal ? totals.relief : totals.business)}</strong><small>{isPersonal ? "Subject to YA limits" : `${Math.round((totals.business / Math.max(totals.total, 1)) * 100)}% of recorded spend`}</small></article>
              <article><div className="metric-icon lavender"><Gauge /></div><span>Receipts processed</span><strong>{entityReceipts.length}</strong><small>{isPersonal ? "Personal account only" : isCompany ? "Company account only" : "Sole proprietor only"}</small></article>
              <article className={totals.review ? "needs-review" : ""}><div className="metric-icon yellow"><AlertCircle /></div><span>Needs review</span><strong>{totals.review}</strong><small>Check tax purpose</small></article>
            </section>

            <section className="two-column">
              <div className="panel spending-panel"><div className="panel-head"><div><h3>Spending by category</h3><p>{isPersonal ? "Sim Lip Geap · Personal" : isCompany ? "Solver Academy · Sdn. Bhd." : "Sim Lip Geap · Sole proprietor"}</p></div><button>Jul 2026 <ChevronDown /></button></div><div className="category-bars">
                {(isPersonal ? ["Medical", "Lifestyle", "Insurance", "Zakat", "Food & Beverage"] as Category[] : ["Advertising & Marketing", "Petrol", "Mobile", "Software & Subscriptions", "Stationery"] as Category[]).map((category) => {
                  const amount = entityReceipts.filter((r) => r.category === category).reduce((sum, r) => sum + r.amount, 0);
                  const Icon = categoryMeta[category].icon;
                  return <div className="bar-row" key={category}><span className={`cat-icon ${categoryMeta[category].tone}`}><Icon /></span><div><span>{category}</span><div className="bar"><i style={{ width: `${Math.max(8, Math.min(100, (amount / Math.max(totals.total, 1)) * 180))}%` }}></i></div></div><strong>{currency(amount)}</strong></div>;
                })}
              </div></div>
              <div className="panel tax-readiness"><div className="panel-head"><div><h3>Tax readiness</h3><p>Form {currentForm} · YA 2026</p></div><span className="score">{filingPercent}%</span></div><div className="donut" style={{ background: `conic-gradient(var(--green) 0 ${filingPercent}%, #edf0ed ${filingPercent}%)` }}><div><strong>{filingPercent}%</strong><span>ready</span></div></div><ul><li><span className="dot green"></span><div><b>{entityReceipts.length - totals.review} receipts categorised</b><small>{isPersonal ? "Relief and personal spend separated" : isCompany ? "Company records documented" : "Sole proprietor records documented"}</small></div><Check /></li><li><span className="dot orange"></span><div><b>{totals.review} receipt needs attention</b><small>{isPersonal ? "Relief eligibility not confirmed" : "Business purpose not confirmed"}</small></div><ChevronRight /></li></ul><button className="text-button" onClick={() => setTab(isCompany ? "ledger" : "tax")}>{isCompany ? "Open General Ledger" : "Open tax checklist"} <ArrowUpRight /></button></div>
            </section>

            <ReceiptTable entity={entity} receipts={filtered.slice(0, 5)} query={query} setQuery={setQuery} onViewAll={() => setTab("receipts")} onEdit={(receipt) => { setDraft(receipt); setUploadOpen(true); }} onExport={exportCsv} />
          </div>
        )}

        {tab === "receipts" && <div className="content"><ReceiptTable entity={entity} receipts={filtered} query={query} setQuery={setQuery} onViewAll={() => { setDraft(null); setUploadOpen(true); }} onEdit={(receipt) => { setDraft(receipt); setUploadOpen(true); }} onExport={exportCsv} full /></div>}

        {tab === "bank" && (
          <div className="content feature-page">
            <section className="feature-hero compact"><div><span className="pill"><Landmark /> Bank matching</span><h2>Find payments without receipts.</h2><p>Import a Malaysian bank or e-wallet CSV. AMS matches amount, date and merchant so nothing is missed.</p></div><label className="dark-button file-button"><FileUp /> Import statement<input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && importBankStatement(e.target.files[0])} /></label></section>
            <section className="metric-grid bank-metrics"><article><div className="metric-icon mint"><BadgeCheck /></div><span>Auto-matched</span><strong>{bankRows.filter((r) => r.status === "Matched").length}</strong><small>{currency(bankRows.filter((r) => r.status === "Matched").reduce((s, r) => s + r.amount, 0))} linked to receipts</small></article><article><div className="metric-icon yellow"><AlertCircle /></div><span>Missing receipts</span><strong>{bankRows.filter((r) => r.status !== "Matched").length}</strong><small>{currency(bankRows.filter((r) => r.status !== "Matched").reduce((s, r) => s + r.amount, 0))} needs evidence</small></article><article><div className="metric-icon lavender"><WalletCards /></div><span>Statement total</span><strong>{currency(bankRows.reduce((s, r) => s + r.amount, 0))}</strong><small>Latest CSV import</small></article><article><div className="metric-icon peach"><ShieldCheck /></div><span>Match rate</span><strong>{Math.round(bankRows.filter((r) => r.status === "Matched").length / Math.max(bankRows.length, 1) * 100)}%</strong><small>{bankRows.filter((r) => r.status === "Matched").length} of {bankRows.length} transactions</small></article></section>
            <section className="panel data-panel"><div className="panel-head"><div><h3>Imported statement</h3><p>CSV matching by amount and receipt record</p></div><span className="safe-chip"><ShieldCheck /> Browser-local</span></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Bank description</th><th>Matched receipt</th><th>Status</th><th>Amount</th></tr></thead><tbody>{bankRows.map((item, index) => <tr key={`${item.description}-${index}`}><td>{item.date}</td><td><strong>{item.description}</strong></td><td>{item.matched || <button className="link-action" onClick={() => { setDraft(null); setUploadOpen(true); }}>+ Add receipt</button>}</td><td><span className={`match-status ${item.status === "Matched" ? "matched" : "missing"}`}>{item.status === "Matched" ? <Check /> : <AlertCircle />}{item.status}</span></td><td><strong>{currency(item.amount)}</strong></td></tr>)}</tbody></table></div></section>
          </div>
        )}

        {tab === "myinvois" && (
          <div className="content feature-page">
            <section className="feature-hero myinvois-hero"><div><span className="pill"><ScanLine /> Malaysia e-Invoice</span><h2>Keep receipts and MyInvois together.</h2><p>{currentName} · {currentAccountLabel}. Imported UUID records remain inside this selected account and are marked Review until you confirm their business treatment.</p><div className="hero-actions"><label className="dark-button file-button"><FileUp /> Import MyInvois file<input type="file" accept=".csv,.json,application/json,text/csv" onChange={(e) => e.target.files?.[0] && importMyInvois(e.target.files[0])} /></label><button className="secondary" disabled title="Camera QR verification is not enabled in this browser-local version"><ScanLine /> QR scan unavailable</button></div></div><div className="einvoice-card"><span className="einvoice-brand">MY<span>INVOIS</span></span><div className="qr-placeholder"><ScanLine /></div><small>{entityInvoices.length ? "UUID RECORDED" : "AWAITING IMPORT"}</small><strong>{entityInvoices[0]?.myInvoisUuid || "No UUID yet"}</strong><p>{entityInvoices[0] ? `${entityInvoices[0].merchant} · ${currency(entityInvoices[0].amount)}` : `${currentName} · ${currentAccountLabel}`}</p><span className="verified-line">{entityInvoices.length ? <Check /> : <AlertCircle />}{entityInvoices.length ? "Reference linked" : "Import a MyInvois file"}</span></div></section>
            <section className="integration-grid"><article className="panel"><span className="mini-icon green"><BadgeCheck /></span><div><h3>{entityInvoices.length} UUID-linked documents</h3><p>Recorded references; not API-validated by AMS</p></div></article><article className="panel"><span className="mini-icon yellow"><AlertCircle /></span><div><h3>{entityReceipts.length - entityInvoices.length} receipts without UUID</h3><p>Normal receipt or exempt supplier</p></div></article><article className="panel"><span className="mini-icon violet"><ShieldCheck /></span><div><h3>Account isolation</h3><p>No records from another taxpayer appear here</p></div></article></section>
            <section className="panel data-panel"><div className="panel-head"><div><h3>e-Invoice register</h3><p>{currentName} · {currentAccountLabel}</p></div><a href="https://mytax.hasil.gov.my" target="_blank" rel="noreferrer" className="text-button">Open MyTax <ArrowUpRight /></a></div><div className="einvoice-list">{entityInvoices.map((receipt) => { const Icon = categoryMeta[receipt.category].icon; return <div key={receipt.id}><span className="cat-icon green"><Icon /></span><p><b>{receipt.merchant}</b><small>{receipt.date} · {receipt.category}</small></p><code>{receipt.myInvoisUuid}</code><strong>{currency(receipt.amount)}</strong><span className="status-ready"><Check /> Recorded</span></div>; })}{!entityInvoices.length && <div className="empty-invoices"><ScanLine /><p><b>No MyInvois records in this account</b><small>Import a CSV/JSON file or add a UUID to a receipt.</small></p></div>}</div></section>
          </div>
        )}

        {!isPersonal && (["ledger", "pl", "balance", "cashflow", "tax"] as string[]).includes(tab) && <CompanyAccounting key={isCompany ? "company-ledger" : "sole-proprietor-ledger"} mode={isCompany ? "company" : "soleProprietor"} view={tab as CompanyAccountingView} receipts={isCompany ? companyAccountingReceipts : soleProprietorAccountingReceipts} onToast={(message) => { setToast(message); setTimeout(() => setToast(""), 3600); }} />}

        {tab === "filing" && (
          <div className="content filing-page">
            <section className="filing-hero">
              <div>
                <span className="pill"><ClipboardCheck /> YA 2026 preparation</span>
                <h2>Borang {activeForm} information, all in one place.</h2>
                <p>{isPersonal ? "Collect Sim Lip Geap’s employment income, other non-business income, relief, rebate and tax-payment records before filing." : isCompany ? "Prepare Solver Academy Sdn. Bhd.’s MPERS financial statements, tax computation, CP204 records, Form C and MITRS documents." : "Prepare Sim Lip Geap’s sole proprietor P&L, tax adjustments, CP500 payments, personal reliefs and Borang B records."}</p>
                <div className="hero-actions"><button className="dark-button" onClick={saveFilingChecklist} disabled={savingChecklist}>{savingChecklist ? <LoaderCircle className="spinner-inline" /> : <Save />} {savingChecklist ? "Saving…" : "Save checklist"}</button><a className="secondary filing-link" href="https://mytax.hasil.gov.my" target="_blank" rel="noreferrer">Open MyTax <ArrowUpRight /></a></div>
              </div>
              <div className="filing-score-ring" style={{ "--filing-progress": `${filingPercent}%` } as CSSProperties}><div><strong>{filingPercent}%</strong><span>information ready</span></div></div>
            </section>

            {isCompany && <section className="legal-warning confirmed"><ShieldCheck /><div><strong>Legal entity confirmed: Solver Academy Sdn. Bhd.</strong><p>This company workspace uses Borang C and MPERS. It is completely separated from Sim Lip Geap’s personal Borang BE and sole proprietor Borang B records.</p></div></section>}
            {entity === "business" && <section className="legal-warning confirmed"><ShieldCheck /><div><strong>Legal entity confirmed: individual sole proprietor</strong><p>This workspace uses Borang B and remains separate from Solver Academy Sdn. Bhd.’s Borang C accounts.</p></div></section>}
            <section className="auto-calc-note"><CircleDollarSign /><div><strong>{isPersonal ? "Receipt-linked amounts update automatically" : isCompany ? "Company receipts create draft journals" : "Form B receipts create draft journals"}</strong><p>{isPersonal ? "Only receipts marked as Relief flow into matching fields. Annual relief limits are not applied automatically, so review the final claim before filing." : isCompany ? "A company receipt affects P&L, Balance Sheet, Cash Flow and Form C only after its balanced journal and business purpose are confirmed and posted." : "A sole proprietor receipt affects the Form B P&L, Balance Sheet and Cash Flow only after its balanced journal and business purpose are confirmed and posted."}</p></div></section>

            <section className="filing-summary">
              <article><span className="mini-icon green"><ClipboardCheck /></span><div><small>Completed</small><strong>{filingDone} / {filingItems.length}</strong></div></article>
              <article><span className="mini-icon yellow"><AlertCircle /></span><div><small>Required still missing</small><strong>{filingItems.filter((item) => item.required && !filingChecks[item.key]).length}</strong></div></article>
              <article><span className="mini-icon mint"><CircleDollarSign /></span><div><small>Auto-filled from receipts</small><strong>{autoFilledFields} fields</strong></div></article>
              <article><span className="mini-icon violet"><BookOpen /></span><div><small>Information sections</small><strong>{currentFilingSections.length}</strong></div></article>
              <article><span className="mini-icon blue"><Archive /></span><div><small>Record retention</small><strong>7 years</strong></div></article>
            </section>

            <div className="filing-sections">
              {currentFilingSections.map((section, sectionIndex) => {
                const sectionDone = section.items.filter((item) => filingChecks[`${section.id}:${item.id}`]).length;
                return <section className="panel filing-section" key={section.id}>
                  <div className="filing-section-head"><span>{String(sectionIndex + 1).padStart(2, "0")}</span><div><h3>{section.title}</h3><p>{section.note}</p></div><strong>{sectionDone}/{section.items.length}</strong></div>
                  <div className="filing-list">{section.items.map((item) => {
                    const itemKey = `${section.id}:${item.id}`;
                    const checked = Boolean(filingChecks[itemKey]);
                    const autoAmount = autoFilingAmounts[itemKey];
                    const isManual = manualAmountKeys.includes(itemKey);
                    const amountValue: number | "" = isManual ? (filingAmounts[itemKey] ?? 0) : autoAmount?.amount ? Number(autoAmount.amount.toFixed(2)) : "";
                    return <div className={`filing-row ${checked ? "checked" : ""}`} key={itemKey}>
                      <button type="button" className="filing-check" aria-label={`Mark ${item.label} ${checked ? "not ready" : "ready"}`} onClick={() => setFilingChecks((current) => ({ ...current, [itemKey]: !checked }))}>{checked && <Check />}</button>
                      <button type="button" className="filing-copy" onClick={() => setFilingChecks((current) => ({ ...current, [itemKey]: !checked }))}><b>{item.label}</b><small>{item.detail}</small></button>
                      {item.required && <span className="required-chip">Required</span>}
                      {monetaryFilingKeys.has(itemKey) && <div className={`filing-amount ${isManual ? "manual" : autoAmount?.amount ? "automatic" : "empty"}`}>
                        <label><span>RM</span><input type="number" min="0" step="0.01" value={amountValue} placeholder="0.00" aria-label={`${item.label} amount in ringgit`} onChange={(event) => {
                          const value = event.target.value;
                          if (value === "") {
                            setFilingAmounts((current) => { const next = { ...current }; delete next[itemKey]; return next; });
                            setManualAmountKeys((current) => current.filter((key) => key !== itemKey));
                            return;
                          }
                          setFilingAmounts((current) => ({ ...current, [itemKey]: Math.max(0, Number(value)) }));
                          setManualAmountKeys((current) => current.includes(itemKey) ? current : [...current, itemKey]);
                        }} /></label>
                        <small>{isManual ? "Manual amount" : autoAmount?.amount ? `${autoAmount.receiptCount} receipt${autoAmount.receiptCount === 1 ? "" : "s"} · Auto-filled` : "Enter amount"}</small>
                        {isManual && autoAmount && <button type="button" className="reset-auto" onClick={() => { setManualAmountKeys((current) => current.filter((key) => key !== itemKey)); setFilingAmounts((current) => { const next = { ...current }; delete next[itemKey]; return next; }); }}><RotateCcw /> Use automatic</button>}
                      </div>}
                    </div>;
                  })}</div>
                </section>;
              })}
            </div>

            <section className="filing-source-note"><ShieldCheck /><div><strong>{isCompany ? "Company rules linked to official HASiL Form C, CP204 and MITRS sources" : "YA 2026 preparation using the latest official HASiL sources"}</strong><p>{isCompany ? "This is a preparation checklist. Confirm final tax rates, incentives, capital allowance classes and filing positions before submission." : "Recheck eligibility, limits and the final YA 2026 form when HASiL releases it."} AMS organises records and does not replace a licensed tax agent.</p></div><a href={isCompany ? "https://www.hasil.gov.my/en/company/corporate-tax/" : "https://www.hasil.gov.my/en/individual/individual-life-cycle/income-declaration/"} target="_blank" rel="noreferrer">Official HASiL source <ArrowUpRight /></a></section>
          </div>
        )}

        {tab === "tax" && entity === "personal" && (
          <div className="content tax-page">
            <div className="tax-switch"><button className="active">Form BE <small>Sim Lip Geap · selected</small></button></div>
            <section className="form-warning"><ShieldCheck /><div><strong>You selected Form BE</strong><p>Solver Academy Sdn. Bhd. records are excluded. Only personal income, rebates and eligible relief evidence appear here.</p></div></section>
            <section className="report-hero"><div><span className="pill"><FileCheck2 /> YA 2026 preparation</span><h2>Your personal relief records are organised.</h2><p>Relief limits can change by year. Confirm final YA 2026 eligibility and limits after HASiL publishes the official rules.</p></div><button className="dark-button" onClick={exportCsv}><Download /> Export summary</button></section>
            <section className="report-grid"><div className="panel relief-panel"><div className="panel-head"><div><h3>Sim Lip Geap · Personal relief records</h3><p>Potential Form BE evidence · not company expenses</p></div><strong>{currency(totals.relief)}</strong></div>{(["Medical", "Lifestyle", "Education", "Insurance", "EPF & SOCSO", "Zakat"] as Category[]).map((category) => { const items = entityReceipts.filter((r) => r.category === category && r.taxUse === "Relief"); const amount = items.reduce((sum, r) => sum + r.amount, 0); const Icon = categoryMeta[category].icon; return <div className="relief-row" key={category}><span className={`cat-icon ${categoryMeta[category].tone}`}><Icon /></span><div><b>{category}</b><small>{items.length ? `${items.length} supporting record${items.length > 1 ? "s" : ""}` : "No record uploaded"}</small></div><strong>{currency(amount)}</strong><span className={items.length ? "status-ready" : "review-chip"}>{items.length ? <Check /> : <AlertCircle />}{items.length ? "Recorded" : "Add record"}</span></div>; })}</div><aside className="panel filing-note"><span className="mini-icon"><ShieldCheck /></span><h3>Form BE protection</h3><p>Solver Academy Sdn. Bhd.’s General Ledger and Form C records are completely hidden from Sim Lip Geap’s personal account.</p><ol><li>Confirm employment-only filing status</li><li>Review annual relief limits</li><li>Keep supporting documents for seven years</li></ol></aside></section>
          </div>
        )}

        {tab === "audit" && (
          <div className="content feature-page">
            <section className="feature-hero audit-hero"><div><span className="pill"><Archive /> LHDN record support</span><h2>One evidence pack. Seven-year-ready.</h2><p>Bundle your receipt register, business purpose, bank matching and MyInvois references for your accountant or future review.</p><button className="dark-button" onClick={downloadAuditPack}><Download /> Download Audit Pack</button></div><div className="archive-visual"><Archive /><strong>YA 2026</strong><span>Indicative target if filed in 2027</span><b>31 Dec 2034</b></div></section>
            <section className="audit-grid"><article className="panel"><span className="check-circle"><Check /></span><h3>{isCompany ? "Solver Academy Sdn. Bhd." : "Sim Lip Geap"} register</h3><p>{entityReceipts.length} records with categories and source-file references.</p></article><article className="panel"><span className="check-circle"><Check /></span><h3>{isPersonal ? "Relief evidence" : "Business purpose"}</h3><p>{entityReceipts.filter((r) => r.businessPurpose).length} records documented; {entityReceipts.filter((r) => r.taxUse === "Review").length} needs review.</p></article><article className="panel"><span className="check-circle"><Check /></span><h3>{isPersonal ? "Personal-only account" : "Bank reconciliation"}</h3><p>{isPersonal ? "No business or company expenses included." : `${bankRows.filter((row) => row.status === "Matched").length} matched transactions and ${bankRows.filter((row) => row.status !== "Matched").length} missing receipts.`}</p></article><article className="panel"><span className="check-circle"><Check /></span><h3>{isPersonal ? "Form BE register" : isCompany ? "Form C and MyInvois register" : "Form B register"}</h3><p>{isPersonal ? `${entityReceipts.filter((r) => r.taxUse === "Relief").length} potential relief records.` : isCompany ? "Company accounting and recorded MyInvois UUID references are included; API validation evidence remains separate." : "Sole proprietor records stay separate from the Sdn. Bhd."}</p></article></section>
            <section className="panel retention"><ShieldCheck /><div><h3>Retention reminder is active</h3><p>Keep the YA 2026 records through the applicable seven-year period. Browser-only data is not a guaranteed backup, so export a copy for your own secure storage and tax agent.</p></div><span className="safe-chip">7 years</span></section>
          </div>
        )}
      </section>

      {uploadOpen && <UploadModal draft={draft} setDraft={setDraft} processing={processing} progress={progress} fileRef={fileRef} onFile={handleFile} onClose={() => { setUploadOpen(false); setDraft(null); }} onSave={saveReceipt} />}
      {menuOpen && <button className="menu-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      {toast && <div className="toast"><Check /> {toast}</div>}
    </main>
  );
}

function ReceiptTable({ entity, receipts, query, setQuery, onViewAll, onEdit, onExport, full = false }: { entity: Entity; receipts: Receipt[]; query: string; setQuery: (v: string) => void; onViewAll: () => void; onEdit: (receipt: Receipt) => void; onExport: () => void; full?: boolean }) {
  const accountName = entity === "company" ? "Solver Academy" : "Sim Lip Geap";
  const accountKind = entity === "personal" ? "personal" : entity === "company" ? "company" : "sole proprietor";
  return <section className="panel receipt-list">
    <div className="panel-head"><div><h3>{full ? `${accountName} receipts` : "Recent receipts"}</h3><p>{full ? `Only ${accountKind} records are shown` : "Automatically extracted and categorised"}</p></div><div className="table-actions">{full && <><label className="search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipts" /></label><button className="text-button" onClick={onExport}><Download /> Export CSV</button></>}<button className="text-button" onClick={onViewAll}>{full ? "Add receipt" : "View all"} <ArrowUpRight /></button></div></div>
    <div className="table-wrap"><table><thead><tr><th>Merchant</th><th>Date</th><th>Category</th><th>Tax use</th><th>{entity === "personal" ? "Account" : "Business use"}</th><th>{entity === "personal" ? "Amount" : "Claimable"}</th><th></th></tr></thead><tbody>{receipts.map((receipt) => {
      const Icon = categoryMeta[receipt.category].icon;
      const shownAmount = entity === "personal" ? receipt.amount : receipt.taxUse === "Business" ? receipt.amount * receipt.businessUse / 100 : 0;
      return <tr key={receipt.id}><td><div className="merchant"><span className={`cat-icon ${categoryMeta[receipt.category].tone}`}><Icon /></span><div><b>{receipt.merchant}</b><small>{receipt.myInvoisUuid ? `MyInvois ${receipt.myInvoisUuid}` : `${receipt.confidence}% category match`}</small></div></div></td><td>{receipt.date}</td><td><span className="category-label">{receipt.category}</span></td><td><span className={`tax-use ${receipt.taxUse.toLowerCase()}`}>{receipt.taxUse === "Review" ? <AlertCircle /> : receipt.taxUse === "Relief" ? <FileCheck2 /> : null}{receipt.taxUse}</span></td><td>{entity === "personal" ? "Personal" : receipt.taxUse === "Business" ? `${receipt.businessUse}%` : "—"}</td><td><strong>{currency(shownAmount)}</strong>{entity !== "personal" && <small className="gross-amount">gross {currency(receipt.amount)}</small>}</td><td><button className="more" aria-label={`Edit ${receipt.merchant}`} onClick={() => onEdit(receipt)}><Pencil /></button></td></tr>;
    })}</tbody></table></div>
  </section>;
}

function UploadModal({ draft, setDraft, processing, progress, fileRef, onFile, onClose, onSave }: { draft: Receipt | null; setDraft: (r: Receipt) => void; processing: boolean; progress: number; fileRef: React.RefObject<HTMLInputElement | null>; onFile: (f: File) => void; onClose: () => void; onSave: (e: FormEvent) => void }) {
  const personalCategories: Category[] = ["Medical", "Lifestyle", "Education", "Insurance", "EPF & SOCSO", "Zakat", "Food & Beverage", "Entertainment", "Mobile", "Others"];
  const businessCategories: Category[] = ["Food & Beverage", "Stationery", "Petrol", "Toll Fee", "Mobile", "Entertainment", "Office Rent", "Software & Subscriptions", "Professional Fees", "Advertising & Marketing", "Utilities", "Others"];
  const draftAccount = draft?.entity === "personal" ? "Sim Lip Geap · Personal" : draft?.entity === "company" ? "Solver Academy · Sdn. Bhd." : "Sim Lip Geap · Sole proprietor";
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title"><div className="modal">
    <div className="modal-head"><div><span className="pill"><Sparkles /> {draftAccount}</span><h2 id="upload-title">{draft ? "Review receipt" : "Upload a receipt"}</h2><p>This receipt will stay inside the selected account.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button></div>
    {!draft ? <button className={`dropzone ${processing ? "processing" : ""}`} disabled={processing} onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) onFile(file); }}>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {processing ? <><LoaderCircle className="spinner" /><strong>Reading your receipt…</strong><span>Extracting merchant, amount and category</span><div className="progress"><i style={{ width: `${progress}%` }}></i></div><small>{progress}% complete</small></> : <><span className="upload-icon"><Paperclip /></span><strong>Drop your receipt here</strong><span>or click to choose a photo</span><small>JPG, PNG or WEBP · up to 10 MB</small></>}
    </button> : <form onSubmit={onSave} className="receipt-form">
      <div className="detected"><span><Check /></span><div><strong>{draft.entity === "personal" ? "Personal account detected" : draft.entity === "company" ? "Sdn. Bhd. account detected" : "Sole proprietor account detected"}</strong><small>{draft.confidence}% category confidence · Please confirm</small></div></div>
      <div className="form-row"><label>Merchant<input maxLength={160} value={draft.merchant} onChange={(e) => setDraft({ ...draft, merchant: e.target.value })} required /></label><label>Receipt date<input type="date" value={isoDate(draft.date)} onChange={(e) => setDraft({ ...draft, date: displayDate(e.target.value) })} required /></label></div>
      <div className="form-row"><label>Amount (RM)<input type="number" step="0.01" min="0.01" max="999999999.99" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} required /></label><label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>{(draft.entity === "personal" ? personalCategories : businessCategories).map((category) => <option key={category}>{category}</option>)}</select></label></div>
      {draft.entity !== "personal" && <label>Paid from / liability<select value={draft.paymentAccountCode || "1010"} onChange={(e) => setDraft({ ...draft, paymentAccountCode: e.target.value })}>
        <option value="1010">Business bank account</option><option value="1000">Cash on hand</option><option value="2000">Trade payables (not paid yet)</option><option value={draft.entity === "company" ? "2600" : "3000"}>{draft.entity === "company" ? "Paid by director" : "Paid personally by owner"}</option>
      </select></label>}
      <label>Tax treatment<div className={`segmented ${draft.entity === "personal" ? "" : "four"}`}>{(draft.entity === "personal" ? ["Relief", "Personal", "Review"] as const : ["Business", "Personal", "Review"] as const).map((value) => <button type="button" className={draft.taxUse === value ? "active" : ""} onClick={() => setDraft({ ...draft, taxUse: value, businessUse: value === "Business" ? Math.max(draft.businessUse, 1) : draft.businessUse })} key={value}>{value}</button>)}</div></label>
      {draft.taxUse === "Business" && <><div className="form-row"><label>Business use<input type="range" min="1" max="100" value={Math.max(1, draft.businessUse)} onChange={(e) => setDraft({ ...draft, businessUse: Number(e.target.value) })} /><span className="range-value">{Math.max(1, draft.businessUse)}% · claimable {currency(draft.amount * Math.max(1, draft.businessUse) / 100)}</span></label><label>MyInvois UUID (optional)<input maxLength={160} value={draft.myInvoisUuid || ""} onChange={(e) => setDraft({ ...draft, myInvoisUuid: e.target.value })} placeholder="MyInvois document UUID" /></label></div><label>Business purpose<input maxLength={500} value={draft.businessPurpose || ""} onChange={(e) => setDraft({ ...draft, businessPurpose: e.target.value })} placeholder="Required before posting, e.g. client visit" /></label></>}
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit"><Check /> Save to {draftAccount}</button></div>
    </form>}
  </div></div>;
}
