"use client";

import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleDollarSign,
  Download,
  FileCheck2,
  FileText,
  Landmark,
  LockKeyhole,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Scale,
  ShieldCheck,
  TableProperties,
  TrendingDown,
  TrendingUp,
  UnlockKeyhole,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AccountingReceipt,
  Account,
  accountByCode,
  balanceSheet,
  cashFlowStatement,
  chartOfAccounts,
  createReceiptJournal,
  JournalEntry,
  JournalLine,
  journalTotals,
  profitAndLoss,
  reverseJournal,
  seedJournalEntries,
  seedSoleProprietorJournalEntries,
  soleProprietorAccountByCode,
  soleProprietorChartOfAccounts,
  taxComputation,
  trialBalance,
  validateJournal,
} from "../lib/accounting";

export type CompanyAccountingView = "ledger" | "pl" | "balance" | "cashflow" | "tax";

type Props = {
  view: CompanyAccountingView;
  receipts: AccountingReceipt[];
  onToast: (message: string) => void;
  mode?: "company" | "soleProprietor";
};

const currency = (value: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);

function saveDownload(name: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function CompanyAccounting({ view, receipts, onToast, mode = "company" }: Props) {
  const isSoleProprietor = mode === "soleProprietor";
  const accounts = isSoleProprietor ? soleProprietorChartOfAccounts : chartOfAccounts;
  const accountsByCode = isSoleProprietor ? soleProprietorAccountByCode : accountByCode;
  const initialEntries = isSoleProprietor ? seedSoleProprietorJournalEntries : seedJournalEntries;
  const storageKey = isSoleProprietor ? "ams-sole-proprietor-journals-v1" : "ams-company-journals-v1";
  const lockKey = isSoleProprietor ? "ams-sole-proprietor-period-2026-locked" : "ams-company-period-2026-locked";
  const entityName = isSoleProprietor ? "Sim Lip Geap · Sole proprietor" : "Solver Academy Sdn. Bhd.";
  const exportName = isSoleProprietor ? "Sim-Lip-Geap-Form-B" : "Solver-Academy";
  const accountLabel = (code: string) => `${code} · ${accountsByCode[code]?.name || "Unknown account"}`;
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const [ready, setReady] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [periodLocked, setPeriodLocked] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      const lock = window.localStorage.getItem(lockKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the optional browser ledger after mount
        if (Array.isArray(parsed)) setEntries(parsed);
      }
      setPeriodLocked(lock === "true");
    } catch {
      // The selected browser ledger remains available when storage is blocked.
    } finally {
      setReady(true);
    }
  }, [lockKey, storageKey]);

  useEffect(() => {
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- create one draft journal for each newly uploaded receipt
    setEntries((current) => {
      const linked = new Set(current.map((entry) => entry.sourceReceiptId).filter(Boolean));
      const additions = receipts.filter((receipt) => !linked.has(receipt.id)).map((receipt) => createReceiptJournal(receipt, isSoleProprietor ? { privateAccountCode: "3200" } : undefined));
      return additions.length ? [...additions, ...current] : current;
    });
  }, [isSoleProprietor, ready, receipts]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, ready, storageKey]);

  const reports = useMemo(() => ({
    tb: trialBalance(entries, accounts),
    pnl: profitAndLoss(entries, accounts),
    balance: balanceSheet(entries, accounts),
    cashFlow: cashFlowStatement(entries, accounts),
    tax: taxComputation(entries, accounts),
  }), [accounts, entries]);

  const postedCount = entries.filter((entry) => entry.status === "posted").length;
  const draftCount = entries.filter((entry) => entry.status === "draft").length;

  function postEntry(id: string) {
    if (periodLocked) return onToast("The 2026 accounting period is locked. Unlock it before posting.");
    const entry = entries.find((item) => item.id === id);
    if (!entry || !validateJournal(entry, accounts)) return onToast("Journal cannot be posted: debit and credit must balance.");
    setEntries((current) => current.map((item) => item.id === id ? { ...item, status: "posted" } : item));
    onToast(`Journal posted to the ${isSoleProprietor ? "Form B business" : "Solver Academy"} general ledger.`);
  }

  function reverseEntry(entry: JournalEntry) {
    if (periodLocked) return onToast("The 2026 accounting period is locked. Unlock it before reversing.");
    if (entries.some((item) => item.reversedEntryId === entry.id)) return onToast("This journal already has a reversal entry.");
    setEntries((current) => [reverseJournal(entry), ...current]);
    onToast("A balanced reversal journal has been posted. The audit trail is preserved.");
  }

  function addJournal(entry: JournalEntry) {
    setEntries((current) => [entry, ...current]);
    setJournalOpen(false);
    onToast("Draft journal saved. Review it before posting.");
  }

  function toggleLock() {
    const next = !periodLocked;
    setPeriodLocked(next);
    window.localStorage.setItem(lockKey, String(next));
    onToast(next ? "Accounting period locked. Posted records are protected." : "Accounting period unlocked for authorised adjustments.");
  }

  function exportTrialBalance() {
    const rows = reports.tb.map((row) => [row.account.code, `"${row.account.name}"`, row.debit.toFixed(2), row.credit.toFixed(2)].join(","));
    saveDownload(`AMS-${exportName}-Trial-Balance-YA2026.csv`, ["Account code,Account,Debit MYR,Credit MYR", ...rows].join("\n"));
    onToast("Trial Balance exported as CSV.");
  }

  return <div className="content company-accounting">
    <section className="company-context">
      <div><span className="company-logo">{isSoleProprietor ? <BriefcaseBusiness /> : <Building2 />}</span><div><strong>{entityName}</strong><small>{isSoleProprietor ? "Business accounts · MYR · Year ending 31 Dec 2026 · Borang B" : "MPERS · MYR · Financial year ending 31 Dec 2026 · Borang C"}</small></div></div>
      <span className="source-chip"><ShieldCheck /> LHDN rules last reviewed 3 Aug 2026</span>
    </section>

    {view === "ledger" && <>
      <section className="feature-hero company-hero"><div><span className="pill"><BookOpen /> Double-entry accounting</span><h2>General Ledger &amp; Trial Balance</h2><p>{isSoleProprietor ? "Form B receipts create draft journals. Only balanced and confirmed entries reach the sole proprietor reports." : "Receipts create draft journals. Only balanced and confirmed journals are posted to the MPERS ledger."}</p><div className="hero-actions"><button className="dark-button" onClick={() => setJournalOpen(true)} disabled={periodLocked}><Plus /> Add journal</button><button className="secondary" onClick={toggleLock}>{periodLocked ? <UnlockKeyhole /> : <LockKeyhole />}{periodLocked ? "Unlock period" : "Lock period"}</button></div></div><div className={`ledger-balance-card ${reports.balance.balanced ? "ok" : "warning"}`}><Scale /><span>Accounting equation</span><strong>{reports.balance.balanced ? "Balanced" : "Review required"}</strong><small>Assets = Liabilities + Equity</small></div></section>
      <section className="metric-grid accounting-metrics">
        <article><div className="metric-icon mint"><FileCheck2 /></div><span>Posted journals</span><strong>{postedCount}</strong><small>Included in financial statements</small></article>
        <article><div className="metric-icon yellow"><ReceiptText /></div><span>Draft journals</span><strong>{draftCount}</strong><small>Waiting for confirmation</small></article>
        <article><div className="metric-icon blue"><TableProperties /></div><span>Trial Balance debit</span><strong>{currency(reports.tb.reduce((sum, row) => sum + row.debit, 0))}</strong><small>Credit total matches</small></article>
        <article><div className={`metric-icon ${periodLocked ? "green" : "peach"}`}>{periodLocked ? <LockKeyhole /> : <UnlockKeyhole />}</div><span>Accounting period</span><strong>{periodLocked ? "Locked" : "Open"}</strong><small>FY 1 Jan – 31 Dec 2026</small></article>
      </section>
      <section className="panel data-panel journal-panel"><div className="panel-head"><div><h3>Journal register</h3><p>Posted entries are never overwritten; corrections use a reversal.</p></div><button className="text-button" onClick={exportTrialBalance}><Download /> Export Trial Balance</button></div><div className="table-wrap"><table><thead><tr><th>Date / Reference</th><th>Description</th><th>Debit</th><th>Credit</th><th>Status</th><th>Action</th></tr></thead><tbody>{entries.map((entry) => { const totals = journalTotals(entry); const isReversed = entries.some((item) => item.reversedEntryId === entry.id); return <tr key={entry.id}><td><strong>{entry.date}</strong><small className="table-subline">{entry.reference}</small></td><td><strong>{entry.description}</strong><small className="table-subline">{entry.lines.map((item) => accountLabel(item.accountCode)).join(" · ")}</small></td><td>{currency(totals.debit)}</td><td>{currency(totals.credit)}</td><td><span className={`journal-status ${entry.status}`}>{entry.status === "posted" ? <Check /> : <AlertCircle />}{isReversed ? "Reversed" : entry.status}</span></td><td>{entry.status === "draft" ? <button className="row-action" onClick={() => postEntry(entry.id)} disabled={periodLocked}>Post</button> : entry.source !== "reversal" && !isReversed ? <button className="row-action subtle" onClick={() => reverseEntry(entry)} disabled={periodLocked}><RotateCcw /> Reverse</button> : <span className="locked-label"><LockKeyhole /> Audit trail</span>}</td></tr>; })}</tbody></table></div></section>
      <section className="panel data-panel trial-balance"><div className="panel-head"><div><h3>Trial Balance</h3><p>Posted journals only · as at 3 Aug 2026</p></div><span className="safe-chip"><Check /> Balanced</span></div><StatementTable rows={reports.tb.map((row) => ({ code: row.account.code, name: row.account.name, debit: row.debit, credit: row.credit }))} totalLabel="Total" /></section>
    </>}

    {view === "pl" && <ProfitAndLossView report={reports.pnl} onExport={() => {
      const rows = [...reports.pnl.income, ...reports.pnl.expenses].map((row) => `${row.account.code},"${row.account.name}",${row.amount.toFixed(2)}`);
      saveDownload(`AMS-${exportName}-Profit-and-Loss-YA2026.csv`, ["Account code,Account,Amount MYR", ...rows].join("\n"));
      onToast("Profit & Loss exported as CSV.");
    }} entityName={entityName} isSoleProprietor={isSoleProprietor} />}

    {view === "balance" && <BalanceSheetView report={reports.balance} isSoleProprietor={isSoleProprietor} />}
    {view === "cashflow" && <CashFlowView report={reports.cashFlow} isSoleProprietor={isSoleProprietor} />}
    {view === "tax" && !isSoleProprietor && <CompanyTaxView report={reports.tax} />}

    {journalOpen && <JournalModal accounts={accounts} entityName={entityName} onClose={() => setJournalOpen(false)} onSave={addJournal} />}
  </div>;
}

