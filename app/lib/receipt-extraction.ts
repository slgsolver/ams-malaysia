function validPastOrPresentDate(year: number, month: number, day: number, now: Date) {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return "";
  // A receipt cannot genuinely be issued in the future. The small allowance
  // prevents a timezone boundary from rejecting a receipt issued today.
  if (parsed.getTime() > now.getTime() + 36 * 60 * 60 * 1000) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function extractReceiptDate(text: string, now = new Date()) {
  const candidates: Array<{ index: number; value: string }> = [];
  for (const match of text.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    const value = validPastOrPresentDate(Number(match[1]), Number(match[2]), Number(match[3]), now);
    if (value) candidates.push({ index: match.index, value });
  }
  for (const match of text.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|20\d{2})\b/g)) {
    const rawYear = Number(match[3]);
    const year = match[3].length === 2 ? 2000 + rawYear : rawYear;
    const value = validPastOrPresentDate(year, Number(match[2]), Number(match[1]), now);
    if (value) candidates.push({ index: match.index, value });
  }
  return candidates.sort((left, right) => left.index - right.index)[0]?.value || "";
}

export function validateReceiptDraft(value: { merchant?: unknown; date?: unknown; amount?: unknown }, now = new Date()) {
  const merchantValid = typeof value.merchant === "string" && value.merchant.trim().length > 0;
  const amount = Number(value.amount);
  const amountValid = Number.isFinite(amount) && amount > 0 && amount <= 999_999_999.99;
  const dateText = typeof value.date === "string" ? value.date.trim() : "";
  const dateValue = dateText ? new Date(dateText) : null;
  const dateValid = Boolean(dateValue && Number.isFinite(dateValue.getTime()) && dateValue.getTime() <= now.getTime() + 36 * 60 * 60 * 1000);
  const dateLooksUnusual = Boolean(dateValid && dateValue && dateValue.getFullYear() < now.getFullYear() - 7);
  const blockingFields = [!merchantValid ? "merchant" : "", !amountValid ? "amount" : ""].filter(Boolean);
  return {
    merchantValid,
    amountValid,
    dateValid,
    dateLooksUnusual,
    dateNeedsReview: !dateValid || dateLooksUnusual,
    blockingFields,
    blocking: blockingFields.length > 0,
  };
}

function monetaryValues(line: string) {
  return [...line.matchAll(/(?:RM|MYR\s*)?(\d{1,6}(?:[.,]\d{2})?)/gi)]
    .filter((match) => /RM|MYR/i.test(match[0]) || /[.,]\d{2}$/.test(match[1]))
    .map((match) => Number(match[1].replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function extractReceiptAmount(text: string) {
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const preferredTotal = /\b(grand\s+tot[ae]l|net\s+tot[ae]l|final\s+amount|total\s+(?:amount|amt)|amount\s+(?:paid|due)|tot[ae]l\s*\((?:rm|myr)|jumlah\s+besar)\b/i;
  const ordinaryTotal = /\b(total\s+paid|amount\s+paid|tot[ae]l|jumlah|bayaran)\b/i;

  for (const pattern of [preferredTotal, ordinaryTotal]) {
    for (const line of lines) {
      if (!pattern.test(line) || /sub.?tot[ae]l/i.test(line)) continue;
      const values = monetaryValues(line);
      if (values.length) return Math.max(...values);
    }
  }

  const values = lines.flatMap(monetaryValues);
  return values.length ? Math.max(...values) : 0;
}

export function extractReceiptMerchant(text: string, fallback: string) {
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean).slice(0, 12);
  const scored = lines.map((line, index) => {
    let score = /[a-z]{3}/i.test(line) ? 20 : -100;
    if (/\b(sdn\.?\s*bhd|enterprise|restaurant|restoran|cafe|coffee house|kopitiam|food ?court|kitchen|sushi|bak kut teh)\b/i.test(line)) score += 100;
    if (/^(receipt|invoice|tax invoice|welcome)$/i.test(line)) score -= 80;
    if (/\b(date|table|cashier|order|invoice no|receipt no|tel(?:ephone)?|jalan|lorong)\b/i.test(line)) score -= 45;
    if (/^\W*\d[\d\W]*(?:sdn|bhd|enterprise)?$/i.test(line)) score -= 50;
    score -= index;
    return { line, score };
  });
  return (scored.sort((left, right) => right.score - left.score)[0]?.line || fallback).slice(0, 80);
}

export function latestReceiptDate(dates: string[]) {
  return dates.reduce<{ value: string; time: number } | null>((latest, value) => {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time) || (latest && latest.time >= time)) return latest;
    return { value, time };
  }, null)?.value || "";
}
