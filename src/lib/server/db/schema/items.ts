import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable('items', {
	id: text('id').primaryKey(),
	type: text('type').notNull(),
	title: text('title').notNull().default(''),
	url: text('url'),
	domain: text('domain'),
	description: text('description'),
	content: text('content'),
	contentType: text('content_type'),
	filePath: text('file_path'),
	fileSize: integer('file_size'),
	checksum: text('checksum'),
	frontmatter: text('frontmatter'),
	source: text('source').notNull().default('manual'),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
	accessedAt: text('accessed_at'),
	metadata: text('metadata'),
	aiStatus: text('ai_status').default('pending'),
	aiData: text('ai_data')
});
