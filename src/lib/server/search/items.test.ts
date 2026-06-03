import { createClient, type InValue } from '@libsql/client';
import { describe, expect, it } from 'vitest';

import {
	buildItemFtsSearchQuery,
	createItemSearchService,
	mapItemSearchRows,
	searchItems,
	type SearchExecutor
} from './items';

describe('buildItemFtsSearchQuery', () => {
	it('builds a bounded BM25-ranked item FTS query', () => {
		const query = buildItemFtsSearchQuery({
			query: 'panini grammar',
			limit: 100,
			offset: 2
		});

		expect(query.params).toEqual(['panini grammar', 50, 2]);
		expect(query.sql).toContain('FROM items_fts');
		expect(query.sql).toContain('JOIN items ON items.rowid = items_fts.rowid');
		expect(query.sql).toContain('items_fts MATCH ?');
		expect(query.sql).toContain('bm25(items_fts');
		expect(query.sql).toContain('ORDER BY rank ASC, seen_at DESC, updated_at DESC');
		expect(query.sql).toContain('LIMIT ? OFFSET ?');
	});

	it('rejects blank FTS queries before reaching the database', () => {
		expect(() => buildItemFtsSearchQuery({ query: '   ' })).toThrow('Search query cannot be blank');
	});
});

describe('mapItemSearchRows', () => {
	it('maps SQLite-style item rows into stable search results', () => {
		expect(
			mapItemSearchRows([
				{
					id: 'item-1',
					item_type: 'article',
					source_url: 'https://example.com/raw',
					normalized_url: 'https://example.com',
					title: 'Panini grammar',
					description: null,
					body_text: 'A body',
					ocr_text: null,
					summary: 'A summary',
					thumbnail: null,
					file_path: null,
					seen_at: '2026-06-01T10:00:00Z',
					updated_at: '2026-06-02T10:00:00Z',
					rank: -1.25
				}
			])
		).toEqual([
			{
				id: 'item-1',
				itemType: 'article',
				sourceUrl: 'https://example.com/raw',
				normalizedUrl: 'https://example.com',
				title: 'Panini grammar',
				description: null,
				bodyText: 'A body',
				ocrText: null,
				summary: 'A summary',
				thumbnail: null,
				filePath: null,
				seenAt: '2026-06-01T10:00:00Z',
				updatedAt: '2026-06-02T10:00:00Z',
				rank: -1.25
			}
		]);
	});
});

describe('searchItems', () => {
	it('executes the built query through a DB adapter and maps results', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const executor: SearchExecutor = {
			async select<T>(sql: string, params: unknown[]): Promise<T[]> {
				calls.push({ sql, params });
				return [
					{
						id: 'item-2',
						item_type: 'bookmark',
						source_url: 'https://example.com',
						normalized_url: 'https://example.com',
						title: 'SQLite FTS5',
						description: 'Search docs',
						body_text: null,
						ocr_text: null,
						summary: null,
						thumbnail: null,
						file_path: null,
						seen_at: null,
						updated_at: '2026-06-03T10:00:00Z',
						rank: -0.5
					}
				] as T[];
			}
		};

		const results = await searchItems(executor, { query: 'fts5', limit: 1 });

		expect(calls).toHaveLength(1);
		expect(calls[0].params).toEqual(['fts5', 1, 0]);
		expect(results).toEqual([
			expect.objectContaining({
				id: 'item-2',
				itemType: 'bookmark',
				rank: -0.5
			})
		]);
	});

	it('returns synced BM25-ranked results from a real FTS5 items index', async () => {
		const database = createClient({ url: 'file::memory:' });

		try {
			await createItemsFtsFixture(database);

			await database.execute({
				sql: `
					INSERT INTO items (
						id,
						item_type,
						source_url,
						normalized_url,
						title,
						description,
						body_text,
						ocr_text,
						summary,
						seen_at,
						updated_at
					)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				args: [
					'item-weak',
					'bookmark',
					null,
					null,
					'A grammar link',
					'Mentions Panini once',
					null,
					null,
					null,
					'2026-06-03T08:00:00Z',
					'2026-06-03T08:00:00Z'
				]
			});
			await database.execute({
				sql: `
					INSERT INTO items (
						id,
						item_type,
						source_url,
						normalized_url,
						title,
						description,
						body_text,
						ocr_text,
						summary,
						seen_at,
						updated_at
					)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				args: [
					'item-strong',
					'article',
					null,
					null,
					'Panini grammar',
					'Panini sutras and Sanskrit grammar',
					'Panini Panini Panini',
					null,
					'Panini summary',
					'2026-06-03T07:00:00Z',
					'2026-06-03T07:00:00Z'
				]
			});

			const insertResults = await searchItems(
				{
					async select<T>(sql: string, params: unknown[]): Promise<T[]> {
						const result = await database.execute({ sql, args: params as InValue[] });
						return result.rows as T[];
					}
				},
				{ query: 'panini' }
			);

			expect(insertResults.map((result) => result.id)).toEqual(['item-strong', 'item-weak']);
			expect(insertResults[0].rank).toBeLessThan(insertResults[1].rank);

			await database.execute({
				sql: 'UPDATE items SET title = ?, description = ?, body_text = ?, updated_at = ? WHERE id = ?',
				args: [
					'Updated search target',
					'Updated row now contains Nyaya',
					'Nyaya Nyaya Nyaya',
					'2026-06-03T09:00:00Z',
					'item-weak'
				]
			});
			await database.execute({ sql: 'DELETE FROM items WHERE id = ?', args: ['item-strong'] });

			const updatedResults = await searchItems(
				{
					async select<T>(sql: string, params: unknown[]): Promise<T[]> {
						const result = await database.execute({ sql, args: params as InValue[] });
						return result.rows as T[];
					}
				},
				{ query: 'nyaya' }
			);

			expect(updatedResults.map((result) => result.id)).toEqual(['item-weak']);
			expect(updatedResults[0]).toEqual(
				expect.objectContaining({
					title: 'Updated search target',
					bodyText: 'Nyaya Nyaya Nyaya'
				})
			);
		} finally {
			database.close();
		}
	});
});

