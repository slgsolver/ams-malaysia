# AMS Malaysia

AMS Malaysia is a bilingual receipt, accounting and Malaysian tax-preparation workspace for:

- Sim Lip Geap — individual records and Borang BE preparation
- Sim Lip Geap — separate sole proprietor records and Borang B preparation
- Solver Academy Sdn. Bhd. — MPERS double-entry accounts and Borang C preparation

## Company accounting

The Sdn. Bhd. workspace contains a Malaysian service-company Chart of Accounts, balanced journals, period locking, reversals, Trial Balance, Profit & Loss, Balance Sheet, indirect-method Cash Flow, tax adjustments, capital-allowance working papers, CP204 reminders and a MITRS checklist.

Uploaded company receipts create draft journals. They do not affect the financial statements until a user confirms and posts the balanced entry. Posted journals are corrected through a reversal so the audit trail remains visible.

## Stamp duty working papers

Each account has a separate instrument register. The calculator uses HASiL's [First Schedule guide dated 30 June 2026](https://www.hasil.gov.my/wp-content/uploads/garis-panduan-pengenaan-duti-setem-jadual-pertama-as-1949.pdf) for straightforward leases without a premium (item 49(a)), unlisted share transfers (item 32(b)), property transfers (item 32(a)/(aa)/(ab)), and a *conditional* general-stamping RM10 indication. Business transfers, other rights transfers, security/financing documents, leases with a premium and pre-2026 instruments require manual review. The user must choose the document's legal category; a filename or document title is not enough to establish chargeability. Exemptions, remissions and official assessments are never assumed.

The register tracks execution date, indicative 30-day stamping deadline, MyTax submission, actual duty paid and certificate reference. It follows HASiL's [STSDS phase and seven-year retention guidance](https://www.hasil.gov.my/duti-setem/sistem-taksir-sendiri-duti-setem-stsds/) and [stamping timeframe guidance](https://www.hasil.gov.my/duti-setem/penalti-duti-setem/). It does not submit to MyTax, verify a certificate, automatically post accounting entries or turn stamp duty into an income-tax deduction. Instrument PDFs are browser-local; the Audit Pack JSON and evidence ZIP should be exported for secure backup.

## Tax-safety boundary

AMS organises records and produces reviewable working papers. It does not submit MyTax/MyInvois returns and does not replace a licensed Malaysian tax agent. Unreleased YA rules, corporate-rate eligibility, incentives, restricted expenses and capital-allowance classes must be confirmed against current HASiL guidance.

## Development

```bash
npm install
npm run dev
npm run lint
npm test
```

The production site is deployed through the repository's Vercel Git integration.
