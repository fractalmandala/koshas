import { describe, expect, it } from 'vitest';

import { initializeGroupStorage, type GroupStorageExecutor } from './storage';

class RecordingExecutor implements GroupStorageExecutor {
	executed: Array<{ sql: string; params: unknown[] }> = [];

	async execute(sql: string, params: unknown[] = []): Promise<void> {
		this.executed.push({ sql, params });
	}
}

describe('initializeGroupStorage', () => {
	it('creates group persistence tables and seeds default special groups', async () => {
		const executor = new RecordingExecutor();

		await initializeGroupStorage(executor, { now: '2026-06-03T00:00:00.000Z' });

		const statements = executor.executed.map((entry) => entry.sql);
		expect(statements.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS groups'))).toBe(true);
		expect(statements.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS item_groups'))).toBe(true);
		expect(statements.some((sql) => sql.includes('item_groups_item_id_idx'))).toBe(true);
		expect(statements.some((sql) => sql.includes('item_groups_group_id_idx'))).toBe(true);
		expect(statements.filter((sql) => sql.includes('INSERT INTO groups'))).toHaveLength(2);
	});
});