function StatementTable({ rows, totalLabel }: { rows: { code?: string; name: string; debit?: number; credit?: number; amount?: number }[]; totalLabel: string }) {
  const hasDebitCredit = true;
  return <div className="statement-table"><div className="statement-row statement-header"><span>Account</span>{hasDebitCredit ? <><span>Debit</span><span>Credit</span></> : <span>MYR</span>}</div>{rows.map((row) => <div className="statement-row" key={`${row.code}-${row.name}`}><span>{row.code && <small>{row.code}</small>}<b>{row.name}</b></span>{hasDebitCredit ? <><span>{row.debit ? currency(row.debit) : "—"}</span><span>{row.credit ? currency(row.credit) : "—"}</span></> : <span>{currency(row.amount || 0)}</span>}</div>)}<div className="statement-row statement-total"><span><b>{totalLabel}</b></span>{hasDebitCredit ? <><span>{currency(rows.reduce((sum, row) => sum + (row.debit || 0), 0))}</span><span>{currency(rows.reduce((sum, row) => sum + (row.credit || 0), 0))}</span></> : <span>{currency(rows.reduce((sum, row) => sum + (row.amount || 0), 0))}</span>}</div></div>;
}

function ProfitAndLossView({ report, onExport, entityName, isSoleProprietor }: { report: ReturnType<typeof profitAndLoss>; onExport: () => void; entityName: string; isSoleProprietor: boolean }) {
  return <><section className="statement-hero"><div><span className="pill"><TrendingUp /> {isSoleProprietor ? "Form B business accounts" : "MPERS financial statements"}</span><h2>Profit &amp; Loss</h2><p>For the period 1 Jan to 3 Aug 2026 · accrual basis · MYR</p></div><button className="dark-button" onClick={onExport}><Download /> Export P&amp;L</button></section><section className="statement-kpis"><article><span>Revenue</span><strong>{currency(report.revenue)}</strong><small>{isSoleProprietor ? "Sole proprietor business income" : "Training and operating income"}</small></article><article><span>Total expenses</span><strong>{currency(report.totalExpenses)}</strong><small>{isSoleProprietor ? "Business expenses from posted journals" : "Including depreciation and tax"}</small></article><article className={report.netProfit >= 0 ? "positive" : "negative"}><span>{isSoleProprietor ? "Net business profit" : "Net profit after tax"}</span><strong>{currency(report.netProfit)}</strong><small>{report.netProfit >= 0 ? "Profitable period" : "Loss for the period"}</small></article></section><div className="financial-grid"><section className="panel financial-statement"><div className="statement-title"><div><h3>{entityName}</h3><p>Statement of Profit or Loss</p></div><span>Current period</span></div><StatementGroup title="Income" rows={report.income.map((row) => ({ name: row.account.name, amount: row.amount }))} /><StatementGroup title="Expenses" rows={report.expenses.map((row) => ({ name: row.account.name, amount: row.amount }))} /><div className="grand-total"><span>Profit before tax</span><strong>{currency(report.profitBeforeTax)}</strong></div><div className="grand-total final"><span>Profit for the period</span><strong>{currency(report.netProfit)}</strong></div></section><aside className="panel report-notes"><BadgeCheck /><h3>Report checks</h3><ul><li><Check /> Generated from posted journals</li><li><Check /> Accrual accounting applied</li><li><Check /> Depreciation separated from capital allowance</li><li><AlertCircle /> Comparative figures need prior-year opening balances</li></ul></aside></div></>;
}

