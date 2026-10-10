ALTER TABLE `enterprise_accounts` ADD `owner_sales_id` text;--> statement-breakpoint
ALTER TABLE `enterprise_accounts` ADD `admin_level` integer DEFAULT 1 NOT NULL;