async function createItemsFtsFixture(database: ReturnType<typeof createClient>): Promise<void> {
	await database.execute(`
		CREATE TABLE items (
			id text PRIMARY KEY NOT NULL,
			item_type text NOT NULL,
			source_url text,
			normalized_url text,
			title text DEFAULT '' NOT NULL,
			description text,
			body_text text,
			ocr_text text,
			summary text,
			thumbnail text,
			file_path text,
			seen_at text,
			updated_at text NOT NULL
		)
	`);
	await database.execute(`
		CREATE VIRTUAL TABLE items_fts USING fts5(
			title,
			description,
			body_text,
			ocr_text,
			summary,
			content='items',
			content_rowid='rowid'
		)
	`);
	await database.execute(`
		CREATE TRIGGER items_fts_after_insert AFTER INSERT ON items BEGIN
			INSERT INTO items_fts (rowid, title, description, body_text, ocr_text, summary)
			VALUES (new.rowid, new.title, new.description, new.body_text, new.ocr_text, new.summary);
		END
	`);
	await database.execute(`
		CREATE TRIGGER items_fts_after_delete AFTER DELETE ON items BEGIN
			INSERT INTO items_fts (items_fts, rowid, title, description, body_text, ocr_text, summary)
			VALUES ('delete', old.rowid, old.title, old.description, old.body_text, old.ocr_text, old.summary);
		END
	`);
	await database.execute(`
		CREATE TRIGGER items_fts_after_update AFTER UPDATE ON items BEGIN
			INSERT INTO items_fts (items_fts, rowid, title, description, body_text, ocr_text, summary)
			VALUES ('delete', old.rowid, old.title, old.description, old.body_text, old.ocr_text, old.summary);
			INSERT INTO items_fts (rowid, title, description, body_text, ocr_text, summary)
			VALUES (new.rowid, new.title, new.description, new.body_text, new.ocr_text, new.summary);
		END
	`);
}

describe('createItemSearchService', () => {
	it('loads the database lazily and executes item FTS searches through it', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		let loads = 0;
		const executor: SearchExecutor = {
			async select<T>(sql: string, params: unknown[]): Promise<T[]> {
				calls.push({ sql, params });
				return [
					{
						id: 'item-3',
						item_type: 'article',
						source_url: null,
						normalized_url: null,
						title: 'BM25 runtime wiring',
						description: null,
						body_text: 'FTS5 result',
						ocr_text: null,
						summary: null,
						thumbnail: null,
						file_path: null,
						seen_at: '2026-06-03T10:00:00Z',
						updated_at: '2026-06-03T10:00:00Z',
						rank: -0.75
					}
				] as T[];
			}
		};

		const service = createItemSearchService({
			getDatabase: async () => {
				loads += 1;
				return executor;
			}
		});

		const first = await service.search({ query: 'runtime' });
		const second = await service.search({ query: 'fts5', limit: 2, offset: 1 });

		expect(loads).toBe(2);
		expect(calls).toHaveLength(2);
		expect(calls[0].params).toEqual(['runtime', 20, 0]);
		expect(calls[1].params).toEqual(['fts5', 2, 1]);
		expect(first).toEqual([
			expect.objectContaining({
				id: 'item-3',
				itemType: 'article',
				rank: -0.75
			})
		]);
		expect(second).toEqual([
			expect.objectContaining({
				id: 'item-3',
				itemType: 'article',
				rank: -0.75
			})
		]);
	});
});
