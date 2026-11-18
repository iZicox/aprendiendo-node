PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_movement` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation_id` text,
	`product_id` integer NOT NULL,
	`location_id` integer NOT NULL,
	`movement_type_code` text NOT NULL,
	`quantity` integer NOT NULL,
	`transfer_id` text,
	`note` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`movement_type_code`) REFERENCES `movement_type`(`code`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "movement_quantity_positive" CHECK("__new_movement"."quantity" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_movement`("id", "operation_id", "product_id", "location_id", "movement_type_code", "quantity", "transfer_id", "note", "created_at") SELECT "id", "operation_id", "product_id", "location_id", "movement_type_code", "quantity", "transfer_id", "note", "created_at" FROM `movement`;--> statement-breakpoint
DROP TABLE `movement`;--> statement-breakpoint
ALTER TABLE `__new_movement` RENAME TO `movement`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_movement_product` ON `movement` (`product_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_movement_location` ON `movement` (`location_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_movement_type` ON `movement` (`movement_type_code`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_movement_operation` ON `movement` (`operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_movement_transfer_leg` ON `movement` (`transfer_id`,`movement_type_code`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT "users_role_check" CHECK("__new_users"."role" IN ('admin', 'user'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "role", "created_at") SELECT "id", "email", "password_hash", "role", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `__new_movement_type` (
	`code` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`sign` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT "movement_type_sign_check" CHECK("__new_movement_type"."sign" IN (1, -1))
);
--> statement-breakpoint
INSERT INTO `__new_movement_type`("code", "description", "sign", "created_at") SELECT "code", "description", "sign", "created_at" FROM `movement_type`;--> statement-breakpoint
DROP TABLE `movement_type`;--> statement-breakpoint
ALTER TABLE `__new_movement_type` RENAME TO `movement_type`;