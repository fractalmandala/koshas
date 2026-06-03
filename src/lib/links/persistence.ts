export interface LinkReferencesExecutor {
	select<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
	execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export type ReferenceType = 'wikilink' | 'explicit' | 'auto_detected';

export interface LinkReference {
	id: string;
	sourceItemId: string;
	targetItemId: string;
	referenceType: ReferenceType | null;
	createdAt: string;
	updatedAt: string;
	sourceTitle?: string;
	sourceItemType?: string;
}

export interface LinkReferenceInput {
	sourceItemId: string;
	targetItemId: string;
	referenceType: ReferenceType;
}

function mapLinkReference(row: Record<string, unknown>): LinkReference {
	return {
		id: row.id as string,
		sourceItemId: row.source_item_id as string,
		targetItemId: row.target_item_id as string,
		referenceType: (row.reference_type as ReferenceType) ?? null,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
		sourceTitle: row.source_title as string | undefined,
		sourceItemType: row.source_item_type as string | undefined
	};
}

/**
 * Create a single link reference between two items.
 * Dedupes by (sourceItemId, targetItemId, referenceType).
 */
export async function createLinkReference(
	executor: LinkReferencesExecutor,
	input: LinkReferenceInput
): Promise<LinkReference> {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	await executor.execute(
		`INSERT OR IGNORE INTO link_references (id, source_item_id, target_item_id, reference_type, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		[id, input.sourceItemId, input.targetItemId, input.referenceType, now, now]
	);

	const rows = await executor.select<Record<string, unknown>>(
		`SELECT * FROM link_references WHERE source_item_id = ? AND target_item_id = ? AND reference_type = ?`,
		[input.sourceItemId, input.targetItemId, input.referenceType]
	);

	return mapLinkReference(rows[0]);
}

/**
 * Delete a single link reference by source + target (any type).
 */
export async function deleteLinkReference(
	executor: LinkReferencesExecutor,
	sourceItemId: string,
	targetItemId: string
): Promise<void> {
	await executor.execute(
		`DELETE FROM link_references WHERE source_item_id = ? AND target_item_id = ?`,
		[sourceItemId, targetItemId]
	);
}

/**
 * Delete a specific link reference by id.
 */
export async function deleteLinkReferenceById(
	executor: LinkReferencesExecutor,
	id: string
): Promise<void> {
	await executor.execute(`DELETE FROM link_references WHERE id = ?`, [id]);
}

/**
 * Get all references where the given item is the source (outgoing links).
 */
export async function getReferencesBySource(
	executor: LinkReferencesExecutor,
	sourceItemId: string
): Promise<LinkReference[]> {
	const rows = await executor.select<Record<string, unknown>>(
		`SELECT * FROM link_references WHERE source_item_id = ?`,
		[sourceItemId]
	);
	return rows.map(mapLinkReference);
}

/**
 * Get all references where the given item is the target (incoming links / backlinks).
 * Joins with items table to include source title and type.
 */
export async function getBacklinksByTarget(
	executor: LinkReferencesExecutor,
	targetItemId: string
): Promise<LinkReference[]> {
	const rows = await executor.select<Record<string, unknown>>(
		`SELECT lr.*, i.title as source_title, i.item_type as source_item_type
		 FROM link_references lr
		 JOIN items i ON i.id = lr.source_item_id
		 WHERE lr.target_item_id = ?`,
		[targetItemId]
	);
	return rows.map(mapLinkReference).map((ref) => ({
		...ref
	}));
}

/**
 * Batch insert many link references at once (for initial link discovery).
 */
export async function batchInsertLinks(
	executor: LinkReferencesExecutor,
	links: LinkReferenceInput[]
): Promise<number> {
	let inserted = 0;
	const now = new Date().toISOString();

	for (const link of links) {
		try {
			const id = crypto.randomUUID();
			await executor.execute(
				`INSERT OR IGNORE INTO link_references (id, source_item_id, target_item_id, reference_type, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?)`,
				[id, link.sourceItemId, link.targetItemId, link.referenceType, now, now]
			);
			inserted++;
		} catch {
			// Skip duplicates silently
		}
	}

	return inserted;
}

/**
 * Get all link references (for graph building).
 */
export async function getAllLinkReferences(
	executor: LinkReferencesExecutor
): Promise<LinkReference[]> {
	const rows = await executor.select<Record<string, unknown>>(
		`SELECT * FROM link_references ORDER BY created_at`
	);
	return rows.map(mapLinkReference);
}

/**
 * Get the count of references for a specific item (both as source and target).
 */
export async function getReferenceCount(
	executor: LinkReferencesExecutor,
	itemId: string
): Promise<{ outgoing: number; incoming: number }> {
	const outgoingRows = await executor.select<{ count: number }>(
		`SELECT COUNT(*) as count FROM link_references WHERE source_item_id = ?`,
		[itemId]
	);
	const incomingRows = await executor.select<{ count: number }>(
		`SELECT COUNT(*) as count FROM link_references WHERE target_item_id = ?`,
		[itemId]
	);

	return {
		outgoing: Number(outgoingRows[0]?.count ?? 0),
		incoming: Number(incomingRows[0]?.count ?? 0)
	};
}
