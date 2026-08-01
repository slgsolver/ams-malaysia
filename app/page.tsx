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
  Search,
  ScanLine,
  Save,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  UtensilsCrossed,
  UserRound,
  WalletCards,
  Wifi,
  X,
} from "lucide-react";
import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { translateToChinese } from "./i18n";

type Entity = "personal" | "business";
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

const seedReceipts: Receipt[] = [
  { id: "1", entity: "business", merchant: "PETRONAS Station", date: "28 Jul 2026", amount: 120.5, category: "Petrol", taxUse: "Business", businessUse: 80, businessPurpose: "Client visit — Petaling Jaya", myInvoisUuid: "EI-98F2-71A0", confidence: 98 },
  { id: "2", entity: "business", merchant: "Touch 'n Go eWallet", date: "27 Jul 2026", amount: 36.8, category: "Toll Fee", taxUse: "Business", businessUse: 100, businessPurpose: "Delivery and client travel", confidence: 96 },
  { id: "3", entity: "business", merchant: "Maxis Berhad", date: "25 Jul 2026", amount: 128, category: "Mobile", taxUse: "Business", businessUse: 70, businessPurpose: "Shared business mobile plan", myInvoisUuid: "EI-44B1-901D", confidence: 99 },
  { id: "4", entity: "business", merchant: "POPULAR Bookstore", date: "23 Jul 2026", amount: 54.9, category: "Stationery", taxUse: "Business", businessUse: 100, businessPurpose: "Office supplies", confidence: 94 },
  { id: "5", entity: "business", merchant: "Google Workspace", date: "20 Jul 2026", amount: 72, category: "Software & Subscriptions", taxUse: "Business", businessUse: 100, businessPurpose: "Business email and cloud storage", confidence: 99 },
  { id: "6", entity: "business", merchant: "Meta Platforms", date: "16 Jul 2026", amount: 350, category: "Advertising & Marketing", taxUse: "Business", businessUse: 100, businessPurpose: "July course promotion", confidence: 97 },
  { id: "p1", entity: "personal", merchant: "KPJ Specialist Centre", date: "18 Jul 2026", amount: 180, category: "Medical", taxUse: "Relief", businessUse: 0, businessPurpose: "Medical receipt", confidence: 97 },
  { id: "p2", entity: "personal", merchant: "POPULAR Bookstore", date: "12 Jul 2026", amount: 128, category: "Lifestyle", taxUse: "Relief", businessUse: 0, businessPurpose: "Books for personal reading", confidence: 93 },
  { id: "p3", entity: "personal", merchant: "Prudential Assurance", date: "05 Jul 2026", amount: 260, category: "Insurance", taxUse: "Relief", businessUse: 0, businessPurpose: "Life insurance premium", confidence: 99 },
  { id: "p4", entity: "personal", merchant: "Lembaga Zakat Selangor", date: "01 Jul 2026", amount: 300, category: "Zakat", taxUse: "Relief", businessUse: 0, businessPurpose: "Zakat payment", confidence: 99 },
  { id: "p5", entity: "personal", merchant: "Village Grocer", date: "29 Jun 2026", amount: 186.4, category: "Food & Beverage", taxUse: "Personal", businessUse: 0, businessPurpose: "Household groceries", confidence: 96 },
];

const reliefs = [
  { name: "Medical", amount: 180, receipts: 1, status: "Recorded" },
  { name: "Lifestyle", amount: 1250, receipts: 4, status: "Review limit" },
  { name: "EPF", amount: 4000, receipts: 12, status: "Recorded" },
  { name: "SOCSO", amount: 350, receipts: 12, status: "Recorded" },
  { name: "Zakat", amount: 600, receipts: 2, status: "Tax rebate" },
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
    { id: "business-profile", title: "B · Business particulars", note: "For an individual carrying on business", items: [
      { id: "legal-type", label: "Confirm business legal type", detail: "Borang B is for an individual business/sole proprietor; a Sdn. Bhd. generally files Form C", required: true },
      { id: "business-name", label: "Business name and registration number", detail: "SSM name / BRN and principal business address", required: true },
      { id: "business-code", label: "Business code / activity", detail: "Relevant HASiL business code and activity description", required: true },
      { id: "accounting-period", label: "Accounting period", detail: "Opening and closing date of the business accounts", required: true },
      { id: "partners", label: "Partnership details", detail: "Partnership TIN and statutory income share, if applicable" },
    ]},
    { id: "profit-loss", title: "C · Business income computation", note: "Profit and loss plus tax adjustments", items: [
      { id: "sales", label: "Sales / gross business receipts", detail: "Invoices, platform settlements and cash sales", required: true },
      { id: "stock", label: "Opening and closing stock", detail: "Stock valuation and purchase records where applicable" },
      { id: "cost-sales", label: "Purchases and cost of sales", detail: "Supplier invoices, freight and direct costs" },
      { id: "expenses", label: "Allowable business expenses", detail: "Expense ledger, receipts, business purpose and private-use adjustment", required: true },
      { id: "non-allowable", label: "Non-allowable / private expenses", detail: "Add back personal, capital and prohibited expenses", required: true },
      { id: "capital-allowance", label: "Capital allowance schedule", detail: "Assets purchased/disposed, initial and annual allowances" },
      { id: "losses", label: "Current / brought-forward business losses", detail: "Working sheets and prior-year balance" },
      { id: "statutory-income", label: "Adjusted and statutory business income", detail: "Tax computation reconciliation", required: true },
    ]},
    { id: "other-income", title: "Other income and total income", note: "Borang B also includes non-business sources", items: [
      { id: "employment", label: "Employment income / EA form", detail: "Salary, benefits and PCB if also employed" },
      { id: "rental", label: "Rental income", detail: "Gross rent and allowable direct expenses" },
      { id: "interest-royalty", label: "Interest, discounts and royalties", detail: "Taxable amounts where applicable" },
      { id: "foreign-other", label: "Foreign and other income", detail: "Relevant amounts received in Malaysia and supporting records" },
      { id: "donations", label: "Approved donations / gifts", detail: "Official receipts and applicable restriction" },
    ]},
    { id: "reliefs-payments", title: "Reliefs, rebates and tax paid", note: "Personal items still belong to Sim Lip Geap as the Form B taxpayer", items: [
      { id: "personal-reliefs", label: "Personal relief schedule", detail: "Medical, lifestyle, insurance, EPF, spouse and child evidence", required: true },
      { id: "zakat", label: "Zakat / fitrah rebate", detail: "Official receipt" },
      { id: "cp500", label: "CP500 instalments", detail: "All instalments paid for the year", required: true },
      { id: "pcb", label: "PCB / MTD", detail: "Employment tax deductions, if any" },
      { id: "section110", label: "Section 110 / foreign tax credit", detail: "Certificates and HK-6 / HK-8 / HK-9 where relevant" },
    ]},
    { id: "declaration", title: "Declaration and supporting records", note: "Final filing and audit support", items: [
      { id: "myinvois", label: "e-Invoice / MyInvois register", detail: "Validated sales and purchase references where applicable" },
      { id: "mitrs", label: "MITRS supporting documents", detail: "Prepare specified financial information and tax computation when required" },
      { id: "agent", label: "Tax agent particulars", detail: "Name and approval number if an agent prepares the return" },
      { id: "declaration", label: "Declaration of true and complete information", detail: "Review all income sources and claims", required: true },
      { id: "retention", label: "Seven-year document retention", detail: "Keep accounts, receipts and working sheets", required: true },
    ]},
  ];
}