function StatementGroup({ title, rows }: { title: string; rows: { name: string; amount: number }[] }) {
  return <div className="statement-group"><h4>{title}</h4>{rows.map((row) => <div key={row.name}><span>{row.name}</span><strong>{currency(row.amount)}</strong></div>)}<div className="subtotal"><span>{`Total ${title.toLowerCase()}`}</span><strong>{currency(rows.reduce((sum, row) => sum + row.amount, 0))}</strong></div></div>;
}

function BalanceSheetView({ report, isSoleProprietor }: { report: ReturnType<typeof balanceSheet>; isSoleProprietor: boolean }) {
  return <><section className="statement-hero"><div><span className="pill"><Scale /> {isSoleProprietor ? "Form B business accounts" : "MPERS financial statements"}</span><h2>Balance Sheet</h2><p>Statement of Financial Position as at 3 Aug 2026 · MYR</p></div><span className={`balance-badge ${report.balanced ? "balanced" : "unbalanced"}`}>{report.balanced ? <Check /> : <AlertCircle />}{report.balanced ? "Accounting equation balanced" : "Review required"}</span></section><section className="equation-strip"><div><span>Total assets</span><strong>{currency(report.totalAssets)}</strong></div><b>=</b><div><span>Total liabilities</span><strong>{currency(report.totalLiabilities)}</strong></div><b>+</b><div><span>Total equity</span><strong>{currency(report.totalEquity)}</strong></div></section><div className="balance-columns"><section className="panel financial-statement"><div className="statement-title"><div><h3>Assets</h3><p>{isSoleProprietor ? "Resources used by the sole proprietor business" : "Resources controlled by the company"}</p></div></div><BalanceGroups rows={report.assets} /></section><section className="panel financial-statement"><div className="statement-title"><div><h3>Liabilities &amp; Equity</h3><p>{isSoleProprietor ? "Business obligations and owner's funds" : "Obligations and shareholders’ funds"}</p></div></div><BalanceGroups rows={report.liabilities} /><StatementGroup title={isSoleProprietor ? "Owner's equity" : "Equity"} rows={[...report.equity.map((row) => ({ name: row.account.name, amount: row.amount })), { name: "Current year earnings", amount: report.currentYearEarnings }]} /></section></div></>;
}

