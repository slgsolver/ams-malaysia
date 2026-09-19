"use client";

import { AlertCircle, ArrowUpRight, Check, Download, FileText, Plus, Save, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getReceiptEvidence, saveReceiptEvidence } from "../lib/receipt-evidence";
import { estimateStampDuty, isValidStampDate, loadStampRecords, STAMP_CATEGORIES, STAMP_DEADLINE_URL, STAMP_GUIDE_URL, STAMP_RULE_VERSION, STSDS_URL, stampDeadline, stampRetentionUntil } from "../lib/stamp-duty";
import type { StampCategory, StampEntity, StampRecord, StampStatus } from "../lib/stamp-duty";

const fmt = new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const evidenceKey = (id: string) => `stamp:${id}`;

function emptyRecord(entity: StampEntity): StampRecord {
  return { id: crypto.randomUUID(), entity, title: "", category: "lease", executedAt: "", executionPlace: "malaysia", status: "draft" };
}

const categoryZh: Record<StampCategory, string> = {
  lease: "租赁／租约", shares: "非上市股份转让", property: "房地产转让", "business-transfer": "业务转让", "other-transfer": "其他资产／权益转让", security: "担保／融资文件", general: "一般盖章",
};
const statusZh: Record<StampStatus, string> = { draft: "草稿", submitted: "已提交", stamped: "已盖章（自行记录）" };
const reviewZh: Record<string, string> = {
  "Enter a valid execution/signing date first.": "请先填写有效的签署日期。",
  "This 2026 working-paper rate table is not applied automatically to pre-2026 instruments. Check the law and relief in force on the signing date.": "2026 年参考税率不自动套用于之前签署的文件；请核对签署当日有效的法规及减免。",
  "Enter average annual rent/other yearly consideration and lease duration.": "请填写平均全年租金、其他年度代价及租期。",
  "A fine or premium may attract additional duty. Obtain a full assessment.": "一次性 premium／fine 可能另须缴税，请取得完整评税。",
  "Indicative only; confirm actual annual consideration, term, exemptions and document clauses.": "仅供参考；请核对实际年度代价、租期、豁免及文件条款。",
  "Enter both consideration and a supported share valuation (for ordinary shares, assess NTA where applicable).": "请填写交易代价及有依据的股份估值；普通股适用时须核对净有形资产（NTA）。",
  "Uses the higher input. Verify NTA, preference-share valuation, relief and the instrument's legal effect.": "按较高输入金额估算；请核对 NTA、优先股估值、减免及文件的法律效力。",
  "Enter both consideration and market value. Use the higher amount.": "请填写交易代价及市场价值，以较高者作为估算基础。",
  "2026 foreign-buyer residential rate. Confirm citizenship/PR status, transaction date and exemptions.": "按 2026 年外国买方住宅税率估算；请核对公民／永久居民身份、交易日期及豁免。",
  "Foreign-buyer rate. Confirm citizenship/PR status, property type and exemptions.": "按外国买方税率估算；请核对身份、房地产类型及豁免。",
  "Progressive rate on the higher input. Confirm valuation, exemption/remission and instrument type.": "按较高输入金额分级估算；请核对估值、豁免／减免及文件类型。",
  "Confirm the document does not create a lease, transfer, security or another special charge, and check exemptions.": "请确认文件不构成租赁、转让、担保或其他特别税目，并检查豁免。",
  "RM10 is a typical fixed duty, not a universal rate. Verify the correct First Schedule item and exemptions.": "RM10 只是常见固定税额，并非通用税率；请核对第一附表税目及豁免。",
  "Transfer may include assets, liabilities and goodwill. Obtain transaction-specific valuation and review.": "业务转让可能包括资产、负债及商誉；请按具体交易估值并审核。",
  "Rights, policies and gifts can follow different items. Review the actual legal effect and valuation.": "权利、保单及赠与可能适用不同税目；请审核实际法律效力及估值。",
  "Security and financing instruments have different items and possible relief. Do not apply a generic RM10 rate.": "担保及融资文件涉及不同税目和可能减免；不能一律套用 RM10。",
};
const payerZh: Record<string, string> = {
  "Check Third Schedule": "核对第三附表", "Tenant / lessee (principal instrument)": "承租人（主文件）", "Buyer / transferee": "买方／受让人",
  "Signatory / executing party": "签署方", "Assignee / transferee": "受让人", "Obligor / security provider, as applicable": "债务人／担保提供者（视情况）",
};
const provisionZh: Record<string, string> = {
  "First Schedule": "第一附表", "Historical instrument": "旧年度文件", "General stamping": "一般盖章",
  "General stamping · usually RM10": "一般盖章 · 通常 RM10", "Various First Schedule items": "第一附表多个税目",
};

