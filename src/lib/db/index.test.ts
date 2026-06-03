import { describe, expect, it } from 'vitest';

import { getInitializeDatabaseStatements } from './index';

describe('getInitializeDatabaseStatements', () => {
	it('includes runtime FTS tables and item sync triggers', () => {
		const statements = getInitializeDatabaseStatements().join('\n');

		expect(statements).toContain('CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5');
		expect(statements).toContain('CREATE TRIGGER IF NOT EXISTS items_fts_after_insert');
		expect(statements).toContain('CREATE TRIGGER IF NOT EXISTS items_fts_after_update');
		expect(statements).toContain('CREATE TRIGGER IF NOT EXISTS items_fts_after_delete');
		expect(statements).toContain('CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5');
	});

	it('includes tombstone storage for deleted normalized URLs', () => {
		const statements = getInitializeDatabaseStatements().join('\n');

		expect(statements).toContain('CREATE TABLE IF NOT EXISTS deleted_items');
		expect(statements).toContain('deleted_items_normalized_url_unique');
	});

	it('includes notebooks and notebook_folders DDL', () => {
		const statements = getInitializeDatabaseStatements().join('\n');

		expect(statements).toContain('CREATE TABLE IF NOT EXISTS notebooks');
		expect(statements).toContain('CREATE TABLE IF NOT EXISTS notebook_folders');
		expect(statements).toContain('notebook_folders_path_unique');
	});

	it('includes notes table DDL', () => {
		const statements = getInitializeDatabaseStatements().join('\n');

		expect(statements).toContain('CREATE TABLE IF NOT EXISTS notes');
		expect(statements).toContain('notes_item_id_unique');
		expect(statements).toContain('notes_file_path_unique');
	});
});
