import {
	BUILT_IN_GROUPS,
	classifyItemForGroups,
	type GroupDefinition,
	type GroupRule,
	type GroupableItem,
	type GroupsClassification,
	type ManualAssignmentMap
} from './rules';

export interface GroupPersistenceExecutor {
	select<T = unknown>(sql: string, params: unknown[]): Promise<T[]>;
	execute(sql: string, params: unknown[]): Promise<unknown>;
}

export type GroupPersistenceWriter = Pick<GroupPersistenceExecutor, 'execute'>;

export interface GroupPersistenceOptions {
	now?: string;
}

interface GroupRow {
	id: string;
	name: string;
	description: string | null;
	whitelist: unknown;
	blacklist: unknown;
	preferred_browser: string | null;
	is_built_in: boolean | number;
	is_special: boolean | number;
	sort_order: number;
}

interface ItemGroupRow {
	group_id: string;
	assignment_type: 'manualInclude' | 'manualExclude';
}

const DEFAULT_NOW = () => new Date().toISOString();

export async function ensureDefaultGroups(
	executor: GroupPersistenceWriter,
	options: GroupPersistenceOptions = {}
): Promise<void> {
	const now = options.now ?? DEFAULT_NOW();
	const defaultGroups: GroupDefinition[] = [BUILT_IN_GROUPS.starred, BUILT_IN_GROUPS.other];

	for (const group of defaultGroups) {
		await executor.execute(
			`
				INSERT INTO groups (
					id,
					name,
					description,
					whitelist,
					blacklist,
					preferred_browser,
					is_built_in,
					is_special,
					sort_order,
					created_at,
					updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id)
				DO UPDATE SET
					name = excluded.name,
					description = excluded.description,
					whitelist = excluded.whitelist,
					blacklist = excluded.blacklist,
					preferred_browser = excluded.preferred_browser,
					is_built_in = excluded.is_built_in,
					is_special = excluded.is_special,
					sort_order = excluded.sort_order,
					updated_at = excluded.updated_at
			`.trim(),
			[
				group.id,
				group.name,
				group.description ?? null,
				JSON.stringify(group.whitelist),
				JSON.stringify(group.blacklist),
				group.preferredBrowser ?? null,
				group.isBuiltIn === true,
				group.isSpecial === true,
				group.sortOrder ?? 0,
				now,
				now
			]
		);
	}
}

export async function saveGroupDefinition(
	executor: GroupPersistenceExecutor,
	group: GroupDefinition,
	itemsToReclassify: readonly GroupableItem[] = [],
	options: GroupPersistenceOptions = {}
): Promise<GroupsClassification[]> {
	const now = options.now ?? DEFAULT_NOW();

	await executor.execute(
		`
			INSERT INTO groups (
				id,
				name,
				description,
				whitelist,
				blacklist,
				preferred_browser,
				is_built_in,
				is_special,
				sort_order,
				created_at,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id)
			DO UPDATE SET
				name = excluded.name,
				description = excluded.description,
				whitelist = excluded.whitelist,
				blacklist = excluded.blacklist,
				preferred_browser = excluded.preferred_browser,
				is_built_in = excluded.is_built_in,
				is_special = excluded.is_special,
				sort_order = excluded.sort_order,
				updated_at = excluded.updated_at
		`.trim(),
		[
			group.id,
			group.name,
			group.description ?? null,
			JSON.stringify(group.whitelist),
			JSON.stringify(group.blacklist),
			group.preferredBrowser ?? null,
			group.isBuiltIn === true,
			group.isSpecial === true,
			group.sortOrder ?? 0,
			now,
			now
		]
	);

	return reclassifyItemsForRuleChange(executor, itemsToReclassify, options);
}

