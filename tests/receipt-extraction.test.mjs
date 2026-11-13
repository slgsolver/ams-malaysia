import assert from "node:assert/strict";
import test from "node:test";

import { extractReceiptAmount, extractReceiptDate, extractReceiptMerchant, latestReceiptDate } from "../app/lib/receipt-extraction.ts";

const now = new Date("2026-11-13T08:00:00Z");

test("receipt date ignores an OCR future year and uses the later valid print date", () => {
  assert.equal(extractReceiptDate("Date 11/11/2028\nPRINT 11/11/2026", now), "2026-11-11");
});

test("receipt date rejects impossible calendar dates and accepts two-digit years", () => {
  assert.equal(extractReceiptDate("Date 2026-10-37", now), "");
  assert.equal(extractReceiptDate("Close at 04/11/26 09:11", now), "2026-11-04");
});

test("fuzzy grand total wins over a larger tendered amount", () => {
  assert.equal(extractReceiptAmount("Grand Totel (RM): 148.00\nTendered 150.00\nChange 2.00"), 148);
});

test("explicit total amount wins over a later tax-summary total", () => {
  assert.equal(extractReceiptAmount("TOTAL AMT (RM) 31.90\nTotal 30.10 1.81"), 31.9);
});

test("merchant scoring prefers a business name over OCR header noise", () => {
  assert.equal(extractReceiptMerchant("Bupha init (77\nSAMPS KITCHEN SDN. BHD.\nINVOICE", "Receipt"), "SAMPS KITCHEN SDN. BHD.");
});

test("category summary shows the chronologically latest receipt date", () => {
  assert.equal(latestReceiptDate(["03 Nov 2026", "31 Oct 2026", "11 Nov 2026"]), "11 Nov 2026");
});
