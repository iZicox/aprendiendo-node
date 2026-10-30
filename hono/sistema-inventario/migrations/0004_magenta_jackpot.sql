CREATE TABLE `movement_operation` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_movement_operation_user_key` ON `movement_operation` (`user_id`,`idempotency_key`);--> statement-breakpoint
ALTER TABLE `movement` ADD `operation_id` text REFERENCES movement_operation(id);--> statement-breakpoint
CREATE INDEX `idx_movement_operation` ON `movement` (`operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_movement_transfer_leg` ON `movement` (`transfer_id`,`movementTypeCode`);