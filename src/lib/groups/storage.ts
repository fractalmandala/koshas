import { ensureDefaultGroups, type GroupPersistenceOptions } from './persistence';

export interface GroupStorageExecutor {
	execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export async function initializeGroupStorage(
	executor: GroupStorageExecutor,
	options: GroupPersistenceOptions = {}
): Promise<void> {
	await executor.execute(`
		CREATE TABLE IF NOT EXISTS groups (
			id text PRIMARY KEY NOT NULL,
			name text NOT NULL,
			description text,
			whitelist text DEFAULT '[]' NOT NULL,
			blacklist text DEFAULT '[]' NOT NULL,
			preferred_browser text,
			is_built_in integer DEFAULT false NOT NULL,
			is_special integer DEFAULT false NOT NULL,
			sort_order integer DEFAULT 0 NOT NULL,
			created_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
			updated_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
		)
	`);
	await executor.execute('CREATE UNIQUE INDEX IF NOT EXISTS groups_name_unique ON groups (name)');
	await executor.execute('CREATE INDEX IF NOT EXISTS groups_sort_order_idx ON groups (sort_order)');
	await executor.execute('CREATE INDEX IF NOT EXISTS groups_is_special_idx ON groups (is_special)');
	await executor.execute(`
		CREATE TABLE IF NOT EXISTS item_groups (
			item_id text NOT NULL,
			group_id text NOT NULL,
			assignment_type text NOT NULL,
			created_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
			updated_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
			PRIMARY KEY (item_id, group_id, assignment_type),
			FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE cascade,
			FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE cascade
		)
	`);
	await executor.execute('CREATE INDEX IF NOT EXISTS item_groups_item_id_idx ON item_groups (item_id)');
	await executor.execute('CREATE INDEX IF NOT EXISTS item_groups_group_id_idx ON item_groups (group_id)');
	await ensureDefaultGroups(
		{
			execute: (sql, params) => executor.execute(sql, params)
		},
		options
	);
}