function BalanceGroups({ rows }: { rows: { account: Account; amount: number }[] }) {
  const sections = [...new Set(rows.map((row) => row.account.section))];
  return <>{sections.map((section) => <StatementGroup key={section} title={section} rows={rows.filter((row) => row.account.section === section).map((row) => ({ name: row.account.name, amount: row.amount }))} />)}</>;
}

function CashFlowView({ report, isSoleProprietor }: { report: ReturnType<typeof cashFlowStatement>; isSoleProprietor: boolean }) {
  return <><section className="statement-hero"><div><span className="pill"><Landmark /> {isSoleProprietor ? "Form B · indirect method" : "MPERS · indirect method"}</span><h2>Cash Flow Statement</h2><p>Cash movements reconciled to the General Ledger and Balance Sheet.</p></div><span className={`balance-badge ${report.reconciled ? "balanced" : "unbalanced"}`}>{report.reconciled ? <Check /> : <AlertCircle />}{report.reconciled ? "Cash reconciled" : "Difference detected"}</span></section><section className="cashflow-summary"><article><span>Operating activities</span><strong className={report.operating >= 0 ? "positive-text" : "negative-text"}>{currency(report.operating)}</strong><TrendingUp /></article><article><span>Investing activities</span><strong>{currency(report.investing)}</strong><TrendingDown /></article><article><span>Financing activities</span><strong>{currency(report.financing)}</strong><CircleDollarSign /></article></section><section className="panel financial-statement cashflow-statement"><div className="statement-title"><div><h3>Statement of Cash Flows</h3><p>For the period ended 3 Aug 2026</p></div><span>MYR</span></div><StatementGroup title="Cash flows from operating activities" rows={[{ name: "Profit before tax", amount: report.profitBeforeTax }, { name: "Depreciation and non-cash charges", amount: report.depreciation }, { name: "Working capital and other operating movements", amount: report.otherOperatingAdjustments }, { name: "Income tax paid", amount: -report.taxPaid }]} /><StatementGroup title="Cash flows from investing activities" rows={[{ name: "Purchase of computer equipment", amount: report.investing }]} /><StatementGroup title="Cash flows from financing activities" rows={[{ name: isSoleProprietor ? "Owner capital, drawings, loans and repayments" : "Share capital, loans and repayments", amount: report.financing }]} /><div className="grand-total"><span>Net increase in cash</span><strong>{currency(report.netChange)}</strong></div><div className="cash-reconciliation"><span>Cash at beginning of period <b>{currency(report.openingCash)}</b></span><span>Cash at end of period <b>{currency(report.endingCash)}</b></span></div></section></>;
}

