CREATE TABLE `tax_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`year` integer NOT NULL,
	`form_type` text NOT NULL,
	`checklist_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tax_profiles_user_entity_year` ON `tax_profiles` (`user_id`,`entity_type`,`year`);