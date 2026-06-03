import { describe, expect, it } from 'vitest';

import { parseKoshasAddUrl, persistProtocolCapture, type ProtocolSqlExecutor } from './deep-link';

class RecordingExecutor implements ProtocolSqlExecutor {
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

describe('parseKoshasAddUrl', () => {
	it('parses encoded add protocol captures', () => {
		const capture = parseKoshasAddUrl(
			'koshas://add?url=https%3A%2F%2Fexample.com%2Farticle%3Futm_source%3Dx&title=Example&selection=Highlighted'
		);

		expect(capture).toEqual({
			url: 'https://example.com/article?utm_source=x',
			normalizedUrl: 'https://example.com/article',
			title: 'Example',
			selection: 'Highlighted'
		});
	});

	it('rejects non-add protocol links and malformed target URLs', () => {
		expect(parseKoshasAddUrl('koshas://item/item-1')).toBeNull();
		expect(parseKoshasAddUrl('https://example.com')).toBeNull();
		expect(parseKoshasAddUrl('koshas://add?url=localhost')).toBeNull();
	});
});

describe('persistProtocolCapture', () => {
	it('inserts a new extension item and source for a capture', async () => {
		const executor = new RecordingExecutor([[]]);

		const result = await persistProtocolCapture(
			executor,
			{
				url: 'https://example.com/article',
				normalizedUrl: 'https://example.com/article',
				title: 'Example',
				selection: 'Selected text'
			},
			{ createId: () => 'item-1', now: '2026-06-03T00:00:00.000Z' }
		);

		expect(result).toEqual({ itemId: 'item-1', inserted: true, merged: false });
		expect(executor.executed[0].sql).toContain('INSERT INTO items');
		expect(executor.executed[0].params).toEqual([
			'item-1',
			'bookmark',
			'https://example.com/article',
			'https://example.com/article',
			'Example',
			JSON.stringify({ selection: 'Selected text' }),
			true,
			'2026-06-03T00:00:00.000Z',
			'2026-06-03T00:00:00.000Z'
		]);
		expect(executor.executed[1].sql).toContain('INSERT INTO sources');
		expect(executor.executed[1].params[2]).toBe('extension');
	});

	it('merges into an existing normalized URL without overwriting user-edited title', async () => {
		const executor = new RecordingExecutor([[{ id: 'existing-1' }]]);

		const result = await persistProtocolCapture(
			executor,
			{
				url: 'https://example.com/article',
				normalizedUrl: 'https://example.com/article',
				title: 'New title',
				selection: ''
			},
			{ createId: () => 'ignored', now: '2026-06-03T00:00:00.000Z' }
		);

		expect(result).toEqual({ itemId: 'existing-1', inserted: false, merged: true });
		expect(executor.executed[0].sql).toContain('UPDATE items');
		expect(executor.executed[0].params).toEqual([
			'https://example.com/article',
			'New title',
			'New title',
			'2026-06-03T00:00:00.000Z',
			'existing-1'
		]);
		expect(executor.executed[1].params[0]).toBe('extension:https://example.com/article');
	});

	it('does not re-create extension captures for tombstoned normalized URLs', async () => {
		const executor = new RecordingExecutor([[{ id: null, tombstoned: 'https://example.com/article' }]]);

		const result = await persistProtocolCapture(
			executor,
			{
				url: 'https://example.com/article',
				normalizedUrl: 'https://example.com/article',
				title: 'Example',
				selection: ''
			},
			{ createId: () => 'item-1', now: '2026-06-03T00:00:00.000Z' }
		);

		expect(result).toEqual({ itemId: null, inserted: false, merged: false, skipped: true });
		expect(executor.executed).toHaveLength(0);
	});
});
