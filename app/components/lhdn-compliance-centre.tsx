"use client";

import {
  AlertCircle,
  Archive,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  ClipboardCheck,
  FileCheck2,
  Landmark,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  assessMyInvois,
  calculateCompanyDeadlines,
  getComplianceProfile,
  LHDN_MITRS_PAGE_UPDATED,
  LHDN_RULES_AS_OF,
  LHDN_SOURCES,
  MYINVOIS_TIMELINE_UPDATED,
  type LhdnEntity,
  type MyInvoisAssessmentCode,
} from "../lib/lhdn-compliance";

type Language = "en" | "zh";

type Props = {
  entity: LhdnEntity;
  language: Language;
  filingPercent: number;
  receiptCount: number;
  evidenceCount: number;
  reviewCount: number;
};

const forms = { personal: "BE", business: "B", company: "C" } as const;

const entityNames = {
  en: {
    personal: "Sim Lip Geap · Personal",
    business: "Sim Lip Geap · Sole proprietor",
    company: "Solver Academy Sdn. Bhd.",
  },
  zh: {
    personal: "Sim Lip Geap · 个人",
    business: "Sim Lip Geap · 独资生意",
    company: "Solver Academy 私人有限公司",
  },
} as const;

const statusCopy = {
  en: { required: "Applies", "not-currently-required": "Not listed for YA 2026", review: "Check applicability" },
  zh: { required: "适用", "not-currently-required": "YA 2026 目前未列入", review: "需要核实" },
} as const;

const assessmentCopy: Record<Language, Record<MyInvoisAssessmentCode, { title: string; detail: string; tone: string }>> = {
  en: {
    "turnover-needed": { title: "Enter annual turnover", detail: "AMS needs turnover before showing the current implementation band.", tone: "review" },
    "related-entity-review": { title: "Manual eligibility review required", detail: "Do not rely on the small-business exemption until related-company and group conditions are checked.", tone: "review" },
    "potential-exemption": { title: "Potential exemption — verify first", detail: "Turnover below RM3 million may be exempt under the current timeline, subject to the full eligibility and related-entity conditions.", tone: "conditional" },
    "required-2026": { title: "Current timeline points to 1 Jan 2026", detail: "The RM3 million to RM5 million band is within the current e-Invoice implementation timeline.", tone: "required" },
    "required-2025-july": { title: "Current timeline points to 1 Jul 2025", detail: "This turnover is above RM5 million and up to RM25 million.", tone: "required" },
    "required-2025-january": { title: "Current timeline points to 1 Jan 2025", detail: "This turnover is above RM25 million and up to RM100 million.", tone: "required" },
    "required-2024": { title: "Current timeline points to 1 Aug 2024", detail: "This turnover is above RM100 million.", tone: "required" },
  },
  zh: {
    "turnover-needed": { title: "请输入全年营业额", detail: "AMS 需要营业额，才能显示目前适用的电子发票阶段。", tone: "review" },
    "related-entity-review": { title: "需要人工核实资格", detail: "在检查关联公司及集团条件前，请勿直接采用小企业豁免。", tone: "review" },
    "potential-exemption": { title: "可能豁免——必须先核实", detail: "按现行时间表，营业额少于 RM3 百万可能获豁免，但仍须符合完整资格及关联实体条件。", tone: "conditional" },
    "required-2026": { title: "现行时间表指向 2026年1月1日", detail: "RM3 百万至 RM5 百万属于目前电子发票推行范围。", tone: "required" },
    "required-2025-july": { title: "现行时间表指向 2025年7月1日", detail: "营业额超过 RM5 百万并不超过 RM25 百万。", tone: "required" },
    "required-2025-january": { title: "现行时间表指向 2025年1月1日", detail: "营业额超过 RM25 百万并不超过 RM100 百万。", tone: "required" },
    "required-2024": { title: "现行时间表指向 2024年8月1日", detail: "营业额超过 RM100 百万。", tone: "required" },
  },
};

