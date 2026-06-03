import { describe, expect, it } from 'vitest';

import { runMaintenanceDedupe, type DedupeExecutor } from './maintenance';

class RecordingExecutor implements DedupeExecutor {
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

describe('runMaintenanceDedupe', () => {
	it('merges duplicate normalized URLs into the item with the most recent source timestamp', async () => {
		const executor = new RecordingExecutor([
			[{ normalized_url: 'https://example.com' }],
			[
				{
					id: 'older',
					normalized_url: 'https://example.com',
					source_url: 'http://example.com',
					title: 'Old title',
					description: 'Old description',
					thumbnail: null,
					title_user_edited: 0,
					description_user_edited: 0,
					thumbnail_user_edited: 0,
					latest_source_seen_at: '2026-01-01T00:00:00.000Z'
				},
				{
					id: 'newer',
					normalized_url: 'https://example.com',
					source_url: 'https://example.com',
					title: 'New title',
					description: 'New description',
					thumbnail: 'https://example.com/og.png',
					title_user_edited: 0,
					description_user_edited: 0,
					thumbnail_user_edited: 0,
					latest_source_seen_at: '2026-06-03T00:00:00.000Z'
				}
			]
		]);

		const result = await runMaintenanceDedupe(executor, { now: '2026-06-03T10:00:00.000Z' });

		expect(result).toEqual({ groupsMerged: 1, itemsDeleted: 1 });
		expect(executor.executed[0]).toMatchObject({
			params: [
				'https://example.com',
				'New title',
				'New title',
				'New description',
				'https://example.com/og.png',
				'2026-06-03T10:00:00.000Z',
				'newer'
			]
		});
		expect(executor.executed[1]).toMatchObject({ params: ['newer', '2026-06-03T10:00:00.000Z', 'older'] });
		expect(executor.executed[2]).toMatchObject({ params: ['older'] });
	});
});