function CompanyTaxView({ report }: { report: ReturnType<typeof taxComputation> }) {
  return <><section className="statement-hero tax-computation-hero"><div><span className="pill"><FileText /> Borang C · YA 2026 preparation</span><h2>Company tax computation</h2><p>Book-to-tax reconciliation for Solver Academy Sdn. Bhd. Final rates, incentives and claims require taxpayer or licensed tax-agent confirmation.</p></div><a className="dark-button" href="https://mytax.hasil.gov.my" target="_blank" rel="noreferrer">Open MyTax <ArrowUpRight /></a></section><div className="financial-grid tax-grid"><section className="panel financial-statement"><div className="statement-title"><div><h3>Income tax working paper</h3><p>Linked to the MPERS General Ledger</p></div><span>YA 2026</span></div><div className="tax-line"><span>Profit before tax</span><strong>{currency(report.profitBeforeTax)}</strong></div>{report.addbacks.map((row) => <div className="tax-line" key={row.account.code}><span>Add back: {row.account.name}<small>{row.account.taxTreatment === "review" ? "Requires deductibility review" : "Not deductible in tax computation"}</small></span><strong>{currency(row.amount)}</strong></div>)}<div className="tax-line subtotal"><span>Adjusted business income</span><strong>{currency(report.adjustedIncome)}</strong></div><div className="tax-line"><span>Less: provisional capital allowance<small>Illustrative 20% only; confirm asset class and Schedule 3 rate</small></span><strong>({currency(report.provisionalCapitalAllowance)})</strong></div><div className="grand-total final"><span>Provisional statutory income</span><strong>{currency(report.statutoryIncome)}</strong></div><section className="compliance-warning"><AlertCircle /><p>No corporate tax rate is auto-applied until SME status, paid-up capital, related-company conditions, incentives and official YA rules are confirmed.</p></section></section><aside className="panel compliance-side"><h3>Form C &amp; CP204</h3><div><BadgeCheck /><p><b>Form C</b><small>Due within 7 months after financial year end</small></p></div><div><CircleDollarSign /><p><b>CP204 / CP204A</b><small>Track estimate, revisions and monthly instalments</small></p></div><div><LockKeyhole /><p><b>Seven-year records</b><small>Keep ledgers, supporting documents and working papers</small></p></div><a href="https://www.hasil.gov.my/en/company/corporate-tax/" target="_blank" rel="noreferrer">HASiL corporate tax guidance <ArrowUpRight /></a></aside></div><section className="mitrs-section"><div className="panel-head"><div><h3>MITRS submission pack</h3><p>Section 82B specified documents · company category</p></div><span className="safe-chip">Within 30 days after Form C due date</span></div><div className="mitrs-grid"><article><FileCheck2 /><div><b>Financial statements</b><small>Audited or qualifying unaudited PDF</small></div><span>Ready</span></article><article><FileText /><div><b>Income tax computation</b><small>Detailed P&amp;L and tax adjustments</small></div><span>Draft</span></article><article><TableProperties /><div><b>Capital allowance schedule</b><small>Schedule 3 asset movements</small></div><span>Review</span></article><article><ShieldCheck /><div><b>Incentive computation</b><small>Include only when an incentive is claimed</small></div><span>Not applicable</span></article></div><a className="official-source" href="https://www.hasil.gov.my/en/forms/filing-programme-for-documents-specified-under-section-82b-ita-1967-through-mitrs/assessment-year-2026/" target="_blank" rel="noreferrer"><ShieldCheck /> Official HASiL MITRS YA 2026 source <ArrowUpRight /></a></section></>;
}

