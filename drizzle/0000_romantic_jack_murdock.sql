CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`merchant` text NOT NULL,
	`receipt_date` text NOT NULL,
	`amount` real NOT NULL,
	`category` text NOT NULL,
	`tax_use` text NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`file_key` text,
	`file_name` text,
	`mime_type` text,
	`created_at` text NOT NULL
);
