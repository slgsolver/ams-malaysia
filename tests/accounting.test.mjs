import assert from "node:assert/strict";
import test from "node:test";

import {
  balanceSheet,
  cashFlowStatement,
  createReceiptJournal,
  journalTotals,
  profitAndLoss,
  roundMoney,
  sanitizeJournalEntries,
  reverseJournal,
  seedJournalEntries,
  seedSoleProprietorJournalEntries,
  soleProprietorChartOfAccounts,
  taxComputation,
  trialBalance,
  validateJournal,
} from "../app/lib/accounting.ts";

test("seed company ledger is balanced across all three financial statements", () => {
  assert.ok(seedJournalEntries.every((entry) => validateJournal(entry)));
  const trial = trialBalance(seedJournalEntries);
  assert.equal(trial.reduce((sum, row) => sum + row.debit, 0), trial.reduce((sum, row) => sum + row.credit, 0));

  const pnl = profitAndLoss(seedJournalEntries);
  const balance = balanceSheet(seedJournalEntries);
  const cashFlow = cashFlowStatement(seedJournalEntries);
  assert.equal(pnl.netProfit, 11800);
  assert.equal(balance.totalAssets, balance.totalLiabilities + balance.totalEquity);
  assert.equal(balance.currentYearEarnings, pnl.netProfit);
  assert.equal(cashFlow.endingCash, balance.assets.find((row) => row.account.code === "1010")?.amount);
  assert.ok(balance.balanced);
  assert.ok(cashFlow.reconciled);
});

test("mixed-use receipt creates a balanced draft with director current account", () => {
  const entry = createReceiptJournal({
    id: "mixed-1",
    merchant: "Maxis Berhad",
    amount: 100,
    category: "Mobile",
    businessUse: 70,
    taxUse: "Business",
    businessPurpose: "Shared director mobile plan",
  });
  assert.equal(entry.status, "draft");
  assert.equal(entry.lines.find((line) => line.accountCode === "6030")?.debit, 70);
  assert.equal(entry.lines.find((line) => line.accountCode === "1350")?.debit, 30);
  assert.deepEqual(journalTotals(entry), { debit: 100, credit: 100 });
  assert.ok(validateJournal(entry));
});

test("Form B ledger uses owner drawings and keeps all three reports balanced", () => {
  assert.deepEqual(seedSoleProprietorJournalEntries, []);
  const draft = createReceiptJournal({
    id: "form-b-mixed-1",
    merchant: "Maxis Berhad",
    amount: 100,
    category: "Mobile",
    businessUse: 70,
    taxUse: "Business",
    businessPurpose: "Sole proprietor mobile plan",
  }, { privateAccountCode: "3200" });
  assert.equal(draft.lines.find((line) => line.accountCode === "6030")?.debit, 70);
  assert.equal(draft.lines.find((line) => line.accountCode === "3200")?.debit, 30);
  assert.equal(draft.lines.some((line) => line.accountCode === "1350"), false);
  assert.ok(validateJournal(draft, soleProprietorChartOfAccounts));

  const posted = [{ ...draft, status: "posted" }];
  const pnl = profitAndLoss(posted, soleProprietorChartOfAccounts);
  const balance = balanceSheet(posted, soleProprietorChartOfAccounts);
  const cashFlow = cashFlowStatement(posted, soleProprietorChartOfAccounts);
  assert.equal(pnl.totalExpenses, 70);
  assert.ok(balance.balanced);
  assert.equal(cashFlow.operating, -70);
  assert.equal(cashFlow.financing, -30);
  assert.equal(cashFlow.endingCash, -100);
  assert.ok(cashFlow.reconciled);
});

test("reversal keeps the original audit trail and neutralises its balances", () => {
  const original = seedJournalEntries[0];
  const reversal = reverseJournal(original);
  const totals = journalTotals(reversal);
  assert.equal(reversal.reversedEntryId, original.id);
  assert.equal(totals.debit, totals.credit);
  const trial = trialBalance([original, reversal]);
  assert.equal(trial.length, 0);
});

