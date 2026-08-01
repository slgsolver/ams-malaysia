CREATE INDEX `idx_receipts_user_created` ON `receipts` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_receipts_user_tax_use` ON `receipts` (`user_id`,`tax_use`);