CREATE TABLE `bank_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`transaction_date` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`matched_receipt_id` text,
	`source_name` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bank_user_date` ON `bank_transactions` (`user_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `idx_bank_user_match` ON `bank_transactions` (`user_id`,`matched_receipt_id`);--> statement-breakpoint
ALTER TABLE `receipts` ADD `business_use` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `receipts` ADD `business_purpose` text;--> statement-breakpoint
ALTER TABLE `receipts` ADD `myinvois_uuid` text;--> statement-breakpoint
CREATE INDEX `idx_receipts_user_myinvois` ON `receipts` (`user_id`,`myinvois_uuid`);