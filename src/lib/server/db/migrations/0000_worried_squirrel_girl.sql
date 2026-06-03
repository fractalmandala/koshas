CREATE TABLE `deleted_items` (
	`id` text PRIMARY KEY NOT NULL,
	`normalized_url` text,
	`file_path` text,
	`deleted_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deleted_items_normalized_url_unique` ON `deleted_items` (`normalized_url`);--> statement-breakpoint
CREATE UNIQUE INDEX `deleted_items_file_path_unique` ON `deleted_items` (`file_path`);--> statement-breakpoint
CREATE INDEX `deleted_items_deleted_at_idx` ON `deleted_items` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`whitelist` text DEFAULT '[]' NOT NULL,
	`blacklist` text DEFAULT '[]' NOT NULL,
	`preferred_browser` text,
	`is_built_in` integer DEFAULT false NOT NULL,
	`is_special` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_name_unique` ON `groups` (`name`);--> statement-breakpoint
CREATE INDEX `groups_sort_order_idx` ON `groups` (`sort_order`);--> statement-breakpoint
CREATE INDEX `groups_is_special_idx` ON `groups` (`is_special`);--> statement-breakpoint
CREATE TABLE `item_groups` (
	`item_id` text NOT NULL,
	`group_id` text NOT NULL,
	`assignment_type` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	PRIMARY KEY(`item_id`, `group_id`, `assignment_type`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `item_groups_item_id_idx` ON `item_groups` (`item_id`);--> statement-breakpoint
CREATE INDEX `item_groups_group_id_idx` ON `item_groups` (`group_id`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`item_type` text NOT NULL,
	`source_url` text,
	`normalized_url` text,
	`title` text DEFAULT '' NOT NULL,
	`description` text,
	`body_text` text,
	`thumbnail` text,
	`file_path` text,
	`file_size` integer,
	`metadata` text DEFAULT '{}' NOT NULL,
	`ai_tags` text,
	`manual_tags` text,
	`colors` text,
	`ocr_text` text,
	`summary` text,
	`embedding` blob,
	`enrichment_status` text DEFAULT 'pending' NOT NULL,
	`title_user_edited` integer DEFAULT false NOT NULL,
	`description_user_edited` integer DEFAULT false NOT NULL,
	`thumbnail_user_edited` integer DEFAULT false NOT NULL,
	`seen_at` text,
	`manually_added` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_normalized_url_unique` ON `items` (`normalized_url`);--> statement-breakpoint
CREATE INDEX `items_item_type_idx` ON `items` (`item_type`);--> statement-breakpoint
CREATE INDEX `items_file_path_idx` ON `items` (`file_path`);--> statement-breakpoint
CREATE INDEX `items_enrichment_status_idx` ON `items` (`enrichment_status`);--> statement-breakpoint
CREATE INDEX `items_seen_at_idx` ON `items` (`seen_at`);--> statement-breakpoint
CREATE INDEX `items_updated_at_idx` ON `items` (`updated_at`);--> statement-breakpoint
CREATE TABLE `link_references` (
	`id` text PRIMARY KEY NOT NULL,
	`source_item_id` text NOT NULL,
	`target_item_id` text NOT NULL,
	`reference_type` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`source_item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `link_references_source_item_id_idx` ON `link_references` (`source_item_id`);--> statement-breakpoint
CREATE INDEX `link_references_target_item_id_idx` ON `link_references` (`target_item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `link_references_pair_unique` ON `link_references` (`source_item_id`,`target_item_id`,`reference_type`);--> statement-breakpoint
CREATE TABLE `notebook_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`notebook_id` text NOT NULL,
	`folder_path` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`notebook_id`) REFERENCES `notebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notebook_folders_notebook_id_idx` ON `notebook_folders` (`notebook_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `notebook_folders_path_unique` ON `notebook_folders` (`notebook_id`,`folder_path`);--> statement-breakpoint
CREATE TABLE `notebooks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`default_save_location` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notebooks_sort_order_idx` ON `notebooks` (`sort_order`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`file_path` text NOT NULL,
	`notebook_id` text NOT NULL,
	`frontmatter` text,
	`file_modified_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`notebook_id`) REFERENCES `notebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notes_item_id_unique` ON `notes` (`item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `notes_file_path_unique` ON `notes` (`file_path`);--> statement-breakpoint
CREATE INDEX `notes_notebook_id_idx` ON `notes` (`notebook_id`);--> statement-breakpoint
CREATE INDEX `notes_file_modified_at_idx` ON `notes` (`file_modified_at`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_name` text NOT NULL,
	`source_id` text,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sources_item_id_idx` ON `sources` (`item_id`);--> statement-breakpoint
CREATE INDEX `sources_source_type_idx` ON `sources` (`source_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `sources_source_identity_unique` ON `sources` (`source_type`,`source_name`,`source_id`);--> statement-breakpoint
CREATE TABLE `space_items` (
	`space_id` text NOT NULL,
	`item_id` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	PRIMARY KEY(`space_id`, `item_id`),
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `space_items_space_id_idx` ON `space_items` (`space_id`);--> statement-breakpoint
CREATE INDEX `space_items_item_id_idx` ON `space_items` (`item_id`);--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`space_type` text NOT NULL,
	`query_definition` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `spaces_space_type_idx` ON `spaces` (`space_type`);--> statement-breakpoint
CREATE INDEX `spaces_sort_order_idx` ON `spaces` (`sort_order`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`source_name` text,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sync_runs_status_idx` ON `sync_runs` (`status`);--> statement-breakpoint
CREATE INDEX `sync_runs_source_name_idx` ON `sync_runs` (`source_name`);--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`visited_at` text NOT NULL,
	`source_context` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `visits_item_id_idx` ON `visits` (`item_id`);--> statement-breakpoint
CREATE INDEX `visits_visited_at_idx` ON `visits` (`visited_at`);--> statement-breakpoint
CREATE VIRTUAL TABLE IF NOT EXISTS `items_fts` USING fts5(
	`title`,
	`description`,
	`body_text`,
	`ocr_text`,
	`summary`,
	content='items',
	content_rowid='rowid'
);--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `items_fts_after_insert` AFTER INSERT ON `items` BEGIN
	INSERT INTO `items_fts` (`rowid`, `title`, `description`, `body_text`, `ocr_text`, `summary`)
	VALUES (new.rowid, new.title, new.description, new.body_text, new.ocr_text, new.summary);
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `items_fts_after_delete` AFTER DELETE ON `items` BEGIN
	INSERT INTO `items_fts` (`items_fts`, `rowid`, `title`, `description`, `body_text`, `ocr_text`, `summary`)
	VALUES ('delete', old.rowid, old.title, old.description, old.body_text, old.ocr_text, old.summary);
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `items_fts_after_update` AFTER UPDATE ON `items` BEGIN
	INSERT INTO `items_fts` (`items_fts`, `rowid`, `title`, `description`, `body_text`, `ocr_text`, `summary`)
	VALUES ('delete', old.rowid, old.title, old.description, old.body_text, old.ocr_text, old.summary);
	INSERT INTO `items_fts` (`rowid`, `title`, `description`, `body_text`, `ocr_text`, `summary`)
	VALUES (new.rowid, new.title, new.description, new.body_text, new.ocr_text, new.summary);
END;--> statement-breakpoint
CREATE VIRTUAL TABLE IF NOT EXISTS `notes_fts` USING fts5(
	`note_id` UNINDEXED,
	`item_id` UNINDEXED,
	`notebook_id` UNINDEXED,
	`title`,
	`body_text`
);