export async function reclassifyItemGroups(
	executor: GroupPersistenceExecutor,
	item: GroupableItem,
	options: GroupPersistenceOptions = {}
): Promise<GroupsClassification> {
	const now = options.now ?? DEFAULT_NOW();
	const groups = await getGroupsForClassification(executor);
	const manualAssignments = await getManualAssignmentsForItem(executor, item.id);
	const classification = classifyItemForGroups(item, groups, manualAssignments);
	const ruleAssignments = classification.assignments.filter((assignment) => assignment.assignmentType === 'rule');

	await executor.execute('DELETE FROM item_groups WHERE item_id = ? AND assignment_type = ?', [item.id, 'rule']);

	for (const assignment of ruleAssignments) {
		await executor.execute(
			`
				INSERT INTO item_groups (
					item_id,
					group_id,
					assignment_type,
					created_at,
					updated_at
				)
				VALUES (?, ?, ?, ?, ?)
				ON CONFLICT(item_id, group_id, assignment_type)
				DO UPDATE SET updated_at = excluded.updated_at
			`.trim(),
			[item.id, assignment.groupId, assignment.assignmentType, now, now]
		);
	}

	return classification;
}

export async function classifyImportedItemGroups(
	executor: GroupPersistenceExecutor,
	item: GroupableItem,
	options: GroupPersistenceOptions = {}
): Promise<GroupsClassification> {
	await ensureDefaultGroups(executor, options);
	return reclassifyItemGroups(executor, item, options);
}

export async function reclassifyItemsForRuleChange(
	executor: GroupPersistenceExecutor,
	items: readonly GroupableItem[],
	options: GroupPersistenceOptions = {}
): Promise<GroupsClassification[]> {
	await ensureDefaultGroups(executor, options);
	const results: GroupsClassification[] = [];

	for (const item of items) {
		results.push(await reclassifyItemGroups(executor, item, options));
	}

	return results;
}

export async function getGroupsForClassification(executor: GroupPersistenceExecutor): Promise<GroupDefinition[]> {
	const rows = await executor.select<GroupRow>(
		`
			SELECT
				id,
				name,
				description,
				whitelist,
				blacklist,
				preferred_browser,
				is_built_in,
				is_special,
				sort_order
			FROM groups
			ORDER BY sort_order, name
		`.trim(),
		[]
	);

	return rows.map(rowToGroupDefinition);
}

export async function getManualAssignmentsForItem(
	executor: GroupPersistenceExecutor,
	itemId: string
): Promise<ManualAssignmentMap> {
	const rows = await executor.select<ItemGroupRow>(
		`
			SELECT group_id, assignment_type
			FROM item_groups
			WHERE item_id = ?
				AND assignment_type IN ('manualInclude', 'manualExclude')
		`.trim(),
		[itemId]
	);
	const assignments: ManualAssignmentMap = {};

	for (const row of rows) {
		const existing = assignments[row.group_id];
		if (Array.isArray(existing)) {
			existing.push(row.assignment_type);
		} else if (existing) {
			assignments[row.group_id] = [existing, row.assignment_type];
		} else {
			assignments[row.group_id] = row.assignment_type;
		}
	}

	return assignments;
}

function rowToGroupDefinition(row: GroupRow): GroupDefinition {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		whitelist: parseRules(row.whitelist),
		blacklist: parseRules(row.blacklist),
		preferredBrowser: row.preferred_browser,
		isBuiltIn: Boolean(row.is_built_in),
		isSpecial: Boolean(row.is_special),
		sortOrder: row.sort_order
	};
}

function parseRules(value: unknown): GroupRule[] {
	const parsed = typeof value === 'string' ? safeJsonParse(value) : value;
	if (!Array.isArray(parsed)) return [];

	return parsed.filter(isGroupRule);
}

function safeJsonParse(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return [];
	}
}

function isGroupRule(value: unknown): value is GroupRule {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;

	return (
		(candidate.type === 'domain' || candidate.type === 'keyword' || candidate.type === 'substring') &&
		(candidate.target === 'url' ||
			candidate.target === 'title' ||
			candidate.target === 'description' ||
			candidate.target === 'all') &&
		typeof candidate.value === 'string'
	);
}
