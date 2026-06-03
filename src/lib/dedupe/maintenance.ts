export interface DedupeExecutor {
	select<T = unknown>(sql: string, params: unknown[]): Promise<T[]>;
	execute(sql: string, params: unknown[]): Promise<unknown>;
}

export interface MaintenanceDedupeOptions {
	now?: string;
}

export interface MaintenanceDedupeResult {
	groupsMerged: number;
	itemsDeleted: number;
}

interface DuplicateGroupRow {
	normalized_url: string;
}

interface DuplicateItemRow {
	id: string;
	normalized_url: string;
	source_url: string | null;
	title: string;
	description: string | null;
	thumbnail: string | null;
	title_user_edited: boolean | number;
	description_user_edited: boolean | number;
	thumbnail_user_edited: boolean | number;
	latest_source_seen_at: string | null;
}

const DEFAULT_NOW = () => new Date().toISOString();

export async function runMaintenanceDedupe(
	executor: DedupeExecutor,
	options: MaintenanceDedupeOptions = {}
): Promise<MaintenanceDedupeResult> {
	const now = options.now ?? DEFAULT_NOW();
	const duplicateGroups = await executor.select<DuplicateGroupRow>(
		`
			SELECT normalized_url
			FROM items
			WHERE normalized_url IS NOT NULL
			GROUP BY normalized_url
			HAVING COUNT(*) > 1
		`.trim(),
		[]
	);
	const result: MaintenanceDedupeResult = { groupsMerged: 0, itemsDeleted: 0 };

	for (const group of duplicateGroups) {
		const items = await getDuplicateItems(executor, group.normalized_url);
		if (items.length < 2) continue;

		const sorted = [...items].sort(compareMostRecentSource);
		const winner = sorted[0];
		const donors = sorted.slice(1);
		const freshest = sorted[0];

		await updateWinnerFromFreshest(executor, winner, freshest, now);

		for (const donor of donors) {
			await executor.execute('UPDATE sources SET item_id = ?, updated_at = ? WHERE item_id = ?', [
				winner.id,
				now,
				donor.id
			]);
			await executor.execute('DELETE FROM items WHERE id = ?', [donor.id]);
			result.itemsDeleted += 1;
		}

		result.groupsMerged += 1;
	}

	return result;
}

async function getDuplicateItems(
	executor: DedupeExecutor,
	normalizedUrl: string
): Promise<DuplicateItemRow[]> {
	return executor.select<DuplicateItemRow>(
		`
			SELECT
				items.id,
				items.normalized_url,
				items.source_url,
				items.title,
				items.description,
				items.thumbnail,
				items.title_user_edited,
				items.description_user_edited,
				items.thumbnail_user_edited,
				MAX(sources.last_seen_at) AS latest_source_seen_at
			FROM items
			LEFT JOIN sources ON sources.item_id = items.id
			WHERE items.normalized_url = ?
			GROUP BY items.id
		`.trim(),
		[normalizedUrl]
	);
}

function compareMostRecentSource(left: DuplicateItemRow, right: DuplicateItemRow): number {
	return sourceTime(right) - sourceTime(left);
}

function sourceTime(row: DuplicateItemRow): number {
	return Date.parse(row.latest_source_seen_at ?? '') || 0;
}

async function updateWinnerFromFreshest(
	executor: DedupeExecutor,
	winner: DuplicateItemRow,
	freshest: DuplicateItemRow,
	now: string
): Promise<void> {
	await executor.execute(
		`
			UPDATE items
			SET
				source_url = COALESCE(?, source_url),
				title = CASE WHEN title_user_edited = 0 AND ? != '' THEN ? ELSE title END,
				description = CASE WHEN description_user_edited = 0 THEN COALESCE(?, description) ELSE description END,
				thumbnail = CASE WHEN thumbnail_user_edited = 0 THEN COALESCE(?, thumbnail) ELSE thumbnail END,
				updated_at = ?
			WHERE id = ?
		`.trim(),
		[
			freshest.source_url,
			freshest.title,
			freshest.title,
			freshest.description,
			freshest.thumbnail,
			now,
			winner.id
		]
	);
}
