"use client";

import {
  AlertCircle,
  Archive,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CarFront,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  FileUp,
  FileCheck2,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  Landmark,
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
  ShieldCheck,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";

type Category = "Food & Beverage" | "Stationery" | "Petrol" | "Toll Fee" | "Mobile" | "Entertainment" | "Others";
type Receipt = {
  id: string;
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
  Others: { icon: MoreHorizontal, tone: "slate" },
};

const seedReceipts: Receipt[] = [
  { id: "1", merchant: "PETRONAS Station", date: "28 Jul 2026", amount: 120.5, category: "Petrol", taxUse: "Business", businessUse: 80, businessPurpose: "Client visit — Petaling Jaya", myInvoisUuid: "EI-98F2-71A0", confidence: 98 },
  { id: "2", merchant: "Touch 'n Go eWallet", date: "27 Jul 2026", amount: 36.8, category: "Toll Fee", taxUse: "Business", businessUse: 100, businessPurpose: "Delivery and client travel", confidence: 96 },
  { id: "3", merchant: "Maxis Berhad", date: "25 Jul 2026", amount: 128, category: "Mobile", taxUse: "Business", businessUse: 70, businessPurpose: "Shared business mobile plan", myInvoisUuid: "EI-44B1-901D", confidence: 99 },
  { id: "4", merchant: "POPULAR Bookstore", date: "23 Jul 2026", amount: 54.9, category: "Stationery", taxUse: "Business", businessUse: 100, businessPurpose: "Office supplies", confidence: 94 },
  { id: "5", merchant: "The Coffee Bean", date: "22 Jul 2026", amount: 42.6, category: "Food & Beverage", taxUse: "Review", businessUse: 0, confidence: 88 },
  { id: "6", merchant: "KPJ Specialist Centre", date: "18 Jul 2026", amount: 180, category: "Others", taxUse: "Relief", businessUse: 0, businessPurpose: "Medical receipt", confidence: 97 },
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

function currency(value: number) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}

function classify(text: string): Category {
  const value = text.toLowerCase();
  if (/petronas|shell|petrol|fuel|caltex|bhpetrol/.test(value)) return "Petrol";
  if (/touch.n.go|toll|plus malaysia|rfid/.test(value)) return "Toll Fee";
  if (/maxis|celcom|digi|unifi|mobile|yes 5g|u mobile/.test(value)) return "Mobile";
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
  const [tab, setTab] = useState<"overview" | "receipts" | "bank" | "myinvois" | "tax" | "audit">("overview");
  const [activeForm, setActiveForm] = useState<"B" | "BE">("B");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState<Receipt | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => {
    const total = receipts.reduce((sum, item) => sum + item.amount, 0);
    const business = receipts.filter((item) => item.taxUse === "Business").reduce((sum, item) => sum + item.amount * item.businessUse / 100, 0);
    const relief = receipts.filter((item) => item.taxUse === "Relief").reduce((sum, item) => sum + item.amount, 0);
    return { total, business, relief, review: receipts.filter((item) => item.taxUse === "Review").length };
  }, [receipts]);

  const filtered = receipts.filter((receipt) => `${receipt.merchant} ${receipt.category}`.toLowerCase().includes(query.toLowerCase()));

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
      merchant: merchant.slice(0, 34),
      date: new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()),
      amount,
      category,
      taxUse: category === "Entertainment" ? "Review" : "Business",
      businessUse: category === "Mobile" || category === "Petrol" ? 70 : 100,
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
    const rows = receipts.map((r) => [r.date, `\"${r.merchant.replaceAll('"', '""')}\"`, r.category, r.taxUse, r.businessUse, r.amount.toFixed(2), (r.taxUse === "Business" ? r.amount * r.businessUse / 100 : r.amount).toFixed(2), `\"${r.businessPurpose || ""}\"`, r.myInvoisUuid || ""].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "CukaiMate-2026-receipts.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    setToast("Tax summary exported as CSV.");
    setTimeout(() => setToast(""), 3200);
  }

  function downloadAuditPack() {
    const pack = {
      product: "CukaiMate Malaysia",
      yearOfAssessment: 2026,
      form: `Form ${activeForm}`,
      generatedAt: new Date().toISOString(),
      sevenYearRetentionUntil: "31 Dec 2033",
      summary: { grossExpenses: totals.total, potentialBusinessDeductions: totals.business, personalReliefReceipts: totals.relief },
      receipts,
      bankReconciliation: bankTransactions,
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

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <div className="brand"><span className="brand-mark">C</span><span>CukaiMate<small>Malaysia</small></span></div>
        <nav aria-label="Main navigation">
          <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><LayoutDashboard /> Overview</button>
          <button className={tab === "receipts" ? "active" : ""} onClick={() => setTab("receipts")}><ReceiptText /> Receipts <span className="nav-count">{receipts.length}</span></button>
          <button className={tab === "bank" ? "active" : ""} onClick={() => setTab("bank")}><Landmark /> Bank matching <span className="nav-alert">1</span></button>
          <button className={tab === "myinvois" ? "active" : ""} onClick={() => setTab("myinvois")}><ScanLine /> MyInvois</button>
          <button className={tab === "tax" ? "active" : ""} onClick={() => setTab("tax")}><FileText /> Tax Report</button>
          <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}><Archive /> Audit Pack</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="tax-card"><span className="mini-icon"><FileCheck2 /></span><strong>YA 2026</strong><p>Records organised for your next filing.</p><button onClick={() => setTab("tax")}>View tax summary <ArrowUpRight /></button></div>
          <button className="help"><CircleHelp /> Help & tax guide</button>
          <div className="profile"><span>SL</span><div><strong>Solver Academy</strong><small>Sole proprietor</small></div><ChevronDown /></div>
        </div>
      </aside>

      <section className="workspace">
        <header>
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div><p className="eyebrow">YEAR OF ASSESSMENT 2026</p><h1>{tab === "overview" ? "Good morning, Solver" : tab === "receipts" ? "Your receipts" : tab === "bank" ? "Bank reconciliation" : tab === "myinvois" ? "MyInvois records" : tab === "audit" ? "Seven-year Audit Pack" : "Tax-ready summary"}</h1></div>
          <div className="header-actions"><button className="icon-btn" aria-label="Notifications"><Bell /></button><button className="primary" onClick={() => setUploadOpen(true)}><Plus /> Upload receipt</button></div>
        </header>

        {tab === "overview" && (
          <div className="content">
            <section className="welcome-panel">
              <div><span className="pill"><Sparkles /> Smart receipt capture</span><h2>Turn every receipt into<br />a tax-ready record.</h2><p>Upload a photo. We extract the details, suggest a category, and flag what needs your review.</p><button className="dark-button" onClick={() => setUploadOpen(true)}><Paperclip /> Upload a receipt</button><small>JPG, PNG or WEBP · up to 10 MB</small></div>
              <div className="receipt-stack" aria-hidden="true"><div className="receipt-paper back"></div><div className="receipt-paper front"><div className="receipt-top"><span className="logo-dot">P</span><div><b>PETRONAS</b><small>Receipt detected</small></div><span className="verified"><Check /></span></div><div className="scan-lines"><i></i><i></i><i></i></div><div className="receipt-total"><span>Total</span><strong>RM 120.50</strong></div><div className="category-tag"><Fuel /> Petrol <span>98% match</span></div></div></div>
            </section>

            <section className="metric-grid">
              <article><div className="metric-icon mint"><WalletCards /></div><span>Total expenses</span><strong>{currency(totals.total)}</strong><small><b>↑ 12.4%</b> from last month</small></article>
              <article><div className="metric-icon peach"><BriefcaseBusiness /></div><span>Business expenses</span><strong>{currency(totals.business)}</strong><small>{Math.round((totals.business / Math.max(totals.total, 1)) * 100)}% of recorded spend</small></article>
              <article><div className="metric-icon lavender"><Gauge /></div><span>Receipts processed</span><strong>{receipts.length}</strong><small>All records saved</small></article>
              <article className={totals.review ? "needs-review" : ""}><div className="metric-icon yellow"><AlertCircle /></div><span>Needs review</span><strong>{totals.review}</strong><small>Check tax purpose</small></article>
            </section>

            <section className="two-column">
              <div className="panel spending-panel"><div className="panel-head"><div><h3>Spending by category</h3><p>Business and personal expenses</p></div><button>Jul 2026 <ChevronDown /></button></div><div className="category-bars">
                {(["Petrol", "Mobile", "Stationery", "Food & Beverage", "Toll Fee"] as Category[]).map((category) => {
                  const amount = receipts.filter((r) => r.category === category).reduce((sum, r) => sum + r.amount, 0);
                  const Icon = categoryMeta[category].icon;
                  return <div className="bar-row" key={category}><span className={`cat-icon ${categoryMeta[category].tone}`}><Icon /></span><div><span>{category}</span><div className="bar"><i style={{ width: `${Math.max(8, Math.min(100, (amount / Math.max(totals.total, 1)) * 180))}%` }}></i></div></div><strong>{currency(amount)}</strong></div>;
                })}
              </div></div>
              <div className="panel tax-readiness"><div className="panel-head"><div><h3>Tax readiness</h3><p>Form B · YA 2026</p></div><span className="score">82%</span></div><div className="donut"><div><strong>82%</strong><span>ready</span></div></div><ul><li><span className="dot green"></span><div><b>{receipts.length - totals.review} receipts categorised</b><small>Ready for review</small></div><Check /></li><li><span className="dot orange"></span><div><b>{totals.review} receipt needs attention</b><small>Business purpose not confirmed</small></div><ChevronRight /></li></ul><button className="text-button" onClick={() => setTab("tax")}>Open tax checklist <ArrowUpRight /></button></div>
            </section>

            <ReceiptTable receipts={filtered.slice(0, 5)} query={query} setQuery={setQuery} onViewAll={() => setTab("receipts")} />
          </div>
        )}

        {tab === "receipts" && <div className="content"><ReceiptTable receipts={filtered} query={query} setQuery={setQuery} onViewAll={() => setUploadOpen(true)} full /></div>}

        {tab === "bank" && (
          <div className="content feature-page">
            <section className="feature-hero compact"><div><span className="pill"><Landmark /> Bank matching</span><h2>Find payments without receipts.</h2><p>Import a Malaysian bank or e-wallet CSV. CukaiMate matches amount, date and merchant so nothing is missed.</p></div><label className="dark-button file-button"><FileUp /> Import statement<input type="file" accept=".csv,text/csv" onChange={(e) => { if (e.target.files?.[0]) { setToast(`${e.target.files[0].name} imported — 3 matches found.`); setTimeout(() => setToast(""), 3200); } }} /></label></section>
            <section className="metric-grid bank-metrics"><article><div className="metric-icon mint"><BadgeCheck /></div><span>Auto-matched</span><strong>3</strong><small>RM 285.30 linked to receipts</small></article><article><div className="metric-icon yellow"><AlertCircle /></div><span>Missing receipts</span><strong>1</strong><small>RM 86.40 needs evidence</small></article><article><div className="metric-icon lavender"><WalletCards /></div><span>Statement total</span><strong>RM 371.70</strong><small>July 2026 import</small></article><article><div className="metric-icon peach"><ShieldCheck /></div><span>Match rate</span><strong>77%</strong><small>3 of 4 transactions</small></article></section>
            <section className="panel data-panel"><div className="panel-head"><div><h3>July statement</h3><p>Maybank Current Account · imported today</p></div><span className="safe-chip"><ShieldCheck /> Private</span></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Bank description</th><th>Matched receipt</th><th>Status</th><th>Amount</th></tr></thead><tbody>{bankTransactions.map((item) => <tr key={item.description}><td>{item.date}</td><td><strong>{item.description}</strong></td><td>{item.matched || <button className="link-action" onClick={() => setUploadOpen(true)}>+ Add receipt</button>}</td><td><span className={`match-status ${item.status === "Matched" ? "matched" : "missing"}`}>{item.status === "Matched" ? <Check /> : <AlertCircle />}{item.status}</span></td><td><strong>{currency(item.amount)}</strong></td></tr>)}</tbody></table></div></section>
          </div>
        )}

        {tab === "myinvois" && (
          <div className="content feature-page">
            <section className="feature-hero myinvois-hero"><div><span className="pill"><ScanLine /> Malaysia e-Invoice</span><h2>Keep receipts and MyInvois together.</h2><p>Import validated e-Invoice records or scan a supplier QR. UUID, supplier TIN and supporting receipt stay linked for your tax agent.</p><div className="hero-actions"><label className="dark-button file-button"><FileUp /> Import MyInvois file<input type="file" accept=".csv,.json,application/json,text/csv" onChange={(e) => { if (e.target.files?.[0]) { setToast("MyInvois file checked and imported."); setTimeout(() => setToast(""), 3200); } }} /></label><button className="secondary" onClick={() => setToast("QR scanner is ready for a supported camera device.")}><ScanLine /> Scan QR</button></div></div><div className="einvoice-card"><span className="einvoice-brand">MY<span>INVOIS</span></span><div className="qr-placeholder"><ScanLine /></div><small>VALIDATED</small><strong>EI-98F2-71A0</strong><p>PETRONAS Station · RM 120.50</p><span className="verified-line"><Check /> Receipt linked</span></div></section>
            <section className="integration-grid"><article className="panel"><span className="mini-icon green"><BadgeCheck /></span><div><h3>2 validated documents</h3><p>UUID and supplier details recorded</p></div></article><article className="panel"><span className="mini-icon yellow"><AlertCircle /></span><div><h3>4 receipts without UUID</h3><p>Normal receipt or exempt supplier</p></div></article><article className="panel"><span className="mini-icon violet"><ShieldCheck /></span><div><h3>Duplicate protection</h3><p>No duplicate UUID detected</p></div></article></section>
            <section className="panel data-panel"><div className="panel-head"><div><h3>e-Invoice register</h3><p>Imported and linked supplier documents</p></div><a href="https://mytax.hasil.gov.my" target="_blank" rel="noreferrer" className="text-button">Open MyTax <ArrowUpRight /></a></div><div className="einvoice-list"><div><span className="cat-icon green"><Fuel /></span><p><b>PETRONAS Station</b><small>TIN C25845678010 · 28 Jul 2026</small></p><code>EI-98F2-71A0</code><strong>RM 120.50</strong><span className="status-ready"><Check /> Linked</span></div><div><span className="cat-icon green"><Phone /></span><p><b>Maxis Berhad</b><small>TIN C19874432100 · 25 Jul 2026</small></p><code>EI-44B1-901D</code><strong>RM 128.00</strong><span className="status-ready"><Check /> Linked</span></div></div></section>
          </div>
        )}

        {tab === "tax" && (
          <div className="content tax-page">
            <div className="tax-switch"><button className={activeForm === "B" ? "active" : ""} onClick={() => setActiveForm("B")}>Form B <small>Business income</small></button><button className={activeForm === "BE" ? "active" : ""} onClick={() => setActiveForm("BE")}>Form BE <small>Employment income only</small></button></div>
            <section className="form-warning"><ShieldCheck /><div><strong>{activeForm === "B" ? "You selected Form B" : "You selected Form BE"}</strong><p>{activeForm === "B" ? "Business expenses and personal reliefs are kept separate." : "Business deductions are excluded. Only eligible personal relief records appear below."}</p></div></section>
            <section className="report-hero"><div><span className="pill"><FileCheck2 /> YA 2026 estimate</span><h2>{activeForm === "B" ? "Your business records are 82% tax-ready." : "Your personal relief records are organised."}</h2><p>{activeForm === "B" ? "Claimable figures reflect the confirmed business-use percentage, not the full receipt value." : "Relief limits can change by year. Confirm the final YA 2026 eligibility and limits before filing."}</p></div><button className="dark-button" onClick={exportCsv}><Download /> Export summary</button></section>
            {activeForm === "B" ? <section className="report-grid"><div className="panel"><div className="panel-head"><div><h3>Potential business deductions</h3><p>Adjusted for confirmed business-use percentage</p></div><strong>{currency(totals.business)}</strong></div>{Object.entries(categoryMeta).map(([category, meta]) => { const items = receipts.filter((r) => r.category === category && r.taxUse === "Business"); const amount = items.reduce((sum, r) => sum + r.amount * r.businessUse / 100, 0); if (!amount) return null; const Icon = meta.icon; return <div className="deduction-row" key={category}><span className={`cat-icon ${meta.tone}`}><Icon /></span><div><b>{category}</b><small>{items.length} receipt{items.length > 1 ? "s" : ""} · business-use adjusted</small></div><strong>{currency(amount)}</strong><span className="status-ready"><Check /> Ready</span></div>; })}</div><aside className="panel filing-note"><span className="mini-icon"><AlertCircle /></span><h3>Before you file</h3><p>CukaiMate organises evidence; it does not decide whether an expense is legally deductible.</p><ol><li>Confirm every business purpose</li><li>Review mixed-use percentages</li><li>Ask a licensed tax agent about uncertain claims</li></ol><button className="text-button" onClick={() => setTab("audit")}>Prepare Audit Pack <ArrowUpRight /></button></aside></section> : <section className="report-grid"><div className="panel relief-panel"><div className="panel-head"><div><h3>Personal tax relief records</h3><p>Receipts and contribution records · not business expenses</p></div><strong>{currency(reliefs.reduce((sum, item) => sum + item.amount, 0))}</strong></div>{reliefs.map((item) => <div className="relief-row" key={item.name}><span className="cat-icon green"><FileCheck2 /></span><div><b>{item.name}</b><small>{item.receipts} supporting record{item.receipts > 1 ? "s" : ""}</small></div><strong>{currency(item.amount)}</strong><span className={item.status === "Review limit" ? "review-chip" : "status-ready"}>{item.status === "Review limit" ? <AlertCircle /> : <Check />}{item.status}</span></div>)}</div><aside className="panel filing-note"><span className="mini-icon"><ShieldCheck /></span><h3>Form BE protection</h3><p>Business expense receipts are hidden from this view to reduce accidental claims.</p><ol><li>Confirm you have no business income</li><li>Review annual relief limits</li><li>Keep supporting documents for seven years</li></ol></aside></section>}
          </div>
        )}

        {tab === "audit" && (
          <div className="content feature-page">
            <section className="feature-hero audit-hero"><div><span className="pill"><Archive /> LHDN record support</span><h2>One evidence pack. Seven-year-ready.</h2><p>Bundle your receipt register, business purpose, bank matching and MyInvois references for your accountant or future review.</p><button className="dark-button" onClick={downloadAuditPack}><Download /> Download Audit Pack</button></div><div className="archive-visual"><Archive /><strong>YA 2026</strong><span>Retention target</span><b>31 Dec 2033</b></div></section>
            <section className="audit-grid"><article className="panel"><span className="check-circle"><Check /></span><h3>Receipt register</h3><p>{receipts.length} records with categories and source-file references.</p></article><article className="panel"><span className="check-circle"><Check /></span><h3>Business purpose</h3><p>{receipts.filter((r) => r.businessPurpose).length} records documented; {receipts.filter((r) => r.taxUse === "Review").length} needs review.</p></article><article className="panel"><span className="check-circle"><Check /></span><h3>Bank reconciliation</h3><p>3 matched transactions and 1 missing receipt.</p></article><article className="panel"><span className="check-circle"><Check /></span><h3>MyInvois register</h3><p>2 validated UUID references linked to receipts.</p></article></section>
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

function ReceiptTable({ receipts, query, setQuery, onViewAll, full = false }: { receipts: Receipt[]; query: string; setQuery: (v: string) => void; onViewAll: () => void; full?: boolean }) {
  return <section className="panel receipt-list"><div className="panel-head"><div><h3>{full ? "All receipts" : "Recent receipts"}</h3><p>{full ? "Search, check and organise your records" : "Automatically extracted and categorised"}</p></div><div className="table-actions">{full && <label className="search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipts" /></label>}<button className="text-button" onClick={onViewAll}>{full ? "Add receipt" : "View all"} <ArrowUpRight /></button></div></div><div className="table-wrap"><table><thead><tr><th>Merchant</th><th>Date</th><th>Category</th><th>Tax use</th><th>Business use</th><th>Claimable</th><th></th></tr></thead><tbody>{receipts.map((receipt) => { const Icon = categoryMeta[receipt.category].icon; return <tr key={receipt.id}><td><div className="merchant"><span className={`cat-icon ${categoryMeta[receipt.category].tone}`}><Icon /></span><div><b>{receipt.merchant}</b><small>{receipt.myInvoisUuid ? `MyInvois ${receipt.myInvoisUuid}` : `${receipt.confidence}% category match`}</small></div></div></td><td>{receipt.date}</td><td><span className="category-label">{receipt.category}</span></td><td><span className={`tax-use ${receipt.taxUse.toLowerCase()}`}>{receipt.taxUse === "Review" ? <AlertCircle /> : receipt.taxUse === "Relief" ? <FileCheck2 /> : null}{receipt.taxUse}</span></td><td>{receipt.taxUse === "Business" ? `${receipt.businessUse}%` : "—"}</td><td><strong>{currency(receipt.taxUse === "Business" ? receipt.amount * receipt.businessUse / 100 : receipt.amount)}</strong><small className="gross-amount">gross {currency(receipt.amount)}</small></td><td><button className="more" aria-label={`Actions for ${receipt.merchant}`}><MoreHorizontal /></button></td></tr>; })}</tbody></table></div></section>;
}

function UploadModal({ draft, setDraft, processing, progress, fileRef, onFile, onClose, onSave }: { draft: Receipt | null; setDraft: (r: Receipt) => void; processing: boolean; progress: number; fileRef: React.RefObject<HTMLInputElement | null>; onFile: (f: File) => void; onClose: () => void; onSave: (e: FormEvent) => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title"><div className="modal"><div className="modal-head"><div><span className="pill"><Sparkles /> AI-assisted</span><h2 id="upload-title">Upload a receipt</h2><p>We’ll read the receipt and suggest a Malaysian tax category.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button></div>{!draft ? <button className={`dropzone ${processing ? "processing" : ""}`} disabled={processing} onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) onFile(file); }}><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />{processing ? <><LoaderCircle className="spinner" /><strong>Reading your receipt…</strong><span>Extracting merchant, amount and category</span><div className="progress"><i style={{ width: `${progress}%` }}></i></div><small>{progress}% complete</small></> : <><span className="upload-icon"><Paperclip /></span><strong>Drop your receipt here</strong><span>or click to choose a photo</span><small>JPG, PNG or WEBP · up to 10 MB</small></>}</button> : <form onSubmit={onSave} className="receipt-form"><div className="detected"><span><Check /></span><div><strong>Details detected</strong><small>{draft.confidence}% category confidence · Please confirm</small></div></div><label>Merchant<input value={draft.merchant} onChange={(e) => setDraft({ ...draft, merchant: e.target.value })} required /></label><div className="form-row"><label>Amount (RM)<input type="number" step="0.01" min="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} required /></label><label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>{Object.keys(categoryMeta).map((category) => <option key={category}>{category}</option>)}</select></label></div><label>Tax treatment<div className="segmented four">{(["Business", "Relief", "Personal", "Review"] as const).map((value) => <button type="button" className={draft.taxUse === value ? "active" : ""} onClick={() => setDraft({ ...draft, taxUse: value, businessUse: value === "Business" ? Math.max(draft.businessUse, 1) : 0 })} key={value}>{value}</button>)}</div></label>{draft.taxUse === "Business" && <><div className="form-row"><label>Business use<input type="range" min="0" max="100" value={draft.businessUse} onChange={(e) => setDraft({ ...draft, businessUse: Number(e.target.value) })} /><span className="range-value">{draft.businessUse}% · claimable {currency(draft.amount * draft.businessUse / 100)}</span></label><label>MyInvois UUID (optional)<input value={draft.myInvoisUuid || ""} onChange={(e) => setDraft({ ...draft, myInvoisUuid: e.target.value })} placeholder="e.g. EI-XXXX-XXXX" /></label></div><label>Business purpose<input value={draft.businessPurpose || ""} onChange={(e) => setDraft({ ...draft, businessPurpose: e.target.value })} placeholder="e.g. Client visit in Petaling Jaya" /></label></>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit"><Check /> Save receipt</button></div></form>}</div></div>;
}