export default function StampDutyWorkspace({ entity, language, onToast }: { entity: StampEntity; language: "en" | "zh"; onToast: (message: string) => void }) {
  const zh = language === "zh";
  const [records, setRecords] = useState<StampRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<StampRecord | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const scoped = useMemo(() => records.filter((item) => item.entity === entity).sort((a, b) => b.executedAt.localeCompare(a.executedAt)), [records, entity]);
  const pending = scoped.filter((item) => item.status !== "stamped").length;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate browser-local register after mount
    setRecords(loadStampRecords());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem("ams-stamp-duty-v1", JSON.stringify(records)); }
    catch { onToast(zh ? "浏览器无法保存印花税记录，请导出审计包备份。" : "Browser could not save stamp-duty records. Export an Audit Pack backup."); }
  }, [records, ready, onToast, zh]);

  function update<K extends keyof StampRecord>(key: K, value: StampRecord[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  }
  function moneyInput(key: "annualRent" | "consideration" | "assessedValue" | "officialDuty", value: string) {
    update(key, value === "" ? undefined : Number(value));
  }
  function openNew() { setDraft(emptyRecord(entity)); setFile(null); }
  function edit(item: StampRecord) { setDraft({ ...item }); setFile(null); }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    const item = { ...draft, title: draft.title.trim(), certificateReference: draft.certificateReference?.trim(), notes: draft.notes?.trim() };
    if (!item.title || !isValidStampDate(item.executedAt)) {
      onToast(zh ? "请填写文件名称及有效签署日期。" : "Enter an instrument name and a valid signing date."); return;
    }
    if (item.executionPlace === "overseas" && item.receivedInMalaysiaAt && (!isValidStampDate(item.receivedInMalaysiaAt) || item.receivedInMalaysiaAt < item.executedAt)) {
      onToast(zh ? "在马来西亚收到的日期不能早于签署日期。" : "Malaysia receipt date cannot be before execution date."); return;
    }
    if (item.status === "submitted" && !item.submittedAt || item.status === "stamped" && (!item.paidAt || item.officialDuty === undefined || !item.certificateReference)) {
      onToast(zh ? "已提交须填写提交日期；已盖章须填写实付金额、付款日期及证书编号。" : "Submitted requires a submission date; stamped requires official duty, payment date and certificate reference."); return;
    }
    if (item.submittedAt && !isValidStampDate(item.submittedAt) || item.paidAt && !isValidStampDate(item.paidAt) || item.officialDuty !== undefined && (!Number.isFinite(item.officialDuty) || item.officialDuty < 0)) {
      onToast(zh ? "请检查提交／缴款日期和实付税额。" : "Check submission/payment dates and official duty amount."); return;
    }
    if (item.paidAt && item.paidAt < item.executedAt || item.submittedAt && item.submittedAt < item.executedAt) {
      onToast(zh ? "提交或付款日期不能早于签署日期。" : "Submission/payment date cannot be before signing date."); return;
    }
    if (file && (!/\.pdf$/i.test(file.name) || file.size < 1 || file.size > 20 * 1024 * 1024)) {
      onToast(zh ? "只接受不超过 20 MB 的 PDF。" : "Use a non-empty PDF up to 20 MB."); return;
    }
    if (file && new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-") {
      onToast(zh ? "文件内容不是有效的 PDF。" : "The selected file does not contain a PDF header."); return;
    }
    setBusy(true);
    try {
      if (file) {
        await saveReceiptEvidence([{ id: evidenceKey(item.id), pdf: file }]);
        item.fileName = file.name;
        item.hasEvidence = true;
      }
      setRecords((current) => [item, ...current.filter((saved) => saved.id !== item.id)]);
      setDraft(null);
      setFile(null);
      onToast(zh ? "印花税记录已保存；参考税额不是 LHDN 正式评税。" : "Stamp-duty record saved. The estimate is not a HASiL assessment.");
    } catch {
      onToast(zh ? "PDF 无法保存；记录没有加入。" : "PDF evidence could not be saved; the record was not added.");
    } finally { setBusy(false); }
  }

  async function openPdf(item: StampRecord) {
    const tab = window.open("", "_blank");
    if (!tab) { onToast(zh ? "请允许弹出窗口，以查看 PDF。" : "Allow pop-ups to view the PDF."); return; }
    try {
      const pdf = await getReceiptEvidence(evidenceKey(item.id));
      if (!pdf) { tab.close(); onToast(zh ? "此浏览器找不到该 PDF。" : "This PDF is missing from this browser."); return; }
      const url = URL.createObjectURL(pdf);
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch { tab.close(); onToast(zh ? "无法打开 PDF。" : "Could not open the PDF."); }
  }

  const estimate = draft ? estimateStampDuty(draft) : null;
  const due = draft ? stampDeadline(draft) : null;
  const phase = draft && ["lease", "security", "general"].includes(draft.category) ? "1 · 2026" : draft?.category === "property" ? zh ? "2 · 2027（无需 JPPH 估值）" : "2 · 2027 (without JPPH valuation)" : "3 · 2028";

  return <div className="content feature-page stamp-page">
    <section className="feature-hero compact"><div><span className="pill"><ShieldCheck /> {zh ? "马来西亚印花税" : "Malaysia stamp duty"}</span><h2>{zh ? "按文件法律内容，检查印花税。" : "Review stamp duty by legal effect, not document title."}</h2><p>{zh ? "依据 LHDN 于 2026 年 6 月 30 日发布的第一附表指南。参考金额只用于准备资料；豁免、减免、正式分类与评税须在 MyTax 核实。此登记簿与 Form B／BE／C 所得税扣除分开。" : "Based on HASiL's 30 June 2026 First Schedule guide. Estimates are working-paper figures only; verify classification, exemption, relief and final assessment in MyTax. This register does not automatically create Form B/BE/C income-tax deductions."}</p><div className="hero-actions"><button className="dark-button" onClick={openNew}><Plus /> {zh ? "新增文件" : "Add instrument"}</button><a className="secondary filing-link" href={STAMP_GUIDE_URL} target="_blank" rel="noreferrer">{zh ? "阅读 LHDN 原文" : "Read HASiL guide"} <ArrowUpRight /></a></div></div><div className="stamp-hero-note"><strong>{STAMP_RULE_VERSION}</strong><span>{zh ? "规则来源版本" : "Source rule version"}</span><b>{pending} {zh ? "份待完成" : "to review / complete"}</b></div></section>

    <section className="panel stamp-warning"><AlertCircle /><div><strong>{zh ? "重要：不是每份合同都收 RM10" : "Important: not every agreement costs RM10"}</strong><p>{zh ? "租赁、转让和担保文件可能按金额征税；一般盖章通常 RM10，但也有特别税目和豁免。标题相同的文件，也可能因条款不同而税额不同。" : "Leases, transfers and security instruments may be charged by value. General stamping is usually RM10, subject to special items and exemptions. Similar document titles can have different legal effects."}</p></div></section>

    <section className="stamp-guide-grid">
      <article className="panel"><strong>{zh ? "签署后期限" : "Stamping timeframe"}</strong><p>{zh ? "在马来西亚签署：一般自签署日起 30 天；境外签署：一般自首次送达马来西亚日起 30 天。逾期可能有罚款。" : "Usually 30 days from execution in Malaysia, or 30 days from first receipt in Malaysia if executed overseas. Late stamping may incur penalties."}</p><a href={STAMP_DEADLINE_URL} target="_blank" rel="noreferrer">{zh ? "LHDN 期限说明" : "HASiL deadline guidance"} <ArrowUpRight /></a></article>
      <article className="panel"><strong>STSDS / e-Duti Setem</strong><p>{zh ? "2026 年第 1 阶段：租赁、担保及一般盖章；2027 年第 2 阶段：部分房地产转让；2028 年第 3 阶段：其余文件。提交和缴款须在 MyTax 完成。" : "Phase 1 in 2026: lease, security and general stamping. Phase 2 in 2027: certain property transfers. Phase 3 in 2028: other instruments. File and pay through MyTax."}</p><a href={STSDS_URL} target="_blank" rel="noreferrer">{zh ? "LHDN STSDS 说明" : "HASiL STSDS guidance"} <ArrowUpRight /></a></article>
      <article className="panel"><strong>{zh ? "保存凭证" : "Keep evidence"}</strong><p>{zh ? "STSDS 要求已盖章文件及相关记录，自缴税日起保留七年。AMS 的 PDF 存在当前浏览器，请从审计资料包备份。" : "STSDS records and stamped instruments should be kept for seven years from duty payment. AMS PDFs stay in this browser; back them up from Audit Pack."}</p></article>
    </section>

    {draft && <section className="panel stamp-editor"><div className="panel-head"><div><h3>{scoped.some((item) => item.id === draft.id) ? zh ? "编辑文件记录" : "Edit instrument" : zh ? "新增文件记录" : "Add instrument"}</h3><p>{zh ? "先选择法律性质；无法确定时请保留待人工审核。" : "Choose the legal nature; keep uncertain cases for professional review."}</p></div><button className="text-button" type="button" onClick={() => { setDraft(null); setFile(null); }}>{zh ? "取消" : "Cancel"}</button></div>
      <form onSubmit={save}>
        <div className="stamp-form-grid">
          <label>{zh ? "文件名称" : "Instrument name"}<input required maxLength={160} value={draft.title} onChange={(e) => update("title", e.target.value)} placeholder={zh ? "例如：办公室租赁协议" : "e.g. Office tenancy agreement"} /></label>
          <label>{zh ? "法律类别" : "Legal category"}<select value={draft.category} onChange={(e) => update("category", e.target.value as StampCategory)}>{STAMP_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{zh ? categoryZh[item.id] : item.label} · {item.section}</option>)}</select></label>
          <label>{zh ? "签署日期" : "Execution / signing date"}<input required type="date" value={draft.executedAt} onChange={(e) => update("executedAt", e.target.value)} /></label>
          <label>{zh ? "签署地点" : "Execution place"}<select value={draft.executionPlace} onChange={(e) => update("executionPlace", e.target.value as StampRecord["executionPlace"])}><option value="malaysia">{zh ? "马来西亚" : "Malaysia"}</option><option value="overseas">{zh ? "境外" : "Overseas"}</option></select></label>
          {draft.executionPlace === "overseas" && <label>{zh ? "首次送达马来西亚日期" : "First received in Malaysia"}<input type="date" value={draft.receivedInMalaysiaAt || ""} onChange={(e) => update("receivedInMalaysiaAt", e.target.value || undefined)} /></label>}
          {draft.category === "lease" && <><label>{zh ? "平均全年租金及其他年度代价 RM" : "Average annual rent + other yearly consideration (RM)"}<input type="number" min="0" max="1000000000000" step="0.01" value={draft.annualRent ?? ""} onChange={(e) => moneyInput("annualRent", e.target.value)} /></label><label>{zh ? "租期（月）" : "Lease term (months)"}<input type="number" min="1" max="1200" step="1" value={draft.termMonths ?? ""} onChange={(e) => update("termMonths", e.target.value ? Number(e.target.value) : undefined)} /></label><label className="stamp-check"><input type="checkbox" checked={draft.hasPremium || false} onChange={(e) => update("hasPremium", e.target.checked)} />{zh ? "含一次性 premium / fine（转人工计算）" : "Includes lump-sum premium / fine (manual assessment)"}</label></>}
          {(draft.category === "shares" || draft.category === "property") && <><label>{zh ? "交易代价 RM" : "Consideration (RM)"}<input type="number" min="0" max="1000000000000" step="0.01" value={draft.consideration ?? ""} onChange={(e) => moneyInput("consideration", e.target.value)} /></label><label>{draft.category === "shares" ? zh ? "有依据的股份估值 RM" : "Supported share value (RM)" : zh ? "市场价值 RM" : "Market value (RM)"}<input type="number" min="0" max="1000000000000" step="0.01" value={draft.assessedValue ?? ""} onChange={(e) => moneyInput("assessedValue", e.target.value)} /></label></>}
          {draft.category === "property" && <><label className="stamp-check"><input type="checkbox" checked={draft.foreignBuyer || false} onChange={(e) => update("foreignBuyer", e.target.checked)} />{zh ? "买方为外国公司，或非公民且非永久居民" : "Foreign company or non-citizen/non-PR buyer"}</label><label className="stamp-check"><input type="checkbox" checked={draft.residential || false} onChange={(e) => update("residential", e.target.checked)} />{zh ? "住宅房地产" : "Residential property"}</label></>}
          {draft.category === "general" && <label className="stamp-check stamp-wide"><input type="checkbox" checked={draft.generalConfirmed || false} onChange={(e) => update("generalConfirmed", e.target.checked)} />{zh ? "我已检查条款：不是租赁、转让、担保／融资，也已检查特别税目及豁免" : "I checked the clauses: not a lease, transfer or security/financing instrument; special items and exemptions were reviewed"}</label>}
        </div>
        <div className="stamp-estimate"><div><small>{zh ? "参考税额（非正式评税）" : "Indicative duty · not an assessment"}</small><strong>{estimate?.amount === null ? zh ? "人工审核" : "Manual review" : fmt.format(estimate?.amount || 0)}</strong><span>{zh ? provisionZh[estimate?.provision || ""] || estimate?.provision : estimate?.provision} · {zh ? "可能付款方" : "Likely payer"}: {zh ? payerZh[estimate?.payer || ""] || estimate?.payer : estimate?.payer}</span></div><p><span>{zh ? reviewZh[estimate?.review || ""] || estimate?.review : estimate?.review}</span><br />{zh ? "提交／盖章期限" : "Indicative stamping deadline"}: <b>{due || (draft.executionPlace === "overseas" ? zh ? "需境内收到日期" : "Need Malaysia receipt date" : zh ? "需签署日期" : "Need signing date")}</b> · STSDS {zh ? "阶段" : "phase"} {phase}</p></div>
        <div className="stamp-form-grid">
          <label>{zh ? "进度" : "Status"}<select value={draft.status} onChange={(e) => update("status", e.target.value as StampStatus)}><option value="draft">{zh ? "草稿／待审核" : "Draft / review"}</option><option value="submitted">{zh ? "已在 MyTax 提交（自行记录）" : "Submitted in MyTax (user-recorded)"}</option><option value="stamped">{zh ? "已盖章（自行记录）" : "Stamped (user-recorded)"}</option></select></label>
          {(draft.status === "submitted" || draft.status === "stamped") && <label>{zh ? "MyTax 提交日期" : "MyTax submission date"}<input type="date" value={draft.submittedAt || ""} onChange={(e) => update("submittedAt", e.target.value || undefined)} /></label>}
          {draft.status === "stamped" && <><label>{zh ? "LHDN 实付税额 RM" : "Official duty paid (RM)"}<input type="number" min="0" max="1000000000000" step="0.01" value={draft.officialDuty ?? ""} onChange={(e) => moneyInput("officialDuty", e.target.value)} /></label><label>{zh ? "缴款日期" : "Duty payment date"}<input type="date" value={draft.paidAt || ""} onChange={(e) => update("paidAt", e.target.value || undefined)} /></label><label>{zh ? "盖章证书／参考编号" : "Stamp certificate / reference"}<input maxLength={160} value={draft.certificateReference || ""} onChange={(e) => update("certificateReference", e.target.value)} /></label></>}
          <label>{zh ? "文件 PDF（留在此浏览器）" : "Instrument PDF (stored in this browser)"}<input type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />{draft.hasEvidence && !file && <small>{draft.fileName || "PDF saved"}</small>}</label>
          <label className="stamp-wide">{zh ? "审核备注／豁免依据" : "Review notes / exemption reference"}<textarea rows={3} maxLength={1000} value={draft.notes || ""} onChange={(e) => update("notes", e.target.value)} placeholder={zh ? "注明条款、估值资料或须交税务代理审核的问题" : "Document clauses, valuation support or questions for your tax agent"} /></label>
        </div>
        <div className="stamp-form-actions"><button className="dark-button" type="submit" disabled={busy}><Save /> {busy ? zh ? "保存中…" : "Saving…" : zh ? "保存记录" : "Save record"}</button><span>{zh ? "AMS 不会代你提交 MyTax，也不会自动入账或作为所得税扣除。" : "AMS does not file MyTax, post journals or claim an income-tax deduction automatically."}</span></div>
      </form>
    </section>}

    <section className="panel stamp-register"><div className="panel-head"><div><h3>{zh ? "本账户文件登记簿" : "Instrument register for this account"}</h3><p>{scoped.length} {zh ? "份文件 · 与其他账户分开" : `${scoped.length === 1 ? "instrument" : "instruments"} · separated from other accounts`}</p></div><button className="text-button" onClick={openNew}><Plus /> {zh ? "新增" : "Add"}</button></div>
      {scoped.length === 0 ? <div className="stamp-empty"><FileText /><strong>{zh ? "尚无印花税文件" : "No stamp-duty instruments yet"}</strong><p>{zh ? "先添加租赁、股份、房地产、担保或一般协议。" : "Add a lease, share transfer, property, financing or general agreement to begin."}</p></div> : <div className="table-wrap"><table><thead><tr><th>{zh ? "文件" : "Instrument"}</th><th>{zh ? "类别" : "Category"}</th><th>{zh ? "签署／期限" : "Signed / due"}</th><th>{zh ? "参考税额" : "Estimate"}</th><th>{zh ? "正式税额" : "Official"}</th><th>{zh ? "状态" : "Status"}</th><th>{zh ? "凭证／操作" : "Evidence / action"}</th></tr></thead><tbody>{scoped.map((item) => { const result = estimateStampDuty(item); const deadline = stampDeadline(item); const overdue = deadline && item.status !== "stamped" && deadline < today(); return <tr key={item.id}><td><strong>{item.title}</strong><small>{item.notes || item.certificateReference || ""}</small></td><td>{zh ? categoryZh[item.category] : STAMP_CATEGORIES.find((category) => category.id === item.category)?.label}</td><td>{item.executedAt}<small className={overdue ? "stamp-overdue" : ""}>{deadline ? `${zh ? "期限" : "Due"}: ${deadline}` : zh ? "待确认期限" : "Date needed"}</small></td><td>{result.amount === null ? <span className="review-chip">{zh ? "人工审核" : "Review"}</span> : fmt.format(result.amount)}</td><td>{item.officialDuty === undefined ? "—" : fmt.format(item.officialDuty)}{item.paidAt && <small>{zh ? "保留至约" : "Retain to ~"} {stampRetentionUntil(item.paidAt)}</small>}</td><td><span className={item.status === "stamped" ? "status-ready" : "review-chip"}>{item.status === "stamped" ? <Check /> : <AlertCircle />}{zh ? statusZh[item.status] : item.status === "stamped" ? "Stamped · user record" : item.status}</span></td><td><div className="stamp-actions">{item.hasEvidence ? <button type="button" className="link-action" onClick={() => openPdf(item)}><FileText /> PDF</button> : <span>{zh ? "无 PDF" : "No PDF"}</span>}<button type="button" className="link-action" onClick={() => edit(item)}>{zh ? "编辑" : "Edit"}</button></div></td></tr>; })}</tbody></table></div>}
    </section>
    <p className="stamp-footnote"><Download /> {zh ? "审计资料包 JSON 包含本登记簿；PDF 请从资料包的 ZIP 单独备份。盖章状态及编号由用户输入，AMS 未连接 LHDN API 验证。" : "Audit Pack JSON includes this register; export PDFs separately in the evidence ZIP. Stamping status and references are user-entered, not API-verified by HASiL."}</p>
  </div>;
}
