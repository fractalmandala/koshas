import { describe, expect, it } from 'vitest';

import {
	persistBrowserImportCandidates,
	runBrowserImport,
	type BrowserImportCandidate,
	type SqlExecutor
} from './browser';

class RecordingExecutor implements SqlExecutor {
	selectRows: unknown[][] = [];
	executed: Array<{ sql: string; params: unknown[] }> = [];

	constructor(selectRows: unknown[][] = []) {
		this.selectRows = selectRows;
	}

	async select<T = unknown>(_sql: string, _params: unknown[]): Promise<T[]> {
		return (this.selectRows.shift() ?? []) as T[];
	}

	async execute(sql: string, params: unknown[]): Promise<void> {
		this.executed.push({ sql, params });
	}
}

const candidate: BrowserImportCandidate = {
	sourceType: 'browser_history',
	sourceUrl: 'http://example.com/?utm_source=x',
	normalizedUrl: 'https://example.com',
	title: 'Example',
	sourceName: 'Chrome',
	sourceId: '42',
	lastSeenAt: 13411699200000000
};

describe('persistBrowserImportCandidates', () => {
	it('inserts a new item and source when no normalized URL exists', async () => {
		const executor = new RecordingExecutor([[]]);

		const result = await persistBrowserImportCandidates(executor, [candidate], {
			now: '2026-06-03T00:00:00.000Z',
			createId: () => 'new-id'
		});

		expect(result).toEqual({ inserted: 1, merged: 0, sourcesUpserted: 1 });
		expect(executor.executed[0].sql).toContain('INSERT INTO items');
		expect(executor.executed[0].params).toContain('new-id');
		expect(executor.executed[0].params).toContain('https://example.com');
		expect(executor.executed[1].sql).toContain('INSERT INTO sources');
		expect(executor.executed[1].params).toContain('browser_history');
	});

	it('merges into an existing item for the same normalized URL', async () => {
		const executor = new RecordingExecutor([[{ id: 'existing-id' }]]);

		const result = await persistBrowserImportCandidates(executor, [candidate], {
			now: '2026-06-03T00:00:00.000Z',
			createId: () => 'unused-id'
		});

		expect(result).toEqual({ inserted: 0, merged: 1, sourcesUpserted: 1 });
		expect(executor.executed[0].sql).toContain('UPDATE items');
		expect(executor.executed[0].params).toContain('existing-id');
		expect(executor.executed[1].params).toContain('existing-id');
	});

	it('deduplicates repeated candidates within the same import batch', async () => {
		const executor = new RecordingExecutor([[]]);
		const duplicate = { ...candidate };

		const result = await persistBrowserImportCandidates(executor, [candidate, duplicate], {
			now: '2026-06-03T00:00:00.000Z',
			createId: () => 'new-id'
		});

		expect(result).toEqual({ inserted: 1, merged: 0, sourcesUpserted: 1 });
		expect(executor.executed.filter((entry) => entry.sql.includes('INSERT INTO sources'))).toHaveLength(1);
	});

	it('merges repeated normalized URLs while preserving distinct source identities', async () => {
		const executor = new RecordingExecutor([[]]);
		const bookmarkCandidate: BrowserImportCandidate = {
			...candidate,
			sourceType: 'browser_bookmark',
			sourceId: 'bookmark-42'
		};

		const result = await persistBrowserImportCandidates(executor, [candidate, bookmarkCandidate], {
			now: '2026-06-03T00:00:00.000Z',
			createId: () => 'new-id'
		});

		expect(result).toEqual({ inserted: 1, merged: 0, sourcesUpserted: 2 });
		const sourceWrites = executor.executed.filter((entry) => entry.sql.includes('INSERT INTO sources'));
		expect(sourceWrites).toHaveLength(2);
		expect(sourceWrites[0].params).toContain('browser_history');
		expect(sourceWrites[1].params).toContain('browser_bookmark');
	});

	it('classifies imported items after persistence', async () => {
		const executor = new RecordingExecutor([
			[],
			[
				{
					id: 'group-docs',
					name: 'Docs',
					description: null,
					whitelist: JSON.stringify([{ type: 'domain', target: 'url', value: 'example.com' }]),
					blacklist: JSON.stringify([]),
					preferred_browser: null,
					is_built_in: 0,
					is_special: 0,
					sort_order: 10
				},
				{
					id: 'other',
					name: 'Other',
					description: null,
					whitelist: JSON.stringify([]),
					blacklist: JSON.stringify([]),
					preferred_browser: null,
					is_built_in: 1,
					is_special: 1,
					sort_order: 1000
				}
			],
			[]
		]);

		await persistBrowserImportCandidates(executor, [candidate], {
			now: '2026-06-03T00:00:00.000Z',
			createId: () => 'new-id'
		});

		expect(executor.executed.some((entry) => entry.sql.includes('INSERT INTO item_groups'))).toBe(true);
		expect(executor.executed.at(-1)?.params).toEqual([
			'new-id',
			'group-docs',
			'rule',
			'2026-06-03T00:00:00.000Z',
			'2026-06-03T00:00:00.000Z'
		]);
	});

	it('does not re-import tombstoned normalized URLs', async () => {
		const executor = new RecordingExecutor([[{ id: null, tombstoned: 'https://example.com' }]]);

		const result = await persistBrowserImportCandidates(executor, [candidate], {
			now: '2026-06-03T00:00:00.000Z',
			createId: () => 'new-id'
		});

		expect(result).toEqual({ inserted: 0, merged: 0, sourcesUpserted: 0 });
		expect(executor.executed).toHaveLength(0);
	});
});

describe('runBrowserImport', () => {
	it('invokes the Tauri import command and persists returned candidates', async () => {
		const executor = new RecordingExecutor([[]]);
		const invoked: Array<{ command: string; args?: Record<string, unknown> }> = [];

		const result = await runBrowserImport(
			{
				invoke: async (command, args) => {
					invoked.push({ command, args });
					return { importedCount: 1, candidates: [candidate] } as never;
				},
				getDatabase: async () => executor as never,
				createId: () => 'stable-id',
				now: () => '2026-06-03T00:00:00.000Z'
			},
			{
				browserName: 'Chrome',
				profileName: 'Default',
				historyPath: '/tmp/History',
				bookmarksPath: '/tmp/Bookmarks',
				exists: true,
				browserRunning: false
			},
			2026
		);

		expect(invoked[0]).toMatchObject({
			command: 'import_browser_history',
			args: {
				request: {
					browserName: 'Chrome',
					historyPath: '/tmp/History',
					bookmarksPath: '/tmp/Bookmarks',
					currentYear: 2026
				}
			}
		});
		expect(result).toEqual({ importedCount: 1, inserted: 1, merged: 0, sourcesUpserted: 1 });
	});
});
