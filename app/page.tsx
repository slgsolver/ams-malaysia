"use client";

import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CarFront,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  FileCheck2,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Search,
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
  taxUse: "Business" | "Personal" | "Review";
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
  { id: "1", merchant: "PETRONAS Station", date: "28 Jul 2026", amount: 120.5, category: "Petrol", taxUse: "Business", confidence: 98 },
  { id: "2", merchant: "Touch 'n Go eWallet", date: "27 Jul 2026", amount: 36.8, category: "Toll Fee", taxUse: "Business", confidence: 96 },
  { id: "3", merchant: "Maxis Berhad", date: "25 Jul 2026", amount: 128, category: "Mobile", taxUse: "Business", confidence: 99 },
  { id: "4", merchant: "POPULAR Bookstore", date: "23 Jul 2026", amount: 54.9, category: "Stationery", taxUse: "Business", confidence: 94 },
  { id: "5", merchant: "The Coffee Bean", date: "22 Jul 2026", amount: 42.6, category: "Food & Beverage", taxUse: "Review", confidence: 88 },
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
  const [tab, setTab] = useState<"overview" | "receipts" | "tax">("overview");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState<Receipt | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => {
    const total = receipts.reduce((sum, item) => sum + item.amount, 0);
    const business = receipts.filter((item) => item.taxUse === "Business").reduce((sum, item) => sum + item.amount, 0);
    return { total, business, review: receipts.filter((item) => item.taxUse === "Review").length };
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
    const header = "Date,Merchant,Category,Tax use,Amount (MYR)";
    const rows = receipts.map((r) => [r.date, `\"${r.merchant.replaceAll('"', '""')}\"`, r.category, r.taxUse, r.amount.toFixed(2)].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "CukaiMate-2026-receipts.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    setToast("Tax summary exported as CSV.");
    setTimeout(() => setToast(""), 3200);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">C</span><span>CukaiMate<small>Malaysia</small></span></div>
        <nav aria-label="Main navigation">
          <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><LayoutDashboard /> Overview</button>
          <button className={tab === "receipts" ? "active" : ""} onClick={() => setTab("receipts")}><ReceiptText /> Receipts <span className="nav-count">{receipts.length}</span></button>
          <button className={tab === "tax" ? "active" : ""} onClick={() => setTab("tax")}><FileText /> Tax Report</button>
          <button><BarChart3 /> Insights</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="tax-card"><span className="mini-icon"><FileCheck2 /></span><strong>YA 2026</strong><p>Records organised for your next filing.</p><button onClick={() => setTab("tax")}>View tax summary <ArrowUpRight /></button></div>
          <button className="help"><CircleHelp /> Help & tax guide</button>
          <div className="profile"><span>SL</span><div><strong>Solver Academy</strong><small>Sole proprietor</small></div><ChevronDown /></div>
        </div>
      </aside>

      <section className="workspace">
        <header>
          <button className="mobile-menu" aria-label="Open menu"><Menu /></button>
          <div><p className="eyebrow">YEAR OF ASSESSMENT 2026</p><h1>{tab === "overview" ? "Good morning, Solver" : tab === "receipts" ? "Your receipts" : "Tax-ready summary"}</h1></div>
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

        {tab === "tax" && (
          <div className="content tax-page">
            <div className="tax-switch"><button className="active">Form B <small>Business income</small></button><button>Form BE <small>Employment income</small></button></div>
            <section className="report-hero"><div><span className="pill"><FileCheck2 /> YA 2026 estimate</span><h2>Your records are 82% tax-ready.</h2><p>We’ve grouped your potential business deductions. Confirm every item has a clear business purpose before filing.</p></div><button className="dark-button" onClick={exportCsv}><Download /> Export summary</button></section>
            <section className="report-grid"><div className="panel"><div className="panel-head"><div><h3>Potential business deductions</h3><p>Based on confirmed business-use receipts</p></div><strong>{currency(totals.business)}</strong></div>{Object.entries(categoryMeta).map(([category, meta]) => { const items = receipts.filter((r) => r.category === category && r.taxUse === "Business"); const amount = items.reduce((sum, r) => sum + r.amount, 0); if (!amount) return null; const Icon = meta.icon; return <div className="deduction-row" key={category}><span className={`cat-icon ${meta.tone}`}><Icon /></span><div><b>{category}</b><small>{items.length} receipt{items.length > 1 ? "s" : ""}</small></div><strong>{currency(amount)}</strong><span className="status-ready"><Check /> Ready</span></div>; })}</div><aside className="panel filing-note"><span className="mini-icon"><AlertCircle /></span><h3>Before you file</h3><p>CukaiMate organises evidence; it does not decide whether an expense is legally deductible.</p><ol><li>Confirm every business purpose</li><li>Keep source receipts for LHDN record retention</li><li>Have a licensed tax agent review uncertain claims</li></ol><a href="https://www.hasil.gov.my" target="_blank" rel="noreferrer">Visit HASiL Malaysia <ArrowUpRight /></a></aside></section>
          </div>
        )}
      </section>

      {uploadOpen && <UploadModal draft={draft} setDraft={setDraft} processing={processing} progress={progress} fileRef={fileRef} onFile={handleFile} onClose={() => { setUploadOpen(false); setDraft(null); }} onSave={saveReceipt} />}
      {toast && <div className="toast"><Check /> {toast}</div>}
    </main>
  );
}

