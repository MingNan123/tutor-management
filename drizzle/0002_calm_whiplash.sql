CREATE TABLE `account_initializations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `enterprise_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`auth_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_accounts_email_unique` ON `enterprise_accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_accounts_auth_user_id_unique` ON `enterprise_accounts` (`auth_user_id`);