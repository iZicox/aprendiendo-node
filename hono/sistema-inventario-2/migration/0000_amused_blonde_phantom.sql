CREATE TABLE `location` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `location_code_unique` ON `location` (`code`);--> statement-breakpoint
CREATE TABLE `movement` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation_id` text,
	`product_id` integer NOT NULL,
	`location_id` integer NOT NULL,
	`movement_type_code` text NOT NULL,
	`quantity` integer NOT NULL,
	`transfer_id` text,
	`note` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`movement_type_code`) REFERENCES `movement_type`(`code`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "movement_quantity_positive" CHECK("movement"."quantity" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_movement_product` ON `movement` (`product_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_movement_location` ON `movement` (`location_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_movement_type` ON `movement` (`movement_type_code`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_movement_operation` ON `movement` (`operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_movement_transfer_leg` ON `movement` (`transfer_id`,`movement_type_code`);--> statement-breakpoint
CREATE TABLE `movement_type` (
	`code` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`sign` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "movement_type_sign_check" CHECK("movement_type"."sign" IN (1, -1))
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_sku_unique` ON `product` (`sku`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stock` (
	`product_id` integer NOT NULL,
	`location_id` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`product_id`, `location_id`),
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_quantity_non_negative" CHECK("stock"."quantity" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_stock_location` ON `stock` (`location_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('admin', 'user'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);