function displayDate(value: string, language: Language) {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(language === "zh" ? "zh-MY" : "en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function LhdnComplianceCentre({ entity, language, filingPercent, receiptCount, evidenceCount, reviewCount }: Props) {
  const zh = language === "zh";
  const [turnoverInput, setTurnoverInput] = useState("");
  const [hasRelatedEntity, setHasRelatedEntity] = useState(false);
  const [accountingClose, setAccountingClose] = useState("");
  const turnover = turnoverInput.trim() === "" ? null : Number(turnoverInput);
  const assessmentCode = assessMyInvois(turnover, hasRelatedEntity);
  const assessment = assessmentCopy[language][assessmentCode];
  const deadlines = useMemo(() => calculateCompanyDeadlines(accountingClose), [accountingClose]);
  const rules = getComplianceProfile(entity);
  const evidenceRate = receiptCount ? Math.round(evidenceCount / receiptCount * 100) : 0;

  const ruleContent = {
    return: {
      icon: ClipboardCheck,
      title: zh ? `Borang ${forms[entity]} 申报` : `Borang ${forms[entity]} return`,
      detail: entity === "company"
        ? (zh ? "Form C 须在会计期结束后七个月内提交；即使亏损，通常仍须申报。" : "Form C is due within seven months after the accounting period closes; a loss position does not normally remove the filing duty.")
        : entity === "business"
          ? (zh ? "有生意收入的居民个人使用 Form B。系统会保留 P&L、Balance Sheet、Cash Flow 和税务调整底稿。" : "A resident individual with business income uses Form B. AMS keeps the P&L, Balance Sheet, Cash Flow and tax-adjustment working papers.")
          : (zh ? "没有生意收入的居民个人使用 Form BE；先确认没有独资生意收入才可选择。" : "A resident individual without business income uses Form BE; confirm there is no sole-proprietor income before choosing it."),
    },
    mitrs: {
      icon: FileCheck2,
      title: "MITRS · Section 82B",
      detail: entity === "company"
        ? (zh ? "YA 2026 公司须在 Form C 法定截止日后30天内提交指定文件。PDF 每份不超过20MB，并须使用马来文或英文。" : "For YA 2026, a company must submit the specified documents within 30 days after the statutory Form C due date. Each PDF must be no more than 20MB and in Malay or English.")
        : (zh ? "HASiL 的 YA 2026 公布类别没有列出普通 Form B 或 Form BE 个人。AMS 不会误标为必须提交，但每年仍要复核。" : "The published YA 2026 categories do not list ordinary Form B or Form BE individuals. AMS will not mark MITRS as mandatory, but the position must be rechecked each year."),
    },
    records: {
      icon: Archive,
      title: zh ? "保存记录七年" : "Keep records for seven years",
      detail: zh ? "保留总账、发票、收据、银行记录、计算底稿和申报证明。仅保存在浏览器不算可靠备份。" : "Retain ledgers, invoices, receipts, bank records, working papers and filing proof. Browser-only storage is not a reliable backup.",
    },
    "tax-estimate": {
      icon: CalendarClock,
      title: entity === "company" ? "CP204 / CP204A" : (entity === "business" ? "CP500 / tax payments" : "PCB / tax payments"),
      detail: entity === "company"
        ? (zh ? "现有公司一般须在基准期开始前至少30天提交 CP204；新公司和分期付款另有开始月份规则。" : "An existing company generally files CP204 at least 30 days before the basis period starts; new companies and instalments have separate commencement rules.")
        : entity === "business"
          ? (zh ? "记录 CP500、PCB、zakat 及其他抵税付款，并与最终 Form B 税额核对。" : "Track CP500, PCB, zakat and other tax payments, then reconcile them to the final Form B liability.")
          : (zh ? "记录 PCB、zakat 及其他抵税付款，并与 EA/EC 及 Form BE 核对。" : "Track PCB, zakat and other tax payments, then reconcile them to the EA/EC and Form BE."),
    },
  } as const;

  return <div className="content compliance-page">
    <section className="compliance-hero">
      <div>
        <span className="pill"><ShieldCheck /> {zh ? "马来西亚税务合规" : "Malaysia tax compliance"}</span>
        <h2>{zh ? "LHDN 合规中心" : "LHDN Compliance Centre"}</h2>
        <p>{zh ? `${entityNames.zh[entity]} · Form ${forms[entity]}。只显示这个纳税人的适用规则、准备情况和官方来源。` : `${entityNames.en[entity]} · Form ${forms[entity]}. Only this taxpayer’s applicable rules, preparation status and official sources are shown.`}</p>
        <div className="compliance-hero-badges"><span><BadgeCheck /> {zh ? `规则核对至 ${LHDN_RULES_AS_OF}` : `Rules checked ${LHDN_RULES_AS_OF}`}</span><span><Landmark /> {zh ? "只采用 HASiL 官方来源" : "Official HASiL sources only"}</span></div>
      </div>
      <div className="compliance-score" aria-label={zh ? `报税资料完成 ${filingPercent}%` : `${filingPercent}% filing information ready`}>
        <span>{zh ? "报税资料" : "Filing information"}</span>
        <strong>{filingPercent}%</strong>
        <small>{zh ? "已标记完成" : "marked ready"}</small>
      </div>
    </section>

    <section className="compliance-alert"><AlertCircle /><div><strong>{zh ? "AMS 是准备工具，不会代替正式申报" : "AMS prepares records; it does not file the return"}</strong><p>{zh ? "税务年度、扣税资格、税率及豁免可能改变。提交前请以该年度 HASiL 表格和持牌税务代理的确认作为最终依据。" : "Tax-year rules, deductibility, rates and exemptions can change. Use the relevant annual HASiL form and a licensed tax agent’s confirmation before submission."}</p></div></section>

    <section className="compliance-overview" aria-label={zh ? "合规摘要" : "Compliance summary"}>
      <article><span className="mini-icon blue"><ReceiptText /></span><div><small>{zh ? "本账户单据" : "Account receipts"}</small><strong>{receiptCount}</strong><p>{evidenceRate}% {zh ? "有 PDF 证明" : "have PDF evidence"}</p></div></article>
      <article><span className="mini-icon green"><Check /></span><div><small>{zh ? "可点击的证明" : "Clickable evidence"}</small><strong>{evidenceCount}</strong><p>{zh ? "可直接查看原单" : "source documents available"}</p></div></article>
      <article className={reviewCount ? "needs-attention" : ""}><span className="mini-icon yellow"><AlertCircle /></span><div><small>{zh ? "等待人工审核" : "Manual review"}</small><strong>{reviewCount}</strong><p>{zh ? "不可自动扣税" : "not auto-deductible"}</p></div></article>
      <article><span className="mini-icon violet"><Archive /></span><div><small>{zh ? "保存规定" : "Retention rule"}</small><strong>{zh ? "7年" : "7 years"}</strong><p>{zh ? "须另存安全备份" : "secure backup required"}</p></div></article>
    </section>

    <div className="compliance-section-head"><div><span>{zh ? "适用条款" : "APPLICABLE RULES"}</span><h3>{zh ? `Form ${forms[entity]} 需要注意什么` : `What Form ${forms[entity]} needs`}</h3></div><p>{zh ? "每项规则都有 HASiL 官方来源。" : "Every rule links to its official HASiL source."}</p></div>
    <section className="compliance-rule-grid">
      {rules.map((rule) => {
        const content = ruleContent[rule.id];
        const Icon = content.icon;
        const source = LHDN_SOURCES[rule.sourceKey];
        return <article className="compliance-rule-card" key={rule.id}>
          <div className="compliance-rule-top"><span className="compliance-rule-icon"><Icon /></span><span className={`compliance-status ${rule.status}`}>{rule.status === "required" ? <Check /> : <AlertCircle />}{statusCopy[language][rule.status]}</span></div>
          <h4>{content.title}</h4>
          <p>{content.detail}</p>
          <a href={source.url} target="_blank" rel="noreferrer">{zh ? "查看 HASiL 官方来源" : "Open official HASiL source"}<ArrowUpRight /></a>
        </article>;
      })}
    </section>

    <section className="compliance-tools-grid">
      <article className="panel compliance-tool">
        <div className="compliance-tool-head"><span className="mini-icon blue"><Building2 /></span><div><span>{zh ? "电子发票" : "E-INVOICE"}</span><h3>{zh ? "MyInvois 适用性检查" : "MyInvois applicability check"}</h3></div></div>
        <p className="compliance-tool-intro">{zh ? "这是初步筛查；关联公司、新业务和特殊情况仍须按完整指南复核。" : "This is a preliminary screen. Related companies, new businesses and special cases still need a full-guideline review."}</p>
        {entity === "personal" ? <div className="personal-einvoice-note"><ShieldCheck /><div><strong>{zh ? "Form BE 个人账户不作电子发票营业额判断" : "No e-Invoice turnover test in the Form BE personal workspace"}</strong><p>{zh ? "Form BE 适用于没有生意收入的居民个人。如果开始经营生意，请切换到 Form B 账户，再检查 MyInvois 责任。" : "Form BE is for a resident individual without business income. If a business starts, switch to the Form B workspace before assessing MyInvois duties."}</p></div></div> : <>
          <div className="compliance-form-row">
            <label>{zh ? "全年营业额 / 收入（RM）" : "Annual turnover / revenue (RM)"}<input type="number" min="0" step="1000" inputMode="decimal" value={turnoverInput} onChange={(event) => setTurnoverInput(event.target.value)} placeholder="e.g. 1500000" /></label>
            <label className="compliance-checkbox"><input type="checkbox" checked={hasRelatedEntity} onChange={(event) => setHasRelatedEntity(event.target.checked)} /><span><b>{zh ? "有相关／关联实体" : "Has related / associated entity"}</b><small>{zh ? "例如共同控制的公司或集团" : "For example, common control or a group"}</small></span></label>
          </div>
          <div className={`myinvois-result ${assessment.tone}`}><span>{assessment.tone === "required" ? <Check /> : <AlertCircle />}</span><div><strong>{assessment.title}</strong><p>{assessment.detail}</p></div></div>
        </>}
        <div className="compliance-tool-source"><span>{zh ? `时间表更新：${MYINVOIS_TIMELINE_UPDATED}` : `Timeline updated ${MYINVOIS_TIMELINE_UPDATED}`}</span><div><a href={LHDN_SOURCES.eInvoiceTimeline.url} target="_blank" rel="noreferrer">{zh ? "时间表" : "Timeline"} <ArrowUpRight /></a><a href={LHDN_SOURCES.eInvoiceFaq.url} target="_blank" rel="noreferrer">FAQ <ArrowUpRight /></a></div></div>
      </article>

      <article className="panel compliance-tool">
        <div className="compliance-tool-head"><span className="mini-icon green"><CalendarClock /></span><div><span>{zh ? "截止日期" : "DEADLINES"}</span><h3>{entity === "company" ? (zh ? "Form C 与 MITRS 计算" : "Form C and MITRS calculator") : (zh ? "年度申报提醒" : "Annual filing reminder")}</h3></div></div>
        {entity === "company" ? <>
          <p className="compliance-tool-intro">{zh ? "输入实际会计期结束日；AMS 会按七个月及其后30天计算准备日期。" : "Enter the actual accounting close. AMS calculates seven months and the following 30-day MITRS period."}</p>
          <label className="compliance-date-label">{zh ? "会计期结束日" : "Accounting period close"}<input type="date" value={accountingClose} onChange={(event) => setAccountingClose(event.target.value)} /></label>
          <div className="deadline-list">
            <div><span>Form C</span><strong>{deadlines ? displayDate(deadlines.formCDue, language) : (zh ? "请选择日期" : "Select a date")}</strong><small>{zh ? "会计期结束后七个月" : "Seven months after close"}</small></div>
            <div><span>MITRS</span><strong>{deadlines ? displayDate(deadlines.mitrsDue, language) : (zh ? "请选择日期" : "Select a date")}</strong><small>{zh ? "Form C 法定截止日后30天" : "30 days after statutory Form C due date"}</small></div>
          </div>
          <p className="mitrs-note"><FileCheck2 /> {zh ? "资料包：财务报表、所得税计算、资本津贴表（如适用）、税务优惠计算（如适用）。" : "Pack: financial statements, income-tax computation, capital-allowance schedule (if applicable), and incentive computation (if applicable)."}</p>
        </> : <>
          <p className="compliance-tool-intro">{zh ? "Form B 和 Form BE 的实际电子报税日期须跟随每年 HASiL Filing Programme。AMS 不会把旧年度日期当成 YA 2026 截止日。" : "Actual Form B and Form BE e-filing dates follow each year’s HASiL Filing Programme. AMS will not reuse an older year’s date as the YA 2026 deadline."}</p>
          <div className="annual-programme"><CalendarClock /><div><strong>{zh ? "等待 YA 2026 官方 Filing Programme" : "Await the official YA 2026 Filing Programme"}</strong><p>{zh ? "发布后再锁定日期，并保留提交确认单。" : "Lock the date only after publication, then retain the submission acknowledgement."}</p></div></div>
        </>}
        <div className="compliance-tool-source"><span>{zh ? `MITRS 页面更新：${LHDN_MITRS_PAGE_UPDATED}` : `MITRS page updated ${LHDN_MITRS_PAGE_UPDATED}`}</span><a href={LHDN_SOURCES.mitrs2026.url} target="_blank" rel="noreferrer">HASiL <ArrowUpRight /></a></div>
      </article>
    </section>

    <section className="panel compliance-sources">
      <div><span className="mini-icon green"><Landmark /></span><div><h3>{zh ? "本页使用的官方资料" : "Official references used on this page"}</h3><p>{zh ? "规则只来自 Lembaga Hasil Dalam Negeri Malaysia（HASiL）。" : "Rules are sourced only from Lembaga Hasil Dalam Negeri Malaysia (HASiL)."}</p></div></div>
      <div className="compliance-source-links">{Object.values(LHDN_SOURCES).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight /></a>)}</div>
    </section>
  </div>;
}
