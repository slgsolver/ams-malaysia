export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export type CashFlowClass = "cash" | "operating" | "investing" | "financing" | "noncash";
export type TaxTreatment = "taxable" | "deductible" | "addback" | "capital" | "review" | "balance-sheet";
export type JournalStatus = "draft" | "posted" | "reversed";

export type Account = {
  code: string;
  name: string;
  type: AccountType;
  section: string;
  cashFlow: CashFlowClass;
  taxTreatment: TaxTreatment;
};

export type JournalLine = {
  accountCode: string;
  debit: number;
  credit: number;
  memo?: string;
};

export type JournalEntry = {
  id: string;
  date: string;
  reference: string;
  description: string;
  source: "opening" | "sales" | "receipt" | "bank" | "manual" | "year-end" | "reversal";
  status: JournalStatus;
  lines: JournalLine[];
  sourceReceiptId?: string;
  reversedEntryId?: string;
  createdAt: string;
};

export type AccountingReceipt = {
  id: string;
  merchant: string;
  amount: number;
  category: string;
  businessUse: number;
  taxUse: string;
  businessPurpose?: string;
  fileName?: string;
};

export const chartOfAccounts: Account[] = [
  { code: "1000", name: "Cash on Hand", type: "asset", section: "Current assets", cashFlow: "cash", taxTreatment: "balance-sheet" },
  { code: "1010", name: "Maybank Current Account", type: "asset", section: "Current assets", cashFlow: "cash", taxTreatment: "balance-sheet" },
  { code: "1100", name: "Trade Receivables", type: "asset", section: "Current assets", cashFlow: "operating", taxTreatment: "balance-sheet" },
  { code: "1200", name: "Prepayments", type: "asset", section: "Current assets", cashFlow: "operating", taxTreatment: "balance-sheet" },
  { code: "1350", name: "Director Current Account", type: "asset", section: "Current assets", cashFlow: "operating", taxTreatment: "review" },
  { code: "1500", name: "Computer Equipment at Cost", type: "asset", section: "Non-current assets", cashFlow: "investing", taxTreatment: "capital" },
  { code: "1590", name: "Accumulated Depreciation", type: "asset", section: "Non-current assets", cashFlow: "noncash", taxTreatment: "capital" },
  { code: "2000", name: "Trade Payables", type: "liability", section: "Current liabilities", cashFlow: "operating", taxTreatment: "balance-sheet" },
  { code: "2100", name: "Accrued Expenses", type: "liability", section: "Current liabilities", cashFlow: "operating", taxTreatment: "balance-sheet" },
  { code: "2200", name: "Income Tax Payable", type: "liability", section: "Current liabilities", cashFlow: "operating", taxTreatment: "balance-sheet" },
  { code: "2500", name: "Bank Loan", type: "liability", section: "Non-current liabilities", cashFlow: "financing", taxTreatment: "balance-sheet" },
  { code: "2600", name: "Amount Due to Director", type: "liability", section: "Current liabilities", cashFlow: "financing", taxTreatment: "review" },
  { code: "3000", name: "Share Capital", type: "equity", section: "Equity", cashFlow: "financing", taxTreatment: "balance-sheet" },
  { code: "3100", name: "Retained Earnings", type: "equity", section: "Equity", cashFlow: "noncash", taxTreatment: "balance-sheet" },
  { code: "4000", name: "Training Revenue", type: "income", section: "Revenue", cashFlow: "operating", taxTreatment: "taxable" },
  { code: "4100", name: "Other Operating Income", type: "income", section: "Other income", cashFlow: "operating", taxTreatment: "taxable" },
  { code: "5000", name: "Trainer and Course Costs", type: "expense", section: "Cost of sales", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6000", name: "Advertising and Marketing", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6010", name: "Petrol and Motor Expenses", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "review" },
  { code: "6020", name: "Toll and Parking", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6030", name: "Mobile and Internet", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "review" },
  { code: "6040", name: "Stationery and Printing", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6050", name: "Software and Subscriptions", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6060", name: "Office Rental", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6070", name: "Professional Fees", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6080", name: "Utilities", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6090", name: "Entertainment", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "review" },
  { code: "6100", name: "Salaries and Wages", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6110", name: "Employer EPF, SOCSO and EIS", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6200", name: "Depreciation", type: "expense", section: "Operating expenses", cashFlow: "noncash", taxTreatment: "addback" },
  { code: "6300", name: "Finance Costs", type: "expense", section: "Finance costs", cashFlow: "operating", taxTreatment: "deductible" },
  { code: "6400", name: "Income Tax Expense", type: "expense", section: "Tax", cashFlow: "operating", taxTreatment: "addback" },
  { code: "6500", name: "Non-deductible Expenses", type: "expense", section: "Operating expenses", cashFlow: "operating", taxTreatment: "addback" },
];

export const soleProprietorChartOfAccounts: Account[] = chartOfAccounts
  .filter((account) => !["2200", "2600", "6400"].includes(account.code))
  .map((account) => {
    if (account.code === "1010") return { ...account, name: "Business Bank Account" };
    if (account.code === "1350") return { ...account, name: "Owner Current Account" };
    if (account.code === "3000") return { ...account, name: "Owner Capital" };
    if (account.code === "3100") return { ...account, name: "Owner Accumulated Capital" };
    if (account.code === "4000") return { ...account, name: "Business Service Revenue" };
    return account;
  })
  .concat({ code: "3200", name: "Owner Drawings", type: "equity", section: "Owner's equity", cashFlow: "financing", taxTreatment: "balance-sheet" });

const now = "2026-08-03T08:00:00.000Z";
const line = (accountCode: string, debit = 0, credit = 0): JournalLine => ({ accountCode, debit, credit });
const seed = (id: string, date: string, reference: string, description: string, source: JournalEntry["source"], lines: JournalLine[]): JournalEntry => ({ id, date, reference, description, source, status: "posted", lines, createdAt: now });

export const seedJournalEntries: JournalEntry[] = [
  seed("j-capital", "2026-01-02", "CAP-001", "Issued ordinary share capital", "opening", [line("1010", 30000), line("3000", 0, 30000)]),
  seed("j-sales-1", "2026-07-04", "INV-260701", "July public training programmes", "sales", [line("1010", 24000), line("4000", 0, 24000)]),
  seed("j-sales-2", "2026-07-08", "INV-260708", "Corporate training programme", "sales", [line("1100", 8000), line("4000", 0, 8000)]),
  seed("j-collection", "2026-07-18", "RCPT-260718", "Part collection from corporate customer", "bank", [line("1010", 5000), line("1100", 0, 5000)]),
  seed("j-rent", "2026-07-01", "PV-260701", "July office and classroom rental", "bank", [line("6060", 4500), line("1010", 0, 4500)]),
  seed("j-payroll", "2026-07-25", "PAY-2607", "July payroll and employer contributions", "bank", [line("6100", 10000), line("6110", 1300), line("1010", 0, 11300)]),
  seed("j-laptop", "2026-07-10", "FA-26001", "Computer equipment purchased", "manual", [line("1500", 6000), line("1010", 0, 6000)]),
  seed("j-depreciation", "2026-07-31", "DEP-2607", "Monthly depreciation", "year-end", [line("6200", 1000), line("1590", 0, 1000)]),
  seed("j-loan", "2026-06-15", "LOAN-001", "Business term loan received", "bank", [line("1010", 15000), line("2500", 0, 15000)]),
  seed("j-loan-payment", "2026-07-15", "LOAN-PMT-01", "Loan principal and interest payment", "bank", [line("2500", 1000), line("6300", 200), line("1010", 0, 1200)]),
  seed("j-tax", "2026-07-31", "TAX-2607", "Current tax provision", "year-end", [line("6400", 2000), line("2200", 0, 2000)]),
  seed("j-professional", "2026-07-31", "BILL-26031", "Accounting and company secretarial fees", "manual", [line("6070", 1200), line("2000", 0, 1200)]),
  seed("j-payable-payment", "2026-08-01", "PV-260801", "Part payment to professional services supplier", "bank", [line("2000", 700), line("1010", 0, 700)]),
];

// Form B starts with an empty, balanced ledger so no example amount is mistaken
// for Sim Lip Geap's real income or expense. Uploaded receipts create drafts.
export const seedSoleProprietorJournalEntries: JournalEntry[] = [];

export const accountByCode = Object.fromEntries(chartOfAccounts.map((account) => [account.code, account])) as Record<string, Account>;
export const soleProprietorAccountByCode = Object.fromEntries(soleProprietorChartOfAccounts.map((account) => [account.code, account])) as Record<string, Account>;

function accountMap(accounts: Account[]) {
  return Object.fromEntries(accounts.map((account) => [account.code, account])) as Record<string, Account>;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function journalTotals(entry: Pick<JournalEntry, "lines">) {
  return {
    debit: roundMoney(entry.lines.reduce((sum, item) => sum + Number(item.debit || 0), 0)),
    credit: roundMoney(entry.lines.reduce((sum, item) => sum + Number(item.credit || 0), 0)),
  };
}

export function validateJournal(entry: Pick<JournalEntry, "lines">, accounts: Account[] = chartOfAccounts) {
  const totals = journalTotals(entry);
  const accountsByCode = accounts === chartOfAccounts ? accountByCode : accountMap(accounts);
  return entry.lines.length >= 2 && totals.debit > 0 && totals.debit === totals.credit && entry.lines.every((item) => Boolean(accountsByCode[item.accountCode]) && !(item.debit > 0 && item.credit > 0) && (item.debit > 0 || item.credit > 0));
}

export function postedEntries(entries: JournalEntry[]) {
  return entries.filter((entry) => entry.status === "posted");
}

export function rawAccountBalance(accountCode: string, entries: JournalEntry[]) {
  return roundMoney(postedEntries(entries).flatMap((entry) => entry.lines).filter((item) => item.accountCode === accountCode).reduce((sum, item) => sum + item.debit - item.credit, 0));
}

export function normalAccountBalance(account: Account, entries: JournalEntry[]) {
  const raw = rawAccountBalance(account.code, entries);
  return roundMoney(account.type === "asset" || account.type === "expense" ? raw : -raw);
}

export function trialBalance(entries: JournalEntry[], accounts: Account[] = chartOfAccounts) {
  return accounts.map((account) => {
    const raw = rawAccountBalance(account.code, entries);
    return { account, debit: raw > 0 ? raw : 0, credit: raw < 0 ? -raw : 0 };
  }).filter((row) => row.debit || row.credit);
}

export function profitAndLoss(entries: JournalEntry[], accounts: Account[] = chartOfAccounts) {
  const income = accounts.filter((account) => account.type === "income").map((account) => ({ account, amount: normalAccountBalance(account, entries) })).filter((row) => row.amount !== 0);
  const expenses = accounts.filter((account) => account.type === "expense").map((account) => ({ account, amount: normalAccountBalance(account, entries) })).filter((row) => row.amount !== 0);
  const revenue = roundMoney(income.reduce((sum, row) => sum + row.amount, 0));
  const totalExpenses = roundMoney(expenses.reduce((sum, row) => sum + row.amount, 0));
  const taxExpense = expenses.find((row) => row.account.code === "6400")?.amount || 0;
  return { income, expenses, revenue, totalExpenses, profitBeforeTax: roundMoney(revenue - totalExpenses + taxExpense), netProfit: roundMoney(revenue - totalExpenses) };
}

export function balanceSheet(entries: JournalEntry[], accounts: Account[] = chartOfAccounts) {
  const pnl = profitAndLoss(entries, accounts);
  const assets = accounts.filter((account) => account.type === "asset").map((account) => ({ account, amount: normalAccountBalance(account, entries) })).filter((row) => row.amount !== 0);
  const liabilities = accounts.filter((account) => account.type === "liability").map((account) => ({ account, amount: normalAccountBalance(account, entries) })).filter((row) => row.amount !== 0);
  const equity = accounts.filter((account) => account.type === "equity").map((account) => ({ account, amount: normalAccountBalance(account, entries) })).filter((row) => row.amount !== 0);
  const totalAssets = roundMoney(assets.reduce((sum, row) => sum + row.amount, 0));
  const totalLiabilities = roundMoney(liabilities.reduce((sum, row) => sum + row.amount, 0));
  const baseEquity = roundMoney(equity.reduce((sum, row) => sum + row.amount, 0));
  const totalEquity = roundMoney(baseEquity + pnl.netProfit);
  return { assets, liabilities, equity, currentYearEarnings: pnl.netProfit, totalAssets, totalLiabilities, totalEquity, balanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01 };
}

export function cashFlowStatement(entries: JournalEntry[], accounts: Account[] = chartOfAccounts) {
  const accountsByCode = accounts === chartOfAccounts ? accountByCode : accountMap(accounts);
  const posted = postedEntries(entries);
  let operating = 0;
  let investing = 0;
  let financing = 0;
  for (const entry of posted) {
    const cashMovement = roundMoney(entry.lines.filter((item) => accountsByCode[item.accountCode]?.cashFlow === "cash").reduce((sum, item) => sum + item.debit - item.credit, 0));
    if (!cashMovement) continue;
    for (const item of entry.lines.filter((lineItem) => accountsByCode[lineItem.accountCode]?.cashFlow !== "cash")) {
      const cashEffect = roundMoney(item.credit - item.debit);
      const classification = accountsByCode[item.accountCode]?.cashFlow;
      if (classification === "investing") investing += cashEffect;
      else if (classification === "financing") financing += cashEffect;
      else operating += cashEffect;
    }
  }
  operating = roundMoney(operating);
  investing = roundMoney(investing);
  financing = roundMoney(financing);
  const pnl = profitAndLoss(entries, accounts);
  const depreciationAccount = accountsByCode["6200"];
  const depreciation = depreciationAccount ? normalAccountBalance(depreciationAccount, entries) : 0;
  const taxPaid = roundMoney(posted.filter((entry) => entry.lines.some((item) => item.accountCode === "2200" && item.debit > 0)).flatMap((entry) => entry.lines).filter((item) => accountsByCode[item.accountCode]?.cashFlow === "cash").reduce((sum, item) => sum + item.credit - item.debit, 0));
  const otherOperatingAdjustments = roundMoney(operating - pnl.profitBeforeTax - depreciation + taxPaid);
  const netChange = roundMoney(operating + investing + financing);
  const endingCash = roundMoney(accounts.filter((account) => account.cashFlow === "cash").reduce((sum, account) => sum + normalAccountBalance(account, entries), 0));
  return { profitBeforeTax: pnl.profitBeforeTax, depreciation, otherOperatingAdjustments, taxPaid, operating, investing, financing, netChange, openingCash: roundMoney(endingCash - netChange), endingCash, reconciled: Math.abs(netChange - endingCash) < 0.01 };
}

const receiptExpenseAccount: Record<string, string> = {
  "Advertising & Marketing": "6000",
  Petrol: "6010",
  "Toll Fee": "6020",
  Mobile: "6030",
  Stationery: "6040",
  "Software & Subscriptions": "6050",
  "Office Rent": "6060",
  "Professional Fees": "6070",
  Utilities: "6080",
  Entertainment: "6090",
  "Food & Beverage": "6090",
  Others: "6500",
};

export function createReceiptJournal(receipt: AccountingReceipt, options: { privateAccountCode?: string } = {}): JournalEntry {
  const businessAmount = roundMoney(receipt.taxUse === "Business" ? receipt.amount * Math.max(0, Math.min(100, receipt.businessUse)) / 100 : 0);
  const privateAmount = roundMoney(receipt.amount - businessAmount);
  const lines: JournalLine[] = [];
  if (businessAmount) lines.push(line(receiptExpenseAccount[receipt.category] || "6500", businessAmount));
  if (privateAmount) lines.push(line(options.privateAccountCode || "1350", privateAmount));
  lines.push(line("1010", 0, receipt.amount));
  return {
    id: `receipt-${receipt.id}`,
    date: "2026-08-03",
    reference: `RCP-${receipt.id.slice(0, 8).toUpperCase()}`,
    description: `${receipt.merchant}${receipt.businessPurpose ? ` — ${receipt.businessPurpose}` : ""}`,
    source: "receipt",
    status: "draft",
    lines,
    sourceReceiptId: receipt.id,
    createdAt: new Date().toISOString(),
  };
}

export function taxComputation(entries: JournalEntry[], accounts: Account[] = chartOfAccounts) {
  const accountsByCode = accounts === chartOfAccounts ? accountByCode : accountMap(accounts);
  const pnl = profitAndLoss(entries, accounts);
  const addbacks = accounts.filter((account) => account.type === "expense" && (account.taxTreatment === "addback" || account.taxTreatment === "review") && account.code !== "6400").map((account) => ({ account, amount: Math.max(0, normalAccountBalance(account, entries)) })).filter((row) => row.amount > 0);
  const totalAddbacks = roundMoney(addbacks.reduce((sum, row) => sum + row.amount, 0));
  const fixedAssetCost = accountsByCode["1500"] ? Math.max(0, normalAccountBalance(accountsByCode["1500"], entries)) : 0;
  const provisionalCapitalAllowance = roundMoney(fixedAssetCost * 0.2);
  const adjustedIncome = roundMoney(pnl.profitBeforeTax + totalAddbacks);
  const statutoryIncome = roundMoney(Math.max(0, adjustedIncome - provisionalCapitalAllowance));
  return { ...pnl, addbacks, totalAddbacks, fixedAssetCost, provisionalCapitalAllowance, adjustedIncome, statutoryIncome };
}

export function reverseJournal(entry: JournalEntry): JournalEntry {
  return {
    id: `reverse-${entry.id}-${Date.now()}`,
    date: "2026-08-03",
    reference: `REV-${entry.reference}`,
    description: `Reversal — ${entry.description}`,
    source: "reversal",
    status: "posted",
    lines: entry.lines.map((item) => ({ ...item, debit: item.credit, credit: item.debit })),
    reversedEntryId: entry.id,
    createdAt: new Date().toISOString(),
  };
}
