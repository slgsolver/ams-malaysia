import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const receipts = sqliteTable("receipts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  merchant: text("merchant").notNull(),
  receiptDate: text("receipt_date").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  taxUse: text("tax_use").notNull(),
  confidence: integer("confidence").notNull().default(0),
  fileKey: text("file_key"),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_receipts_user_created").on(table.userId, table.createdAt),
  index("idx_receipts_user_tax_use").on(table.userId, table.taxUse),
]);
