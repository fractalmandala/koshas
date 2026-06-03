import { sql } from 'drizzle-orm';
import { blob, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const itemTypes = [
	'bookmark',
	'article',
	'image',
	'pdf',
	'video',
	'note',
	'quote',
	'highlight',
	'product',
	'recipe',
	'book'
] as const;

export const sourceTypes = [
	'browser_history',
	'browser_bookmark',
	'extension',
	'manual',
	'file_import'
] as const;

export const assignmentTypes = ['rule', 'manualInclude', 'manualExclude'] as const;
export const spaceTypes = ['manual', 'smart'] as const;
export const referenceTypes = ['explicit', 'auto_detected'] as const;
export const enrichmentStatuses = ['pending', 'enriching', 'done', 'failed'] as const;
export const syncRunStatuses = ['running', 'succeeded', 'failed', 'cancelled'] as const;

const timestamps = {
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
};

export const items = sqliteTable(
	'items',
	{
		id: text('id').primaryKey(),
		itemType: text('item_type', { enum: itemTypes }).notNull(),
		sourceUrl: text('source_url'),
		normalizedUrl: text('normalized_url'),
		title: text('title').notNull().default(''),
		description: text('description'),
		bodyText: text('body_text'),
		thumbnail: text('thumbnail'),
		filePath: text('file_path'),
		fileSize: integer('file_size'),
		metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
		aiTags: text('ai_tags', { mode: 'json' }).$type<string[]>(),
		manualTags: text('manual_tags', { mode: 'json' }).$type<string[]>(),
		colors: text('colors', { mode: 'json' }).$type<string[]>(),
		ocrText: text('ocr_text'),
		summary: text('summary'),
		embedding: blob('embedding'),
		enrichmentStatus: text('enrichment_status', { enum: enrichmentStatuses }).notNull().default('pending'),
		titleUserEdited: integer('title_user_edited', { mode: 'boolean' }).notNull().default(false),
		descriptionUserEdited: integer('description_user_edited', { mode: 'boolean' }).notNull().default(false),
		thumbnailUserEdited: integer('thumbnail_user_edited', { mode: 'boolean' }).notNull().default(false),
		seenAt: text('seen_at'),
		manuallyAdded: integer('manually_added', { mode: 'boolean' }).notNull().default(false),
		...timestamps
	},
	(table) => [
		uniqueIndex('items_normalized_url_unique').on(table.normalizedUrl),
		index('items_item_type_idx').on(table.itemType),
		index('items_file_path_idx').on(table.filePath),
		index('items_enrichment_status_idx').on(table.enrichmentStatus),
		index('items_seen_at_idx').on(table.seenAt),
		index('items_updated_at_idx').on(table.updatedAt)
	]
);

export const sources = sqliteTable(
	'sources',
	{
		id: text('id').primaryKey(),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		sourceType: text('source_type', { enum: sourceTypes }).notNull(),
		sourceName: text('source_name').notNull(),
		sourceId: text('source_id'),
		firstSeenAt: text('first_seen_at').notNull(),
		lastSeenAt: text('last_seen_at').notNull(),
		...timestamps
	},
	(table) => [
		index('sources_item_id_idx').on(table.itemId),
		index('sources_source_type_idx').on(table.sourceType),
		uniqueIndex('sources_source_identity_unique').on(table.sourceType, table.sourceName, table.sourceId)
	]
);

export const visits = sqliteTable(
	'visits',
	{
		id: text('id').primaryKey(),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		visitedAt: text('visited_at').notNull(),
		sourceContext: text('source_context'),
		...timestamps
	},
	(table) => [index('visits_item_id_idx').on(table.itemId), index('visits_visited_at_idx').on(table.visitedAt)]
);

export const groups = sqliteTable(
	'groups',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		description: text('description'),
		whitelist: text('whitelist', { mode: 'json' }).$type<Record<string, unknown>[]>().notNull().default([]),
		blacklist: text('blacklist', { mode: 'json' }).$type<Record<string, unknown>[]>().notNull().default([]),
		preferredBrowser: text('preferred_browser'),
		isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
		isSpecial: integer('is_special', { mode: 'boolean' }).notNull().default(false),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps
	},
	(table) => [
		uniqueIndex('groups_name_unique').on(table.name),
		index('groups_sort_order_idx').on(table.sortOrder),
		index('groups_is_special_idx').on(table.isSpecial)
	]
);

