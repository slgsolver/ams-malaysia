ALTER TABLE `receipts` ADD `entity_type` text DEFAULT 'business' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_receipts_user_entity_created` ON `receipts` (`user_id`,`entity_type`,`created_at`);