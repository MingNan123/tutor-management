CREATE TABLE `order_screenshots` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`uploader` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`created` text NOT NULL
);