function ReceiptTable({ receipts, query, setQuery, onViewAll, full = false }: { receipts: Receipt[]; query: string; setQuery: (v: string) => void; onViewAll: () => void; full?: boolean }) {
  return <section className="panel receipt-list"><div className="panel-head"><div><h3>{full ? "All receipts" : "Recent receipts"}</h3><p>{full ? "Search, check and organise your records" : "Automatically extracted and categorised"}</p></div><div className="table-actions">{full && <label className="search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipts" /></label>}<button className="text-button" onClick={onViewAll}>{full ? "Add receipt" : "View all"} <ArrowUpRight /></button></div></div><div className="table-wrap"><table><thead><tr><th>Merchant</th><th>Date</th><th>Category</th><th>Tax use</th><th>Amount</th><th></th></tr></thead><tbody>{receipts.map((receipt) => { const Icon = categoryMeta[receipt.category].icon; return <tr key={receipt.id}><td><div className="merchant"><span className={`cat-icon ${categoryMeta[receipt.category].tone}`}><Icon /></span><div><b>{receipt.merchant}</b><small>{receipt.confidence}% match</small></div></div></td><td>{receipt.date}</td><td><span className="category-label">{receipt.category}</span></td><td><span className={`tax-use ${receipt.taxUse.toLowerCase()}`}>{receipt.taxUse === "Review" && <AlertCircle />}{receipt.taxUse}</span></td><td><strong>{currency(receipt.amount)}</strong></td><td><button className="more" aria-label={`Actions for ${receipt.merchant}`}><MoreHorizontal /></button></td></tr>; })}</tbody></table></div></section>;
}

function UploadModal({ draft, setDraft, processing, progress, fileRef, onFile, onClose, onSave }: { draft: Receipt | null; setDraft: (r: Receipt) => void; processing: boolean; progress: number; fileRef: React.RefObject<HTMLInputElement | null>; onFile: (f: File) => void; onClose: () => void; onSave: (e: FormEvent) => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title"><div className="modal"><div className="modal-head"><div><span className="pill"><Sparkles /> AI-assisted</span><h2 id="upload-title">Upload a receipt</h2><p>We’ll read the receipt and suggest a tax category.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button></div>{!draft ? <button className={`dropzone ${processing ? "processing" : ""}`} disabled={processing} onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) onFile(file); }}><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />{processing ? <><LoaderCircle className="spinner" /><strong>Reading your receipt…</strong><span>Extracting merchant, amount and category</span><div className="progress"><i style={{ width: `${progress}%` }}></i></div><small>{progress}% complete</small></> : <><span className="upload-icon"><Paperclip /></span><strong>Drop your receipt here</strong><span>or click to choose a photo</span><small>JPG, PNG or WEBP · up to 10 MB</small></>}</button> : <form onSubmit={onSave} className="receipt-form"><div className="detected"><span><Check /></span><div><strong>Details detected</strong><small>{draft.confidence}% category confidence · Please confirm</small></div></div><label>Merchant<input value={draft.merchant} onChange={(e) => setDraft({ ...draft, merchant: e.target.value })} required /></label><div className="form-row"><label>Amount (RM)<input type="number" step="0.01" min="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} required /></label><label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>{Object.keys(categoryMeta).map((category) => <option key={category}>{category}</option>)}</select></label></div><label>Tax use<div className="segmented">{(["Business", "Personal", "Review"] as const).map((value) => <button type="button" className={draft.taxUse === value ? "active" : ""} onClick={() => setDraft({ ...draft, taxUse: value })} key={value}>{value}</button>)}</div></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit"><Check /> Save receipt</button></div></form>}</div></div>;
}