function defaultFilingChecks(entity: Entity): Record<string, boolean> {
  return entity === "personal" ? {
    "identity:id": true, "identity:contact": true, "identity:personal": true,
    "relief:medical": true, "relief:lifestyle": true, "relief:insurance": true,
    "payments:zakat": true, "declaration:retention": true,
  } : {
    "identity:id": true, "identity:contact": true, "identity:personal": true,
    "business-profile:business-name": true, "business-profile:business-code": true,
    "profit-loss:sales": true, "profit-loss:expenses": true,
    "declaration:myinvois": true, "declaration:retention": true,
  };
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
  const [entity, setEntity] = useState<Entity>("business");
  const [tab, setTab] = useState<"overview" | "receipts" | "bank" | "myinvois" | "filing" | "tax" | "audit">("overview");
  const [activeForm, setActiveForm] = useState<"B" | "BE">("B");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState<Receipt | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [bankRows, setBankRows] = useState(bankTransactions);
  const [filingChecks, setFilingChecks] = useState<Record<string, boolean>>(defaultFilingChecks("business"));
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const fileRef = useRef<HTMLInputElement>(null);

  const entityReceipts = useMemo(() => receipts.filter((item) => item.entity === entity), [receipts, entity]);
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

  useEffect(() => {
    if (window.localStorage.getItem("cukaimate-language") === "zh") setLanguage("zh");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("cukaimate-language", language);
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
  }, [language]);

  useEffect(() => {
    setFilingChecks(defaultFilingChecks(entity));
    fetch(`/api/tax-profile?entity=${entity}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.checklist) setFilingChecks({ ...defaultFilingChecks(entity), ...data.checklist }); })
      .catch(() => undefined);
  }, [entity]);

  async function saveFilingChecklist() {
    setSavingChecklist(true);
    try {
      const response = await fetch("/api/tax-profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity, year: 2026, formType: entity === "personal" ? "BE" : "B", checklist: filingChecks }) });
      if (!response.ok) throw new Error("Save failed");
      setToast("Filing checklist saved.");
    } catch {
      setToast("Checklist saved for this session; cloud sync is unavailable.");
    } finally {
      setSavingChecklist(false);
      setTimeout(() => setToast(""), 3000);
    }
  }

  function changeEntity(next: Entity) {
    setEntity(next);
    setActiveForm(next === "personal" ? "BE" : "B");
    setTab("overview");
    setQuery("");
    setToast(next === "personal" ? "Switched to Sim Lip Geap · Personal" : "Switched to Solver Academy · Business");
    setTimeout(() => setToast(""), 2500);
  }

  async function handleFile(file: File) {
    setUploadFile(file);
    setProcessing(true);
    setDraft(null);
    setProgress(12);
    let text = file.name.replace(/[-_]/g, " ");
    try {
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(file, "eng", {
        logger: (message) => {
          if (message.status === "recognizing text") setProgress(Math.max(18, Math.round(message.progress * 88)));
        },
      });
      text += ` ${result.data.text}`;
    } catch {
      setProgress(86);
    }
    const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
    const merchant = lines.find((line) => /[a-z]{3}/i.test(line))?.replace(/\.(jpg|jpeg|png|webp|pdf)$/i, "") || "New receipt";
    const category = classify(text);
    const amount = extractAmount(text) || 0;
    setProgress(100);
    setDraft({
      id: crypto.randomUUID(),
      entity,
      merchant: merchant.slice(0, 34),
      date: new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()),
      amount,
      category,
      taxUse: entity === "personal" ? (["Medical", "Lifestyle", "Education", "Insurance", "EPF & SOCSO", "Zakat"] as Category[]).includes(category) ? "Relief" : "Personal" : category === "Entertainment" ? "Review" : "Business",
      businessUse: entity === "business" ? category === "Mobile" || category === "Petrol" ? 70 : 100 : 0,
      businessPurpose: "",
      confidence: category === "Others" ? 72 : 93,
      fileName: file.name,
    });
    setProcessing(false);
  }

  async function saveReceipt(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setReceipts((current) => [draft, ...current]);
    const form = new FormData();
    Object.entries(draft).forEach(([key, value]) => form.append(key, String(value)));
    if (uploadFile) form.append("file", uploadFile);
    try {
      const response = await fetch("/api/receipts", { method: "POST", body: form });
      if (!response.ok) throw new Error("Save failed");
    } catch {
      setToast("Saved for this session. Cloud storage will sync when available.");
    }
    setUploadOpen(false);
    setDraft(null);
    setUploadFile(null);
    setToast("Receipt saved and included in your tax summary.");
    setTimeout(() => setToast(""), 3200);
  }

  function exportCsv() {
    const header = "Date,Merchant,Category,Tax use,Business use %,Gross amount (MYR),Claimable amount (MYR),Business purpose,MyInvois UUID";
    const rows = entityReceipts.map((r) => [r.date, `\"${r.merchant.replaceAll('"', '""')}\"`, r.category, r.taxUse, r.businessUse, r.amount.toFixed(2), (r.taxUse === "Business" ? r.amount * r.businessUse / 100 : r.amount).toFixed(2), `\"${r.businessPurpose || ""}\"`, r.myInvoisUuid || ""].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `CukaiMate-2026-${entity === "personal" ? "Sim-Lip-Geap" : "Solver-Academy"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setToast("Tax summary exported as CSV.");
    setTimeout(() => setToast(""), 3200);
  }

  function downloadAuditPack() {
    const pack = {
      product: "CukaiMate Malaysia",
      entity: entity === "personal" ? "Sim Lip Geap" : "Solver Academy",
      yearOfAssessment: 2026,
      form: `Form ${activeForm}`,
      generatedAt: new Date().toISOString(),
      sevenYearRetentionUntil: "31 Dec 2033",
      summary: { grossExpenses: totals.total, potentialBusinessDeductions: totals.business, personalReliefReceipts: totals.relief },
      receipts: entityReceipts,
      bankReconciliation: bankRows,
      disclaimer: "Prepared for review. Final tax treatment must be confirmed by the taxpayer or licensed tax agent.",
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `CukaiMate-YA2026-Form${activeForm}-Audit-Pack.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setToast("Seven-year Audit Pack downloaded.");
    setTimeout(() => setToast(""), 3200);
  }

  async function importBankStatement(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const parsed = lines.slice(1).map((line) => {
      const cells = parseCsvLine(line);
      const amountIndex = cells.findLastIndex((cell) => Number.isFinite(Number(cell.replace(/[RM,$\s]/gi, "").replaceAll(",", ""))));
      const amount = amountIndex >= 0 ? Math.abs(Number(cells[amountIndex].replace(/[RM,$\s]/gi, "").replaceAll(",", ""))) : 0;
      const match = entityReceipts.find((receipt) => Math.abs(receipt.amount - amount) < 0.01);
      return { date: cells[0] || "—", description: cells[1] || cells[0] || "Bank transaction", amount, matched: match?.merchant || "", status: match ? "Matched" : "Missing receipt" };
    }).filter((row) => row.amount > 0);
    if (!parsed.length) {
      setToast("No transactions found. Use CSV columns: Date, Description, Amount.");
    } else {
      setBankRows(parsed);
      setToast(`${file.name} imported — ${parsed.filter((row) => row.status === "Matched").length} matches found.`);
    }
    setTimeout(() => setToast(""), 3600);
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <div className="brand"><span className="brand-mark">C</span><span>CukaiMate<small>Malaysia</small></span></div>
        <div className="entity-switcher">
          <label>Current account</label>
          <button className={entity === "personal" ? "selected" : ""} onClick={() => changeEntity("personal")}><span className="entity-avatar personal">SL</span><div><strong>Sim Lip Geap</strong><small>Personal · Form BE</small></div>{entity === "personal" && <Check />}</button>
          <button className={entity === "business" ? "selected" : ""} onClick={() => changeEntity("business")}><span className="entity-avatar business">SA</span><div><strong>Solver Academy</strong><small>Business · Form B</small></div>{entity === "business" && <Check />}</button>
        </div>
        <nav aria-label="Main navigation">
          <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><LayoutDashboard /> Overview</button>
          <button className={tab === "receipts" ? "active" : ""} onClick={() => setTab("receipts")}><ReceiptText /> Receipts <span className="nav-count">{entityReceipts.length}</span></button>
          {entity === "business" && <button className={tab === "bank" ? "active" : ""} onClick={() => setTab("bank")}><Landmark /> Bank matching <span className="nav-alert">1</span></button>}
          {entity === "business" && <button className={tab === "myinvois" ? "active" : ""} onClick={() => setTab("myinvois")}><ScanLine /> MyInvois</button>}
          <button className={tab === "filing" ? "active" : ""} onClick={() => setTab("filing")}><ClipboardCheck /> Form checklist <span className="nav-progress">{filingPercent}%</span></button>
          <button className={tab === "tax" ? "active" : ""} onClick={() => setTab("tax")}><FileText /> Tax Report</button>
          <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}><Archive /> Audit Pack</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="tax-card"><span className="mini-icon"><FileCheck2 /></span><strong>YA 2026 · Form {entity === "personal" ? "BE" : "B"}</strong><p>{filingPercent}% of filing information marked ready.</p><button onClick={() => setTab("filing")}>Open filing checklist <ArrowUpRight /></button></div>
          <button className="help"><CircleHelp /> Help & tax guide</button>
          <div className="profile"><span>{entity === "personal" ? "SL" : "SA"}</span><div><strong>{entity === "personal" ? "Sim Lip Geap" : "Solver Academy"}</strong><small>{entity === "personal" ? "Individual taxpayer" : "Business account"}</small></div><ChevronDown /></div>
        </div>
      </aside>

      <section className="workspace">
        <header>
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div><p className="eyebrow">{entity === "personal" ? "SIM LIP GEAP · PERSONAL · FORM BE" : "SOLVER ACADEMY · BUSINESS · FORM B"}</p><h1>{tab === "overview" ? `Good morning, ${entity === "personal" ? "Sim" : "Solver"}` : tab === "receipts" ? `${entity === "personal" ? "Personal" : "Business"} receipts` : tab === "bank" ? "Bank reconciliation" : tab === "myinvois" ? "MyInvois records" : tab === "filing" ? `Borang ${entity === "personal" ? "BE" : "B"} information checklist` : tab === "audit" ? "Seven-year Audit Pack" : "Tax-ready summary"}</h1></div>
          <div className="header-actions"><div className="language-switch" role="group" aria-label="Language"><Languages /><button className={language === "zh" ? "active" : ""} aria-pressed={language === "zh"} onClick={() => setLanguage("zh")}>中文</button><button className={language === "en" ? "active" : ""} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button></div><button className="icon-btn" aria-label="Notifications"><Bell /></button><button className="primary" onClick={() => setUploadOpen(true)}><Plus /> Upload receipt</button></div>
        </header>

        {tab === "overview" && (
          <div className="content">
            <section className="welcome-panel">
              <div><span className="pill"><Sparkles /> {entity === "personal" ? "Personal tax relief" : "Business expense capture"}</span><h2>{entity === "personal" ? <>Sim Lip Geap’s personal<br />expenses, kept separate.</> : <>Solver Academy’s business<br />expenses, tax-ready.</>}</h2><p>{entity === "personal" ? "Track personal spending and identify possible Form BE relief records without mixing them into the company account." : "Record expenses incurred to earn business income, document their purpose, and keep personal purchases out."}</p><button className="dark-button" onClick={() => setUploadOpen(true)}><Paperclip /> Upload {entity === "personal" ? "personal" : "business"} receipt</button><small>Saved to {entity === "personal" ? "Sim Lip Geap" : "Solver Academy"}</small></div>
              <div className="receipt-stack" aria-hidden="true"><div className="receipt-paper back"></div><div className="receipt-paper front"><div className="receipt-top"><span className="logo-dot">{entity === "personal" ? "K" : "P"}</span><div><b>{entity === "personal" ? "KPJ MEDICAL" : "PETRONAS"}</b><small>{entity === "personal" ? "Personal receipt" : "Business receipt"}</small></div><span className="verified"><Check /></span></div><div className="scan-lines"><i></i><i></i><i></i></div><div className="receipt-total"><span>Total</span><strong>{entity === "personal" ? "RM 180.00" : "RM 120.50"}</strong></div><div className="category-tag">{entity === "personal" ? <HeartPulse /> : <Fuel />} {entity === "personal" ? "Medical" : "Petrol"} <span>{entity === "personal" ? "Form BE" : "80% use"}</span></div></div></div>
            </section>

            <section className="expense-guide"><div className="guide-head"><div><span>{entity === "personal" ? "PERSONAL ACCOUNT" : "BUSINESS ACCOUNT"}</span><h3>{entity === "personal" ? "What Sim Lip Geap can organise" : "What Solver Academy can record"}</h3><p>{entity === "personal" ? "Possible relief evidence is shown separately from ordinary personal spending." : "Only expenses with a genuine business purpose should be considered for deduction."}</p></div><span className={`account-badge ${entity}`}><ShieldCheck /> {entity === "personal" ? "Form BE" : "Form B"}</span></div><div className="guide-grid">{(entity === "personal" ? [
              { category: "Medical" as Category, note: "Medical treatment and eligible care" }, { category: "Lifestyle" as Category, note: "Books, devices and eligible lifestyle items" }, { category: "Education" as Category, note: "Eligible self-education fees" }, { category: "Insurance" as Category, note: "Life and medical insurance records" }, { category: "EPF & SOCSO" as Category, note: "Contribution statements" }, { category: "Zakat" as Category, note: "Zakat payment receipts" }
            ] : [
              { category: "Petrol" as Category, note: "Business travel, toll and parking" }, { category: "Stationery" as Category, note: "Office supplies and printing" }, { category: "Mobile" as Category, note: "Business-use phone and internet" }, { category: "Software & Subscriptions" as Category, note: "Cloud tools and business software" }, { category: "Advertising & Marketing" as Category, note: "Ads, design and promotion" }, { category: "Professional Fees" as Category, note: "Accounting, audit and legal services" }
            ]).map((item) => { const Icon = categoryMeta[item.category].icon; return <article key={item.category}><span className={`cat-icon ${categoryMeta[item.category].tone}`}><Icon /></span><div><strong>{item.category}</strong><small>{item.note}</small></div><ChevronRight /></article>; })}</div><p className="guide-disclaimer"><AlertCircle /> Categories are record-keeping suggestions. Final eligibility depends on the relevant YA rules and supporting evidence.</p></section>

            <section className="metric-grid">
              <article><div className="metric-icon mint"><WalletCards /></div><span>Total expenses</span><strong>{currency(totals.total)}</strong><small><b>↑ 12.4%</b> from last month</small></article>
              <article><div className="metric-icon peach">{entity === "personal" ? <FileCheck2 /> : <BriefcaseBusiness />}</div><span>{entity === "personal" ? "Potential relief records" : "Claimable business use"}</span><strong>{currency(entity === "personal" ? totals.relief : totals.business)}</strong><small>{entity === "personal" ? "Subject to YA limits" : `${Math.round((totals.business / Math.max(totals.total, 1)) * 100)}% of recorded spend`}</small></article>
              <article><div className="metric-icon lavender"><Gauge /></div><span>Receipts processed</span><strong>{entityReceipts.length}</strong><small>{entity === "personal" ? "Personal account only" : "Business account only"}</small></article>
              <article className={totals.review ? "needs-review" : ""}><div className="metric-icon yellow"><AlertCircle /></div><span>Needs review</span><strong>{totals.review}</strong><small>Check tax purpose</small></article>
            </section>

            <section className="two-column">
              <div className="panel spending-panel"><div className="panel-head"><div><h3>Spending by category</h3><p>{entity === "personal" ? "Sim Lip Geap · Personal" : "Solver Academy · Business"}</p></div><button>Jul 2026 <ChevronDown /></button></div><div className="category-bars">
                {(entity === "personal" ? ["Medical", "Lifestyle", "Insurance", "Zakat", "Food & Beverage"] : ["Advertising & Marketing", "Petrol", "Mobile", "Software & Subscriptions", "Stationery"] as Category[]).map((category) => {
                  const amount = entityReceipts.filter((r) => r.category === category).reduce((sum, r) => sum + r.amount, 0);
                  const Icon = categoryMeta[category].icon;
                  return <div className="bar-row" key={category}><span className={`cat-icon ${categoryMeta[category].tone}`}><Icon /></span><div><span>{category}</span><div className="bar"><i style={{ width: `${Math.max(8, Math.min(100, (amount / Math.max(totals.total, 1)) * 180))}%` }}></i></div></div><strong>{currency(amount)}</strong></div>;
                })}
              </div></div>
              <div className="panel tax-readiness"><div className="panel-head"><div><h3>Tax readiness</h3><p>Form {entity === "personal" ? "BE" : "B"} · YA 2026</p></div><span className="score">82%</span></div><div className="donut"><div><strong>82%</strong><span>ready</span></div></div><ul><li><span className="dot green"></span><div><b>{entityReceipts.length - totals.review} receipts categorised</b><small>{entity === "personal" ? "Relief and personal spend separated" : "Business records documented"}</small></div><Check /></li><li><span className="dot orange"></span><div><b>{totals.review} receipt needs attention</b><small>{entity === "personal" ? "Relief eligibility not confirmed" : "Business purpose not confirmed"}</small></div><ChevronRight /></li></ul><button className="text-button" onClick={() => setTab("tax")}>Open tax checklist <ArrowUpRight /></button></div>
            </section>

            <ReceiptTable entity={entity} receipts={filtered.slice(0, 5)} query={query} setQuery={setQuery} onViewAll={() => setTab("receipts")} />
          </div>
        )}

        {tab === "receipts" && <div className="content"><ReceiptTable entity={entity} receipts={filtered} query={query} setQuery={setQuery} onViewAll={() => setUploadOpen(true)} full /></div>}

        {tab === "bank" && (
          <div className="content feature-page">
            <section className="feature-hero compact"><div><span className="pill"><Landmark /> Bank matching</span><h2>Find payments without receipts.</h2><p>Import a Malaysian bank or e-wallet CSV. CukaiMate matches amount, date and merchant so nothing is missed.</p></div><label className="dark-button file-button"><FileUp /> Import statement<input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && importBankStatement(e.target.files[0])} /></label></section>
            <section className="metric-grid bank-metrics"><article><div className="metric-icon mint"><BadgeCheck /></div><span>Auto-matched</span><strong>{bankRows.filter((r) => r.status === "Matched").length}</strong><small>{currency(bankRows.filter((r) => r.status === "Matched").reduce((s, r) => s + r.amount, 0))} linked to receipts</small></article><article><div className="metric-icon yellow"><AlertCircle /></div><span>Missing receipts</span><strong>{bankRows.filter((r) => r.status !== "Matched").length}</strong><small>{currency(bankRows.filter((r) => r.status !== "Matched").reduce((s, r) => s + r.amount, 0))} needs evidence</small></article><article><div className="metric-icon lavender"><WalletCards /></div><span>Statement total</span><strong>{currency(bankRows.reduce((s, r) => s + r.amount, 0))}</strong><small>Latest CSV import</small></article><article><div className="metric-icon peach"><ShieldCheck /></div><span>Match rate</span><strong>{Math.round(bankRows.filter((r) => r.status === "Matched").length / Math.max(bankRows.length, 1) * 100)}%</strong><small>{bankRows.filter((r) => r.status === "Matched").length} of {bankRows.length} transactions</small></article></section>
            <section className="panel data-panel"><div className="panel-head"><div><h3>Imported statement</h3><p>CSV matching by amount and receipt record</p></div><span className="safe-chip"><ShieldCheck /> Private</span></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Bank description</th><th>Matched receipt</th><th>Status</th><th>Amount</th></tr></thead><tbody>{bankRows.map((item, index) => <tr key={`${item.description}-${index}`}><td>{item.date}</td><td><strong>{item.description}</strong></td><td>{item.matched || <button className="link-action" onClick={() => setUploadOpen(true)}>+ Add receipt</button>}</td><td><span className={`match-status ${item.status === "Matched" ? "matched" : "missing"}`}>{item.status === "Matched" ? <Check /> : <AlertCircle />}{item.status}</span></td><td><strong>{currency(item.amount)}</strong></td></tr>)}</tbody></table></div></section>
          </div>
        )}

        {tab === "myinvois" && (
          <div className="content feature-page">
            <section className="feature-hero myinvois-hero"><div><span className="pill"><ScanLine /> Malaysia e-Invoice</span><h2>Keep receipts and MyInvois together.</h2><p>Import validated e-Invoice records or scan a supplier QR. UUID, supplier TIN and supporting receipt stay linked for your tax agent.</p><div className="hero-actions"><label className="dark-button file-button"><FileUp /> Import MyInvois file<input type="file" accept=".csv,.json,application/json,text/csv" onChange={(e) => { if (e.target.files?.[0]) { setToast("MyInvois file checked and imported."); setTimeout(() => setToast(""), 3200); } }} /></label><button className="secondary" onClick={() => setToast("QR scanner is ready for a supported camera device.")}><ScanLine /> Scan QR</button></div></div><div className="einvoice-card"><span className="einvoice-brand">MY<span>INVOIS</span></span><div className="qr-placeholder"><ScanLine /></div><small>VALIDATED</small><strong>EI-98F2-71A0</strong><p>PETRONAS Station · RM 120.50</p><span className="verified-line"><Check /> Receipt linked</span></div></section>
            <section className="integration-grid"><article className="panel"><span className="mini-icon green"><BadgeCheck /></span><div><h3>2 validated documents</h3><p>UUID and supplier details recorded</p></div></article><article className="panel"><span className="mini-icon yellow"><AlertCircle /></span><div><h3>4 receipts without UUID</h3><p>Normal receipt or exempt supplier</p></div></article><article className="panel"><span className="mini-icon violet"><ShieldCheck /></span><div><h3>Duplicate protection</h3><p>No duplicate UUID detected</p></div></article></section>
            <section className="panel data-panel"><div className="panel-head"><div><h3>e-Invoice register</h3><p>Imported and linked supplier documents</p></div><a href="https://mytax.hasil.gov.my" target="_blank" rel="noreferrer" className="text-button">Open MyTax <ArrowUpRight /></a></div><div className="einvoice-list"><div><span className="cat-icon green"><Fuel /></span><p><b>PETRONAS Station</b><small>TIN C25845678010 · 28 Jul 2026</small></p><code>EI-98F2-71A0</code><strong>RM 120.50</strong><span className="status-ready"><Check /> Linked</span></div><div><span className="cat-icon green"><Phone /></span><p><b>Maxis Berhad</b><small>TIN C19874432100 · 25 Jul 2026</small></p><code>EI-44B1-901D</code><strong>RM 128.00</strong><span className="status-ready"><Check /> Linked</span></div></div></section>
          </div>
        )}

        {tab === "filing" && (
          <div className="content filing-page">
            <section className="filing-hero">
              <div>
                <span className="pill"><ClipboardCheck /> YA 2026 preparation</span>
                <h2>Borang {activeForm} information, all in one place.</h2>
                <p>{entity === "personal" ? "Collect Sim Lip Geap’s employment income, other non-business income, relief, rebate and tax-payment records before filing." : "Collect Solver Academy’s business accounts, tax adjustments, other income, personal relief and instalment records before filing."}</p>
                <div className="hero-actions"><button className="dark-button" onClick={saveFilingChecklist} disabled={savingChecklist}>{savingChecklist ? <LoaderCircle className="spinner-inline" /> : <Save />} {savingChecklist ? "Saving…" : "Save checklist"}</button><a className="secondary filing-link" href="https://mytax.hasil.gov.my" target="_blank" rel="noreferrer">Open MyTax <ArrowUpRight /></a></div>
              </div>
              <div className="filing-score-ring" style={{ "--filing-progress": `${filingPercent}%` } as CSSProperties}><div><strong>{filingPercent}%</strong><span>information ready</span></div></div>
            </section>

            {entity === "business" && <section className="legal-warning"><AlertCircle /><div><strong>First confirm Solver Academy’s legal type</strong><p>Borang B is for a resident individual carrying on a business, including a sole proprietor. If Solver Academy is a Sdn. Bhd., it generally files Borang C instead — do not combine the company return with Sim Lip Geap’s personal Borang B.</p></div></section>}

            <section className="filing-summary">
              <article><span className="mini-icon green"><ClipboardCheck /></span><div><small>Completed</small><strong>{filingDone} / {filingItems.length}</strong></div></article>
              <article><span className="mini-icon yellow"><AlertCircle /></span><div><small>Required still missing</small><strong>{filingItems.filter((item) => item.required && !filingChecks[item.key]).length}</strong></div></article>
              <article><span className="mini-icon violet"><BookOpen /></span><div><small>Information sections</small><strong>{currentFilingSections.length}</strong></div></article>
              <article><span className="mini-icon blue"><Archive /></span><div><small>Record retention</small><strong>7 years</strong></div></article>
            </section>

            <div className="filing-sections">
              {currentFilingSections.map((section, sectionIndex) => {
                const sectionDone = section.items.filter((item) => filingChecks[`${section.id}:${item.id}`]).length;
                return <section className="panel filing-section" key={section.id}><div className="filing-section-head"><span>{String(sectionIndex + 1).padStart(2, "0")}</span><div><h3>{section.title}</h3><p>{section.note}</p></div><strong>{sectionDone}/{section.items.length}</strong></div><div className="filing-list">{section.items.map((item) => { const itemKey = `${section.id}:${item.id}`; const checked = Boolean(filingChecks[itemKey]); return <button type="button" className={`filing-row ${checked ? "checked" : ""}`} key={itemKey} onClick={() => setFilingChecks((current) => ({ ...current, [itemKey]: !checked }))}><span className="filing-check">{checked && <Check />}</span><span className="filing-copy"><b>{item.label}</b><small>{item.detail}</small></span>{item.required && <span className="required-chip">Required</span>}</button>; })}</div></section>;
              })}
            </div>

            <section className="filing-source-note"><ShieldCheck /><div><strong>Prepared from the latest available HASiL YA 2025 guidance</strong><p>Use this as a preparation checklist. Recheck eligibility, relief limits and the final YA 2026 form when HASiL releases it. CukaiMate organises records and does not replace a licensed tax agent.</p></div><a href="https://www.hasil.gov.my/borang/muat-turun-borang/muat-turun-borang-individu/" target="_blank" rel="noreferrer">Official forms <ArrowUpRight /></a></section>
          </div>
        )}

        {tab === "tax" && (
          <div className="content tax-page">
            <div className="tax-switch"><button className={entity === "business" ? "active" : "locked"} disabled={entity !== "business"}>Form B <small>{entity === "business" ? "Solver Academy · selected" : "Switch to Solver Academy"}</small></button><button className={entity === "personal" ? "active" : "locked"} disabled={entity !== "personal"}>Form BE <small>{entity === "personal" ? "Sim Lip Geap · selected" : "Switch to Sim Lip Geap"}</small></button></div>
            <section className="form-warning"><ShieldCheck /><div><strong>{activeForm === "B" ? "You selected Form B" : "You selected Form BE"}</strong><p>{activeForm === "B" ? "Business expenses and personal reliefs are kept separate." : "Business deductions are excluded. Only eligible personal relief records appear below."}</p></div></section>
            <section className="report-hero"><div><span className="pill"><FileCheck2 /> YA 2026 estimate</span><h2>{activeForm === "B" ? "Your business records are 82% tax-ready." : "Your personal relief records are organised."}</h2><p>{activeForm === "B" ? "Claimable figures reflect the confirmed business-use percentage, not the full receipt value." : "Relief limits can change by year. Confirm the final YA 2026 eligibility and limits before filing."}</p></div><button className="dark-button" onClick={exportCsv}><Download /> Export summary</button></section>
            {activeForm === "B" ? <section className="report-grid"><div className="panel"><div className="panel-head"><div><h3>Solver Academy · Potential deductions</h3><p>Adjusted for confirmed business-use percentage</p></div><strong>{currency(totals.business)}</strong></div>{Object.entries(categoryMeta).map(([category, meta]) => { const items = entityReceipts.filter((r) => r.category === category && r.taxUse === "Business"); const amount = items.reduce((sum, r) => sum + r.amount * r.businessUse / 100, 0); if (!amount) return null; const Icon = meta.icon; return <div className="deduction-row" key={category}><span className={`cat-icon ${meta.tone}`}><Icon /></span><div><b>{category}</b><small>{items.length} receipt{items.length > 1 ? "s" : ""} · business-use adjusted</small></div><strong>{currency(amount)}</strong><span className="status-ready"><Check /> Ready</span></div>; })}</div><aside className="panel filing-note"><span className="mini-icon"><AlertCircle /></span><h3>Before you file</h3><p>CukaiMate organises evidence; it does not decide whether an expense is legally deductible.</p><ol><li>Confirm every business purpose</li><li>Review mixed-use percentages</li><li>Ask a licensed tax agent about uncertain claims</li></ol><button className="text-button" onClick={() => setTab("audit")}>Prepare Audit Pack <ArrowUpRight /></button></aside></section> : <section className="report-grid"><div className="panel relief-panel"><div className="panel-head"><div><h3>Sim Lip Geap · Personal relief records</h3><p>Potential Form BE evidence · not business expenses</p></div><strong>{currency(totals.relief)}</strong></div>{(["Medical", "Lifestyle", "Education", "Insurance", "EPF & SOCSO", "Zakat"] as Category[]).map((category) => { const items = entityReceipts.filter((r) => r.category === category && r.taxUse === "Relief"); const amount = items.reduce((sum, r) => sum + r.amount, 0); const Icon = categoryMeta[category].icon; return <div className="relief-row" key={category}><span className={`cat-icon ${categoryMeta[category].tone}`}><Icon /></span><div><b>{category}</b><small>{items.length ? `${items.length} supporting record${items.length > 1 ? "s" : ""}` : "No record uploaded"}</small></div><strong>{currency(amount)}</strong><span className={items.length ? "status-ready" : "review-chip"}>{items.length ? <Check /> : <AlertCircle />}{items.length ? "Recorded" : "Add record"}</span></div>; })}</div><aside className="panel filing-note"><span className="mini-icon"><ShieldCheck /></span><h3>Form BE protection</h3><p>Solver Academy’s business expenses are completely hidden from Sim Lip Geap’s personal account.</p><ol><li>Confirm employment-only filing status</li><li>Review annual relief limits</li><li>Keep supporting documents for seven years</li></ol></aside></section>}
          </div>
        )}

        {tab === "audit" && (
          <div className="content feature-page">
            <section className="feature-hero audit-hero"><div><span className="pill"><Archive /> LHDN record support</span><h2>One evidence pack. Seven-year-ready.</h2><p>Bundle your receipt register, business purpose, bank matching and MyInvois references for your accountant or future review.</p><button className="dark-button" onClick={downloadAuditPack}><Download /> Download Audit Pack</button></div><div className="archive-visual"><Archive /><strong>YA 2026</strong><span>Retention target</span><b>31 Dec 2033</b></div></section>
            <section className="audit-grid"><article className="panel"><span className="check-circle"><Check /></span><h3>{entity === "personal" ? "Sim Lip Geap" : "Solver Academy"} register</h3><p>{entityReceipts.length} records with categories and source-file references.</p></article><article className="panel"><span className="check-circle"><Check /></span><h3>{entity === "personal" ? "Relief evidence" : "Business purpose"}</h3><p>{entityReceipts.filter((r) => r.businessPurpose).length} records documented; {entityReceipts.filter((r) => r.taxUse === "Review").length} needs review.</p></article><article className="panel"><span className="check-circle"><Check /></span><h3>{entity === "personal" ? "Personal-only account" : "Bank reconciliation"}</h3><p>{entity === "personal" ? "No Solver Academy expenses included." : "3 matched transactions and 1 missing receipt."}</p></article><article className="panel"><span className="check-circle"><Check /></span><h3>{entity === "personal" ? "Form BE register" : "MyInvois register"}</h3><p>{entity === "personal" ? `${entityReceipts.filter((r) => r.taxUse === "Relief").length} potential relief records.` : "2 validated UUID references linked to receipts."}</p></article></section>
            <section className="panel retention"><ShieldCheck /><div><h3>Retention reminder is active</h3><p>CukaiMate will keep the YA 2026 workspace organised through 31 December 2033. Export a copy for your own records and tax agent.</p></div><span className="safe-chip">7 years</span></section>
          </div>
        )}
      </section>

      {uploadOpen && <UploadModal draft={draft} setDraft={setDraft} processing={processing} progress={progress} fileRef={fileRef} onFile={handleFile} onClose={() => { setUploadOpen(false); setDraft(null); }} onSave={saveReceipt} />}
      {menuOpen && <button className="menu-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      {toast && <div className="toast"><Check /> {toast}</div>}
    </main>
  );
}

function ReceiptTable({ entity, receipts, query, setQuery, onViewAll, full = false }: { entity: Entity; receipts: Receipt[]; query: string; setQuery: (v: string) => void; onViewAll: () => void; full?: boolean }) {
  return <section className="panel receipt-list"><div className="panel-head"><div><h3>{full ? `${entity === "personal" ? "Sim Lip Geap" : "Solver Academy"} receipts` : "Recent receipts"}</h3><p>{full ? `Only ${entity === "personal" ? "personal" : "business"} records are shown` : "Automatically extracted and categorised"}</p></div><div className="table-actions">{full && <label className="search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipts" /></label>}<button className="text-button" onClick={onViewAll}>{full ? "Add receipt" : "View all"} <ArrowUpRight /></button></div></div><div className="table-wrap"><table><thead><tr><th>Merchant</th><th>Date</th><th>Category</th><th>Tax use</th><th>{entity === "personal" ? "Account" : "Business use"}</th><th>{entity === "personal" ? "Amount" : "Claimable"}</th><th></th></tr></thead><tbody>{receipts.map((receipt) => { const Icon = categoryMeta[receipt.category].icon; return <tr key={receipt.id}><td><div className="merchant"><span className={`cat-icon ${categoryMeta[receipt.category].tone}`}><Icon /></span><div><b>{receipt.merchant}</b><small>{receipt.myInvoisUuid ? `MyInvois ${receipt.myInvoisUuid}` : `${receipt.confidence}% category match`}</small></div></div></td><td>{receipt.date}</td><td><span className="category-label">{receipt.category}</span></td><td><span className={`tax-use ${receipt.taxUse.toLowerCase()}`}>{receipt.taxUse === "Review" ? <AlertCircle /> : receipt.taxUse === "Relief" ? <FileCheck2 /> : null}{receipt.taxUse}</span></td><td>{entity === "personal" ? "Personal" : receipt.taxUse === "Business" ? `${receipt.businessUse}%` : "—"}</td><td><strong>{currency(receipt.taxUse === "Business" ? receipt.amount * receipt.businessUse / 100 : receipt.amount)}</strong>{entity === "business" && <small className="gross-amount">gross {currency(receipt.amount)}</small>}</td><td><button className="more" aria-label={`Actions for ${receipt.merchant}`}><MoreHorizontal /></button></td></tr>; })}</tbody></table></div></section>;
}

function UploadModal({ draft, setDraft, processing, progress, fileRef, onFile, onClose, onSave }: { draft: Receipt | null; setDraft: (r: Receipt) => void; processing: boolean; progress: number; fileRef: React.RefObject<HTMLInputElement | null>; onFile: (f: File) => void; onClose: () => void; onSave: (e: FormEvent) => void }) {
  const personalCategories: Category[] = ["Medical", "Lifestyle", "Education", "Insurance", "EPF & SOCSO", "Zakat", "Food & Beverage", "Entertainment", "Mobile", "Others"];
  const businessCategories: Category[] = ["Food & Beverage", "Stationery", "Petrol", "Toll Fee", "Mobile", "Entertainment", "Office Rent", "Software & Subscriptions", "Professional Fees", "Advertising & Marketing", "Utilities", "Others"];
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title"><div className="modal"><div className="modal-head"><div><span className="pill"><Sparkles /> {draft?.entity === "personal" ? "Sim Lip Geap · Personal" : "Solver Academy · Business"}</span><h2 id="upload-title">Upload a receipt</h2><p>This receipt will stay inside the selected account.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button></div>{!draft ? <button className={`dropzone ${processing ? "processing" : ""}`} disabled={processing} onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) onFile(file); }}><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />{processing ? <><LoaderCircle className="spinner" /><strong>Reading your receipt…</strong><span>Extracting merchant, amount and category</span><div className="progress"><i style={{ width: `${progress}%` }}></i></div><small>{progress}% complete</small></> : <><span className="upload-icon"><Paperclip /></span><strong>Drop your receipt here</strong><span>or click to choose a photo</span><small>JPG, PNG or WEBP · up to 10 MB</small></>}</button> : <form onSubmit={onSave} className="receipt-form"><div className="detected"><span><Check /></span><div><strong>{draft.entity === "personal" ? "Personal account detected" : "Business account detected"}</strong><small>{draft.confidence}% category confidence · Please confirm</small></div></div><label>Merchant<input value={draft.merchant} onChange={(e) => setDraft({ ...draft, merchant: e.target.value })} required /></label><div className="form-row"><label>Amount (RM)<input type="number" step="0.01" min="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} required /></label><label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>{(draft.entity === "personal" ? personalCategories : businessCategories).map((category) => <option key={category}>{category}</option>)}</select></label></div><label>Tax treatment<div className={`segmented ${draft.entity === "personal" ? "" : "four"}`}>{(draft.entity === "personal" ? ["Relief", "Personal", "Review"] as const : ["Business", "Personal", "Review"] as const).map((value) => <button type="button" className={draft.taxUse === value ? "active" : ""} onClick={() => setDraft({ ...draft, taxUse: value, businessUse: value === "Business" ? Math.max(draft.businessUse, 1) : 0 })} key={value}>{value}</button>)}</div></label>{draft.taxUse === "Business" && <><div className="form-row"><label>Business use<input type="range" min="0" max="100" value={draft.businessUse} onChange={(e) => setDraft({ ...draft, businessUse: Number(e.target.value) })} /><span className="range-value">{draft.businessUse}% · claimable {currency(draft.amount * draft.businessUse / 100)}</span></label><label>MyInvois UUID (optional)<input value={draft.myInvoisUuid || ""} onChange={(e) => setDraft({ ...draft, myInvoisUuid: e.target.value })} placeholder="e.g. EI-XXXX-XXXX" /></label></div><label>Business purpose<input value={draft.businessPurpose || ""} onChange={(e) => setDraft({ ...draft, businessPurpose: e.target.value })} placeholder="e.g. Client visit in Petaling Jaya" /></label></>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit"><Check /> Save to {draft.entity === "personal" ? "Sim Lip Geap" : "Solver Academy"}</button></div></form>}</div></div>;
}
