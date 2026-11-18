PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_location` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_location`("id", "code", "created_at") SELECT "id", "code", "created_at" FROM `location`;--> statement-breakpoint
DROP TABLE `location`;--> statement-breakpoint
ALTER TABLE `__new_location` RENAME TO `location`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `location_code_unique` ON `location` (`code`);--> statement-breakpoint
CREATE TABLE `__new_movement` (
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
	CONSTRAINT "movement_quantity_positive" CHECK("__new_movement"."quantity" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_movement`("id", "operation_id", "product_id", "location_id", "movement_type_code", "quantity", "transfer_id", "note", "updated_at", "created_at") SELECT "id", "operation_id", "product_id", "location_id", "movement_type_code", "quantity", "transfer_id", "note", "updated_at", "created_at" FROM `movement`;--> statement-breakpoint
DROP TABLE `movement`;--> statement-breakpoint
ALTER TABLE `__new_movement` RENAME TO `movement`;--> statement-breakpoint
CREATE INDEX `idx_movement_product` ON `movement` (`product_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_movement_location` ON `movement` (`location_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_movement_type` ON `movement` (`movement_type_code`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_movement_operation` ON `movement` (`operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_movement_transfer_leg` ON `movement` (`transfer_id`,`movement_type_code`);--> statement-breakpoint
CREATE TABLE `__new_movement_type` (
	`code` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`sign` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "movement_type_sign_check" CHECK("__new_movement_type"."sign" IN (1, -1))
);
--> statement-breakpoint
INSERT INTO `__new_movement_type`("code", "description", "sign", "created_at") SELECT "code", "description", "sign", "created_at" FROM `movement_type`;--> statement-breakpoint
DROP TABLE `movement_type`;--> statement-breakpoint
ALTER TABLE `__new_movement_type` RENAME TO `movement_type`;--> statement-breakpoint
CREATE TABLE `__new_product` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_product`("id", "sku", "created_at", "updated_at") SELECT "id", "sku", "created_at", "updated_at" FROM `product`;--> statement-breakpoint
DROP TABLE `product`;--> statement-breakpoint
ALTER TABLE `__new_product` RENAME TO `product`;--> statement-breakpoint
CREATE UNIQUE INDEX `product_sku_unique` ON `product` (`sku`);--> statement-breakpoint
CREATE TABLE `__new_stock` (
	`product_id` integer NOT NULL,
	`location_id` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`product_id`, `location_id`),
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_quantity_non_negative" CHECK("__new_stock"."quantity" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_stock`("product_id", "location_id", "quantity", "updated_at") SELECT "product_id", "location_id", "quantity", "updated_at" FROM `stock`;--> statement-breakpoint
DROP TABLE `stock`;--> statement-breakpoint
ALTER TABLE `__new_stock` RENAME TO `stock`;--> statement-breakpoint
CREATE INDEX `idx_stock_location` ON `stock` (`location_id`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "users_role_check" CHECK("__new_users"."role" IN ('admin', 'user'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "role", "created_at") SELECT "id", "email", "password_hash", "role", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);