function JournalModal({ accounts, entityName, onClose, onSave }: { accounts: Account[]; entityName: string; onClose: () => void; onSave: (entry: JournalEntry) => void }) {
  const [date, setDate] = useState("2026-08-03");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([{ accountCode: "1010", debit: 0, credit: 0 }, { accountCode: "4000", debit: 0, credit: 0 }]);
  const totals = journalTotals({ lines });
  const valid = validateJournal({ lines }, accounts) && reference.trim() && description.trim();
  const updateLine = (index: number, patch: Partial<JournalLine>) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    onSave({ id: crypto.randomUUID(), date, reference: reference.trim(), description: description.trim(), source: "manual", status: "draft", lines, createdAt: new Date().toISOString() });
  }

  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="journal-title"><div className="modal journal-modal"><div className="modal-head"><div><span className="pill"><BookOpen /> {entityName} · General Ledger</span><h2 id="journal-title">New journal entry</h2><p>Add two or more lines. Total debit must equal total credit.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button></div><form onSubmit={submit} className="journal-form"><div className="form-row"><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label>Reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. JV-26001" required /></label></div><label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain the business transaction" required /></label><div className="journal-lines"><div className="journal-line header"><span>Account</span><span>Debit</span><span>Credit</span><span></span></div>{lines.map((item, index) => <div className="journal-line" key={index}><select value={item.accountCode} onChange={(event) => updateLine(index, { accountCode: event.target.value })}>{accounts.map((account) => <option value={account.code} key={account.code}>{account.code} · {account.name}</option>)}</select><input type="number" min="0" step="0.01" value={item.debit || ""} placeholder="0.00" onChange={(event) => updateLine(index, { debit: Number(event.target.value), credit: Number(event.target.value) > 0 ? 0 : item.credit })} /><input type="number" min="0" step="0.01" value={item.credit || ""} placeholder="0.00" onChange={(event) => updateLine(index, { credit: Number(event.target.value), debit: Number(event.target.value) > 0 ? 0 : item.debit })} /><button type="button" className="remove-line" onClick={() => lines.length > 2 && setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} disabled={lines.length <= 2}><X /></button></div>)}</div><button type="button" className="add-line" onClick={() => setLines((current) => [...current, { accountCode: "2000", debit: 0, credit: 0 }])}><Plus /> Add line</button><div className={`journal-total ${totals.debit === totals.credit && totals.debit > 0 ? "balanced" : "unbalanced"}`}><span>Total</span><b>Debit {currency(totals.debit)}</b><b>Credit {currency(totals.credit)}</b><strong>{totals.debit === totals.credit && totals.debit > 0 ? <><Check /> Balanced</> : <><AlertCircle /> Difference {currency(Math.abs(totals.debit - totals.credit))}</>}</strong></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit" disabled={!valid}><Save /> Save draft journal</button></div></form></div></div>;
}
