import { browser } from '$app/environment';

import { runMaintenanceDedupe } from '$lib/dedupe/maintenance';
import { initializeGroupStorage } from '$lib/groups/storage';

// We use a type alias for portability
type QueryResult = {
	rowsAffected: number;
	lastInsertId?: number;
};

export interface DatabaseLike {
	execute(sql: string, params?: unknown[]): Promise<QueryResult>;
	select<T = Record<string, unknown>[]>(sql: string, params?: unknown[]): Promise<T>;
	path: string;
	close(): Promise<boolean>;
}

let db: DatabaseLike | null = null;
let initialized = false;

export async function getDatabase(): Promise<DatabaseLike> {
	if (db) return db;

	if (browser) {
		// In browser dev mode, use sql.js WASM
		const { BrowserDatabase } = await import('./browser-db');
		db = await BrowserDatabase.load('sqlite:koshas.db');
	} else {
		// In SSR/Tauri, use the Tauri SQL plugin
		const Database = (await import('@tauri-apps/plugin-sql')).default;
		db = await Database.load('sqlite:koshas.db');
	}
	return db!;
}

export async function getInitializedDatabase(): Promise<DatabaseLike> {
	const database = await getDatabase();
	if (initialized) return database;

	await initializeDatabase(database);
	initialized = true;
	return database;
}

async function initializeDatabase(database: DatabaseLike): Promise<void> {
	for (const statement of getInitializeDatabaseStatements()) {
		await database.execute(statement);
	}
	await initializeGroupStorage(database);
	await runMaintenanceDedupe(database);
}