export const itemGroups = sqliteTable(
	'item_groups',
	{
		itemId: text('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		groupId: text('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		assignmentType: text('assignment_type', { enum: assignmentTypes }).notNull(),
		createdAt: text('created_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`)
	},
	(table) => [
		primaryKey({ columns: [table.itemId, table.groupId, table.assignmentType] }),
		index('item_groups_item_id_idx').on(table.itemId),
		index('item_groups_group_id_idx').on(table.groupId)
	]
);

export const spaces = sqliteTable(
	'spaces',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		description: text('description'),
		spaceType: text('space_type', { enum: spaceTypes }).notNull(),
		queryDefinition: text('query_definition', { mode: 'json' }).$type<Record<string, unknown>>(),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps
	},
	(table) => [index('spaces_space_type_idx').on(table.spaceType), index('spaces_sort_order_idx').on(table.sortOrder)]
);

export const spaceItems = sqliteTable(
	'space_items',
	{
		spaceId: text('space_id')
			.notNull()
			.references(() => spaces.id, { onDelete: 'cascade' }),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		addedAt: text('added_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`)
	},
	(table) => [
		primaryKey({ columns: [table.spaceId, table.itemId] }),
		index('space_items_space_id_idx').on(table.spaceId),
		index('space_items_item_id_idx').on(table.itemId)
	]
);

export const linkReferences = sqliteTable(
	'link_references',
	{
		id: text('id').primaryKey(),
		sourceItemId: text('source_item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		targetItemId: text('target_item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		referenceType: text('reference_type', { enum: referenceTypes }),
		...timestamps
	},
	(table) => [
		index('link_references_source_item_id_idx').on(table.sourceItemId),
		index('link_references_target_item_id_idx').on(table.targetItemId),
		uniqueIndex('link_references_pair_unique').on(table.sourceItemId, table.targetItemId, table.referenceType)
	]
);

export const deletedItems = sqliteTable(
	'deleted_items',
	{
		id: text('id').primaryKey(),
		normalizedUrl: text('normalized_url'),
		filePath: text('file_path'),
		deletedAt: text('deleted_at').notNull(),
		createdAt: text('created_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`)
	},
	(table) => [
		uniqueIndex('deleted_items_normalized_url_unique').on(table.normalizedUrl),
		uniqueIndex('deleted_items_file_path_unique').on(table.filePath),
		index('deleted_items_deleted_at_idx').on(table.deletedAt)
	]
);

export const notebooks = sqliteTable(
	'notebooks',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		defaultSaveLocation: text('default_save_location').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps
	},
	(table) => [index('notebooks_sort_order_idx').on(table.sortOrder)]
);

export const notebookFolders = sqliteTable(
	'notebook_folders',
	{
		id: text('id').primaryKey(),
		notebookId: text('notebook_id')
			.notNull()
			.references(() => notebooks.id, { onDelete: 'cascade' }),
		folderPath: text('folder_path').notNull(),
		addedAt: text('added_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`)
	},
	(table) => [
		index('notebook_folders_notebook_id_idx').on(table.notebookId),
		uniqueIndex('notebook_folders_path_unique').on(table.notebookId, table.folderPath)
	]
);

export const notes = sqliteTable(
	'notes',
	{
		id: text('id').primaryKey(),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		filePath: text('file_path').notNull(),
		notebookId: text('notebook_id')
			.notNull()
			.references(() => notebooks.id, { onDelete: 'cascade' }),
		frontmatter: text('frontmatter', { mode: 'json' }).$type<Record<string, unknown>>(),
		fileModifiedAt: text('file_modified_at').notNull(),
		...timestamps
	},
	(table) => [
		uniqueIndex('notes_item_id_unique').on(table.itemId),
		uniqueIndex('notes_file_path_unique').on(table.filePath),
		index('notes_notebook_id_idx').on(table.notebookId),
		index('notes_file_modified_at_idx').on(table.fileModifiedAt)
	]
);

export const syncRuns = sqliteTable(
	'sync_runs',
	{
		id: text('id').primaryKey(),
		startedAt: text('started_at').notNull(),
		finishedAt: text('finished_at'),
		status: text('status', { enum: syncRunStatuses }).notNull(),
		sourceName: text('source_name'),
		importedCount: integer('imported_count').notNull().default(0),
		errorMessage: text('error_message'),
		createdAt: text('created_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`)
	},
	(table) => [index('sync_runs_status_idx').on(table.status), index('sync_runs_source_name_idx').on(table.sourceName)]
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type ItemGroup = typeof itemGroups.$inferSelect;
export type NewItemGroup = typeof itemGroups.$inferInsert;
export type Space = typeof spaces.$inferSelect;
export type NewSpace = typeof spaces.$inferInsert;
export type SpaceItem = typeof spaceItems.$inferSelect;
export type NewSpaceItem = typeof spaceItems.$inferInsert;
export type LinkReference = typeof linkReferences.$inferSelect;
export type NewLinkReference = typeof linkReferences.$inferInsert;
export type DeletedItem = typeof deletedItems.$inferSelect;
export type NewDeletedItem = typeof deletedItems.$inferInsert;
export type Notebook = typeof notebooks.$inferSelect;
export type NewNotebook = typeof notebooks.$inferInsert;
export type NotebookFolder = typeof notebookFolders.$inferSelect;
export type NewNotebookFolder = typeof notebookFolders.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type SyncRun = typeof syncRuns.$inferSelect;
export type NewSyncRun = typeof syncRuns.$inferInsert;
