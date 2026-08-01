import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const receipts = sqliteTable("receipts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  merchant: text("merchant").notNull(),
  receiptDate: text("receipt_date").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  taxUse: text("tax_use").notNull(),
  businessUse: integer("business_use").notNull().default(0),
  businessPurpose: text("business_purpose"),
  myInvoisUuid: text("myinvois_uuid"),
  confidence: integer("confidence").notNull().default(0),
  fileKey: text("file_key"),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_receipts_user_created").on(table.userId, table.createdAt),
  index("idx_receipts_user_tax_use").on(table.userId, table.taxUse),
  index("idx_receipts_user_myinvois").on(table.userId, table.myInvoisUuid),
]);

export const bankTransactions = sqliteTable("bank_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  transactionDate: text("transaction_date").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  matchedReceiptId: text("matched_receipt_id"),
  sourceName: text("source_name"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_bank_user_date").on(table.userId, table.transactionDate),
  index("idx_bank_user_match").on(table.userId, table.matchedReceiptId),
]);