export function getInitializeDatabaseStatements(): string[] {
	return [
		`
			CREATE TABLE IF NOT EXISTS notebooks (
				id text PRIMARY KEY NOT NULL,
				name text NOT NULL,
				default_save_location text NOT NULL,
				sort_order integer NOT NULL DEFAULT 0,
				created_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
				updated_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
			)
		`,
		'CREATE INDEX IF NOT EXISTS notebooks_sort_order_idx ON notebooks (sort_order)',
		`
			CREATE TABLE IF NOT EXISTS notebook_folders (
				id text PRIMARY KEY NOT NULL,
				notebook_id text NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
				folder_path text NOT NULL,
				added_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
				updated_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
			)
		`,
		'CREATE INDEX IF NOT EXISTS notebook_folders_notebook_id_idx ON notebook_folders (notebook_id)',
		'CREATE UNIQUE INDEX IF NOT EXISTS notebook_folders_path_unique ON notebook_folders (notebook_id, folder_path)',
		`
			CREATE TABLE IF NOT EXISTS notes (
				id text PRIMARY KEY NOT NULL,
				item_id text NOT NULL REFERENCES items(id) ON DELETE CASCADE,
				file_path text NOT NULL,
				notebook_id text NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
				frontmatter text,
				file_modified_at text NOT NULL,
				created_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
				updated_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
			)
		`,
		'CREATE UNIQUE INDEX IF NOT EXISTS notes_item_id_unique ON notes (item_id)',
		'CREATE UNIQUE INDEX IF NOT EXISTS notes_file_path_unique ON notes (file_path)',
		'CREATE INDEX IF NOT EXISTS notes_notebook_id_idx ON notes (notebook_id)',
		'CREATE INDEX IF NOT EXISTS notes_file_modified_at_idx ON notes (file_modified_at)',
		`
			CREATE TABLE IF NOT EXISTS items (
				id text PRIMARY KEY NOT NULL,
				item_type text NOT NULL,
				source_url text,
				normalized_url text,
				title text DEFAULT '' NOT NULL,
				description text,
				body_text text,
				thumbnail text,
				file_path text,
				file_size integer,
				metadata text DEFAULT '{}' NOT NULL,
				ai_tags text,
				manual_tags text,
				colors text,
				ocr_text text,
				summary text,
				embedding blob,
				enrichment_status text DEFAULT 'pending' NOT NULL,
				title_user_edited integer DEFAULT false NOT NULL,
				description_user_edited integer DEFAULT false NOT NULL,
				thumbnail_user_edited integer DEFAULT false NOT NULL,
				seen_at text,
				manually_added integer DEFAULT false NOT NULL,
				created_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
				updated_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
			)
		`,
		'CREATE UNIQUE INDEX IF NOT EXISTS items_normalized_url_unique ON items (normalized_url)',
		'CREATE INDEX IF NOT EXISTS items_item_type_idx ON items (item_type)',
		'CREATE INDEX IF NOT EXISTS items_updated_at_idx ON items (updated_at)',
		`
			CREATE TABLE IF NOT EXISTS sources (
				id text PRIMARY KEY NOT NULL,
				item_id text NOT NULL,
				source_type text NOT NULL,
				source_name text NOT NULL,
				source_id text,
				first_seen_at text NOT NULL,
				last_seen_at text NOT NULL,
				created_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
				updated_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
				FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE cascade
			)
		`,
		'CREATE INDEX IF NOT EXISTS sources_item_id_idx ON sources (item_id)',
		'CREATE UNIQUE INDEX IF NOT EXISTS sources_source_identity_unique ON sources (source_type, source_name, source_id)',
		`
			CREATE TABLE IF NOT EXISTS deleted_items (
				id text PRIMARY KEY NOT NULL,
				normalized_url text,
				file_path text,
				deleted_at text NOT NULL,
				created_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
				updated_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
			)
		`,
		'CREATE UNIQUE INDEX IF NOT EXISTS deleted_items_normalized_url_unique ON deleted_items (normalized_url)',
		'CREATE UNIQUE INDEX IF NOT EXISTS deleted_items_file_path_unique ON deleted_items (file_path)',
		'CREATE INDEX IF NOT EXISTS deleted_items_deleted_at_idx ON deleted_items (deleted_at)',
		`
			CREATE TABLE IF NOT EXISTS link_references (
				id text PRIMARY KEY NOT NULL,
				source_item_id text NOT NULL REFERENCES items(id) ON DELETE CASCADE,
				target_item_id text NOT NULL REFERENCES items(id) ON DELETE CASCADE,
				reference_type text,
				created_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
				updated_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
			)
		`,
		'CREATE INDEX IF NOT EXISTS link_references_source_item_id_idx ON link_references (source_item_id)',
		'CREATE INDEX IF NOT EXISTS link_references_target_item_id_idx ON link_references (target_item_id)',
		'CREATE UNIQUE INDEX IF NOT EXISTS link_references_pair_unique ON link_references (source_item_id, target_item_id, reference_type)',
		`
			CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
				title,
				description,
				body_text,
				ocr_text,
				summary,
				content='items',
				content_rowid='rowid'
			)
		`,
		`
			CREATE TRIGGER IF NOT EXISTS items_fts_after_insert AFTER INSERT ON items BEGIN
				INSERT INTO items_fts (rowid, title, description, body_text, ocr_text, summary)
				VALUES (new.rowid, new.title, new.description, new.body_text, new.ocr_text, new.summary);
			END
		`,
		`
			CREATE TRIGGER IF NOT EXISTS items_fts_after_delete AFTER DELETE ON items BEGIN
				INSERT INTO items_fts (items_fts, rowid, title, description, body_text, ocr_text, summary)
				VALUES ('delete', old.rowid, old.title, old.description, old.body_text, old.ocr_text, old.summary);
			END
		`,
		`
			CREATE TRIGGER IF NOT EXISTS items_fts_after_update AFTER UPDATE ON items BEGIN
				INSERT INTO items_fts (items_fts, rowid, title, description, body_text, ocr_text, summary)
				VALUES ('delete', old.rowid, old.title, old.description, old.body_text, old.ocr_text, old.summary);
				INSERT INTO items_fts (rowid, title, description, body_text, ocr_text, summary)
				VALUES (new.rowid, new.title, new.description, new.body_text, new.ocr_text, new.summary);
			END
		`,
		`
			CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
				note_id UNINDEXED,
				item_id UNINDEXED,
				notebook_id UNINDEXED,
				title,
				body_text
			)
		`
	].map((statement) => statement.trim());
}