test("Form C working paper separates accounting depreciation and capital allowance", () => {
  const tax = taxComputation(seedJournalEntries);
  assert.equal(tax.profitBeforeTax, 13800);
  assert.ok(tax.addbacks.some((row) => row.account.code === "6200"));
  assert.equal(tax.fixedAssetCost, 6000);
  assert.equal(tax.provisionalCapitalAllowance, 1200);
  assert.equal(tax.statutoryIncome, 13600);
});

test("cash flow reconciles a genuine brought-forward cash balance", () => {
  const entries = [
    { id: "opening-cash", date: "2025-12-31", reference: "OB-001", description: "Cash brought forward", source: "opening", status: "posted", createdAt: "2026-01-01T00:00:00.000Z", lines: [{ accountCode: "1010", debit: 500, credit: 0 }, { accountCode: "3000", debit: 0, credit: 500 }] },
    { id: "current-sale", date: "2026-01-10", reference: "INV-001", description: "Cash sale", source: "sales", status: "posted", createdAt: "2026-01-10T00:00:00.000Z", lines: [{ accountCode: "1010", debit: 100, credit: 0 }, { accountCode: "4000", debit: 0, credit: 100 }] },
  ];
  const cashFlow = cashFlowStatement(entries);
  assert.equal(cashFlow.openingCash, 500);
  assert.equal(cashFlow.operating, 100);
  assert.equal(cashFlow.endingCash, 600);
  assert.ok(cashFlow.reconciled);
});

test("journal validation rejects non-finite, negative and double-sided lines", () => {
  assert.equal(validateJournal({ lines: [{ accountCode: "1010", debit: Infinity, credit: 0 }, { accountCode: "3000", debit: 0, credit: Infinity }] }), false);
  assert.equal(validateJournal({ lines: [{ accountCode: "1010", debit: 100, credit: 1 }, { accountCode: "3000", debit: 0, credit: 99 }] }), false);
  assert.equal(validateJournal({ lines: [{ accountCode: "1010", debit: 100, credit: 0 }, { accountCode: "3000", debit: -1, credit: 100 }] }), false);
  assert.equal(roundMoney(-1.005), -1.01);
});

test("browser journal hydration discards corrupt and duplicate records", () => {
  const valid = seedJournalEntries[0];
  const hydrated = sanitizeJournalEntries([valid, valid, { ...valid, id: "bad", lines: [{ accountCode: "1010", debit: Infinity, credit: 0 }, { accountCode: "3000", debit: 0, credit: Infinity }] }]);
  assert.deepEqual(hydrated, [valid]);
});

test("receipt journal uses the receipt date and rejects zero-value records", () => {
  const journal = createReceiptJournal({ id: "dated", merchant: "POPULAR", date: "28 Jul 2026", amount: 10, category: "Stationery", businessUse: 100, taxUse: "Business", businessPurpose: "Office paper" });
  assert.equal(journal.date, "2026-07-28");
  assert.throws(() => createReceiptJournal({ id: "zero", merchant: "Invalid", amount: 0, category: "Others", businessUse: 0, taxUse: "Review" }), /positive finite/);
});

test("receipt journal respects bank, cash, payable or owner/director payment source", () => {
  const payable = createReceiptJournal({ id: "unpaid", merchant: "Office Mart", date: "2026-08-02", amount: 45.5, category: "Stationery", businessUse: 100, taxUse: "Business", businessPurpose: "Office supplies", paymentAccountCode: "2000" });
  assert.equal(payable.lines.find((line) => line.accountCode === "2000")?.credit, 45.5);
  assert.equal(payable.lines.some((line) => line.accountCode === "1010"), false);
  assert.ok(validateJournal(payable));
});

test("review accounts are flagged but are not automatically added back", () => {
  const entry = createReceiptJournal({ id: "petrol", merchant: "PETRONAS", date: "2026-07-28", amount: 100, category: "Petrol", businessUse: 100, taxUse: "Business", businessPurpose: "Client visit" }, { privateAccountCode: "3200" });
  const report = taxComputation([{ ...entry, status: "posted" }], soleProprietorChartOfAccounts);
  assert.equal(report.profitBeforeTax, -100);
  assert.equal(report.totalAddbacks, 0);
  assert.equal(report.totalReview, 100);
  assert.equal(report.adjustedIncome, -100);
});
