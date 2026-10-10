CREATE TABLE `auth_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sales_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`leader_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `enterprise_accounts` ADD `username` text;--> statement-breakpoint
ALTER TABLE `enterprise_accounts` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `enterprise_accounts` ADD `password_salt` text;--> statement-breakpoint
ALTER TABLE `enterprise_accounts` ADD `group_id` text;--> statement-breakpoint
ALTER TABLE `enterprise_accounts` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `enterprise_accounts` ADD `subjects` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `enterprise_accounts` ADD `stages` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `enterprise_accounts` ADD `bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `enterprise_accounts` ADD `employment` text DEFAULT 'parttime' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_accounts_username_unique` ON `enterprise_accounts` (`username`);