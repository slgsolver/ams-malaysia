import assert from "node:assert/strict";
import test from "node:test";

import {
  balanceSheet,
  cashFlowStatement,
  createReceiptJournal,
  journalTotals,
  profitAndLoss,
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
