/**
 * Serendipity Mode engine.
 * Suggests random unvisited items from the knowledge base,
 * weighted toward recently-added but never-seen items.
 */

export interface SerendipityExecutor {
	select<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
	execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface SerendipitySuggestion {
	id: string;
	title: string;
	description: string;
	type: string;
	dateAdded: string;
}

const FORGOTTEN_SENTINEL = '9999-12-31T23:59:59.000Z';

/**
 * Get the cooldown duration in hours (default: 4).
 * Can be made configurable via preferences in M4.
 */
function getCooldownHours(): number {
	return 4;
}

/**
 * Pick a random unvisited item, weighted toward recently-added ones.
 * Returns null if no eligible items.
 */
export async function getSuggestion(
	db: SerendipityExecutor
): Promise<SerendipitySuggestion | null> {
	const cooldownHours = getCooldownHours();

	// Items eligible for serendipity:
	// - Not in deleted_items
	// - seen_at IS NULL OR seen_at < datetime('now', '-COOLDOWN hours')
	// - Not the forgotten sentinel value
	const rows = (await db.select(
		`SELECT i.id, COALESCE(i.title, 'Untitled') as title,
				COALESCE(i.description, '') as description,
				COALESCE(i.item_type, 'item') as type,
				i.created_at as date_added
		 FROM items i
		 WHERE (i.seen_at IS NULL OR i.seen_at < datetime('now', '-' || ? || ' hours'))
		   AND (i.seen_at IS NULL OR i.seen_at != ?)
		   AND i.id NOT IN (
		     SELECT n.item_id FROM notes n
		     WHERE n.file_path IN (SELECT file_path FROM deleted_items WHERE file_path IS NOT NULL)
		   )
		   AND i.normalized_url NOT IN (
		     SELECT normalized_url FROM deleted_items WHERE normalized_url IS NOT NULL
		   )
		 ORDER BY
		   CASE WHEN i.created_at >= datetime('now', '-7 days') THEN 0 ELSE 1 END,
		   RANDOM()
		 LIMIT 50`,
		[String(cooldownHours), FORGOTTEN_SENTINEL]
	)) as Array<{
		id: string;
		title: string;
		description: string;
		type: string;
		date_added: string;
	}>;

	if (rows.length === 0) return null;

	// Pick one at random from the top 50
	const pick = rows[Math.floor(Math.random() * Math.min(rows.length, 50))];
	return {
		id: pick.id,
		title: pick.title,
		description: pick.description,
		type: pick.type,
		dateAdded: pick.date_added
	};
}

/**
 * Record that the user "kept" (liked/wants to see again) this suggestion.
 * Sets seen_at to now, which means it won't be suggested again
 * until the cooldown expires.
 */
export async function recordKeep(db: SerendipityExecutor, itemId: string): Promise<void> {
	await db.execute(
		`UPDATE items SET seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
		[itemId]
	);
}

/**
 * Record that the user "forgot" (dismissed) this suggestion.
 * Sets seen_at to a far-future sentinel so it won't be suggested again.
 */
export async function recordForget(db: SerendipityExecutor, itemId: string): Promise<void> {
	await db.execute(
		`UPDATE items SET seen_at = ?, updated_at = datetime('now') WHERE id = ?`,
		[FORGOTTEN_SENTINEL, itemId]
	);
}

/**
 * Get the count of remaining eligible items for serendipity.
 */
export async function getRemainingCount(db: SerendipityExecutor): Promise<number> {
	const cooldownHours = getCooldownHours();

	const rows = (await db.select(
		`SELECT COUNT(*) as count
		 FROM items i
		 WHERE (i.seen_at IS NULL OR i.seen_at < datetime('now', '-' || ? || ' hours'))
		   AND (i.seen_at IS NULL OR i.seen_at != ?)
		   AND i.id NOT IN (
		     SELECT n.item_id FROM notes n
		     WHERE n.file_path IN (SELECT file_path FROM deleted_items WHERE file_path IS NOT NULL)
		   )
		   AND i.normalized_url NOT IN (
		     SELECT normalized_url FROM deleted_items WHERE normalized_url IS NOT NULL
		   )`,
		[String(cooldownHours), FORGOTTEN_SENTINEL]
	)) as Array<{ count: number }>;

	return Number(rows[0]?.count ?? 0);
}
