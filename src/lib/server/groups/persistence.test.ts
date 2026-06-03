import { describe, expect, it } from 'vitest';

import { BUILT_IN_GROUPS, type GroupableItem } from './rules';
import {
	ensureDefaultGroups,
	saveGroupDefinition,
	reclassifyItemGroups,
	type GroupPersistenceExecutor
} from './persistence';

class RecordingExecutor implements GroupPersistenceExecutor {
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

const item: GroupableItem = {
	id: 'item-1',
	url: 'https://developer.apple.com/documentation/swiftui/view',
	title: 'SwiftUI View documentation',
	description: 'Reference material for macOS interface development.'
};

describe('ensureDefaultGroups', () => {
	it('upserts Starred and Other special groups', async () => {
		const executor = new RecordingExecutor();

		await ensureDefaultGroups(executor, { now: '2026-06-03T00:00:00.000Z' });

		expect(executor.executed).toHaveLength(2);
		expect(executor.executed[0].sql).toContain('INSERT INTO groups');
		expect(executor.executed[0].params).toEqual([
			BUILT_IN_GROUPS.starred.id,
			BUILT_IN_GROUPS.starred.name,
			BUILT_IN_GROUPS.starred.description,
			JSON.stringify(BUILT_IN_GROUPS.starred.whitelist),
			JSON.stringify(BUILT_IN_GROUPS.starred.blacklist),
			null,
			true,
			true,
			0,
			'2026-06-03T00:00:00.000Z',
			'2026-06-03T00:00:00.000Z'
		]);
		expect(executor.executed[1].params[0]).toBe(BUILT_IN_GROUPS.other.id);
	});
});

describe('reclassifyItemGroups', () => {
	it('replaces rule assignments from current group rules and keeps manual overrides untouched', async () => {
		const executor = new RecordingExecutor([
			[
				{
					id: 'group-docs',
					name: 'Docs',
					description: null,
					whitelist: JSON.stringify([{ type: 'domain', target: 'url', value: 'apple.com' }]),
					blacklist: JSON.stringify([{ type: 'keyword', target: 'all', value: 'deprecated' }]),
					preferred_browser: null,
					is_built_in: 0,
					is_special: 0,
					sort_order: 10
				},
				{
					id: BUILT_IN_GROUPS.other.id,
					name: BUILT_IN_GROUPS.other.name,
					description: BUILT_IN_GROUPS.other.description,
					whitelist: JSON.stringify(BUILT_IN_GROUPS.other.whitelist),
					blacklist: JSON.stringify(BUILT_IN_GROUPS.other.blacklist),
					preferred_browser: null,
					is_built_in: 1,
					is_special: 1,
					sort_order: 1000
				}
			],
			[{ group_id: 'group-docs', assignment_type: 'manualExclude' }]
		]);

		const result = await reclassifyItemGroups(executor, item, {
			now: '2026-06-03T00:00:00.000Z'
		});

		expect(result.assignments).toEqual([{ groupId: BUILT_IN_GROUPS.other.id, assignmentType: 'rule' }]);
		expect(result.exclusions).toEqual([{ groupId: 'group-docs', assignmentType: 'manualExclude' }]);
		expect(executor.executed[0]).toMatchObject({
			params: ['item-1', 'rule']
		});
		expect(executor.executed[0].sql).toContain('DELETE FROM item_groups');
		expect(executor.executed[0].sql).not.toContain('manualExclude');
		expect(executor.executed[1].sql).toContain('INSERT INTO item_groups');
		expect(executor.executed[1].params).toEqual([
			'item-1',
			BUILT_IN_GROUPS.other.id,
			'rule',
			'2026-06-03T00:00:00.000Z',
			'2026-06-03T00:00:00.000Z'
		]);
	});

	it('preserves manual includes over blacklist matches during reclassification', async () => {
		const executor = new RecordingExecutor([
			[
				{
					id: 'group-docs',
					name: 'Docs',
					description: null,
					whitelist: JSON.stringify([{ type: 'domain', target: 'url', value: 'apple.com' }]),
					blacklist: JSON.stringify([{ type: 'keyword', target: 'all', value: 'deprecated' }]),
					preferred_browser: null,
					is_built_in: 0,
					is_special: 0,
					sort_order: 10
				}
			],
			[{ group_id: 'group-docs', assignment_type: 'manualInclude' }]
		]);

		const result = await reclassifyItemGroups(
			executor,
			{ ...item, title: 'Deprecated SwiftUI View documentation' },
			{ now: '2026-06-03T00:00:00.000Z' }
		);

		expect(result.assignments).toEqual([{ groupId: 'group-docs', assignmentType: 'manualInclude' }]);
		expect(executor.executed).toHaveLength(1);
		expect(executor.executed[0]).toMatchObject({
			params: ['item-1', 'rule']
		});
	});
});

describe('saveGroupDefinition', () => {
	it('upserts rule changes and reclassifies affected items', async () => {
		const executor = new RecordingExecutor([
			[
				{
					id: 'group-docs',
					name: 'Docs',
					description: null,
					whitelist: JSON.stringify([{ type: 'domain', target: 'url', value: 'apple.com' }]),
					blacklist: JSON.stringify([]),
					preferred_browser: null,
					is_built_in: 0,
					is_special: 0,
					sort_order: 10
				},
				{
					id: BUILT_IN_GROUPS.other.id,
					name: BUILT_IN_GROUPS.other.name,
					description: BUILT_IN_GROUPS.other.description,
					whitelist: JSON.stringify(BUILT_IN_GROUPS.other.whitelist),
					blacklist: JSON.stringify(BUILT_IN_GROUPS.other.blacklist),
					preferred_browser: null,
					is_built_in: 1,
					is_special: 1,
					sort_order: 1000
				}
			],
			[]
		]);

		const results = await saveGroupDefinition(
			executor,
			{
				id: 'group-docs',
				name: 'Docs',
				description: null,
				whitelist: [{ type: 'domain', target: 'url', value: 'apple.com' }],
				blacklist: [],
				sortOrder: 10
			},
			[item],
			{ now: '2026-06-03T00:00:00.000Z' }
		);

		expect(executor.executed[0].sql).toContain('INSERT INTO groups');
		expect(executor.executed[0].params).toEqual([
			'group-docs',
			'Docs',
			null,
			JSON.stringify([{ type: 'domain', target: 'url', value: 'apple.com' }]),
			JSON.stringify([]),
			null,
			false,
			false,
			10,
			'2026-06-03T00:00:00.000Z',
			'2026-06-03T00:00:00.000Z'
		]);
		expect(results[0].assignments).toContainEqual({ groupId: 'group-docs', assignmentType: 'rule' });
		expect(executor.executed.some((entry) => entry.sql.includes('DELETE FROM item_groups'))).toBe(true);
	});
});
