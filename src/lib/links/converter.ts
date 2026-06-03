/**
 * Wikilink ↔ koshas://item/{uuid} conversion service.
 * Handles save-time conversion and open-time display conversion.
 */
import type { LinkReferencesExecutor } from './persistence';
import { createLinkReference } from './persistence';
import {
	extractWikilinks,
	replaceWikilinksWithProtocol,
	replaceProtocolWithWikilinks
} from './wikilink';

export interface WikilinkResolver {
	select<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Resolve a wikilink target to an item UUID.
 * - If the target is already a UUID, return it directly.
 * - If the target is a title, look it up in items and notes tables.
 * Returns null if unresolvable.
 */
export async function resolveWikilinkTarget(
	db: WikilinkResolver,
	target: string
): Promise<string | null> {
	// If it looks like a UUID, return it directly
	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (UUID_RE.test(target)) return target;

	// Look up by title in items table
	const itemRows: Array<{ id: string }> = await db.select(
		`SELECT id FROM items WHERE title = ? LIMIT 1`,
		[target]
	);
	if (itemRows.length > 0) return itemRows[0].id;

	// Look up by title in notes table (via items join)
	const noteRows = (await db.select(
		`SELECT n.item_id as id FROM notes n
		 JOIN items i ON i.id = n.item_id
		 WHERE i.title = ? LIMIT 1`,
		[target]
	)) as Array<{ id: string }>;
	if (noteRows.length > 0) return noteRows[0].id;

	// Try case-insensitive fallback
	const ciItemRows = (await db.select(
		`SELECT id FROM items WHERE LOWER(title) = LOWER(?) LIMIT 1`,
		[target]
	)) as Array<{ id: string }>;
	if (ciItemRows.length > 0) return ciItemRows[0].id;

	const ciNoteRows = (await db.select(
		`SELECT n.item_id as id FROM notes n
		 JOIN items i ON i.id = n.item_id
		 WHERE LOWER(i.title) = LOWER(?) LIMIT 1`,
		[target]
	)) as Array<{ id: string }>;
	if (ciNoteRows.length > 0) return ciNoteRows[0].id;

	return null;
}

/**
 * Get the item_id associated with a note file path.
 */
export async function getItemIdForPath(
	db: WikilinkResolver,
	filePath: string
): Promise<string | null> {
	const rows = (await db.select(
		`SELECT item_id FROM notes WHERE file_path = ? LIMIT 1`,
		[filePath]
	)) as Array<{ item_id: string }>;
	return rows.length > 0 ? rows[0].item_id : null;
}

/**
 * Scan content for [[wikilinks]], resolve them, store in link_references,
 * and return content with wikilinks converted to koshas://item/{uuid} format.
 *
 * @param db - database executor
 * @param linkDb - link_references executor (can be same as db)
 * @param sourceItemId - the UUID of the item/note containing the wikilinks
 * @param content - the markdown content to scan
 * @returns the converted content
 */
export async function convertWikilinksOnSave(
	db: WikilinkResolver,
	linkDb: LinkReferencesExecutor,
	sourceItemId: string,
	content: string
): Promise<string> {
	const matches = extractWikilinks(content);

	for (const match of matches) {
		if (match.isUuid) {
			// Direct UUID reference — store link_reference immediately
			await createLinkReference(linkDb, {
				sourceItemId,
				targetItemId: match.target,
				referenceType: 'wikilink'
			}).catch(() => {}); // Ignore duplicates
		} else {
			// Title-based reference — resolve then store
			const resolvedUuid = await resolveWikilinkTarget(db, match.target);
			if (resolvedUuid) {
				await createLinkReference(linkDb, {
					sourceItemId,
					targetItemId: resolvedUuid,
					referenceType: 'wikilink'
				}).catch(() => {});
			}
		}
	}

	// Now replace wikilinks with koshas://item/{uuid} links
	const { content: converted } = await replaceWikilinksWithProtocol(
		content,
		async (target: string) => {
			if (/^[0-9a-f-]{36}$/i.test(target)) return target;
			return resolveWikilinkTarget(db, target);
		}
	);

	return converted;
}

/**
 * Convert koshas://item/{uuid} URLs back to [[wikilink]] display format.
 * Resolves UUIDs to titles when possible.
 *
 * @param db - database executor for title resolution
 * @param content - content with koshas:// links
 * @returns content with wikilink display format
 */
export async function convertProtocolLinksOnOpen(
	db: WikilinkResolver,
	content: string
): Promise<string> {
	const UUID_IN_URL_RE = /koshas:\/\/item\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

	// Collect all UUIDs to resolve
	const uuids = new Set<string>();
	let m: RegExpExecArray | null;
	while ((m = UUID_IN_URL_RE.exec(content)) !== null) {
		uuids.add(m[1]);
	}

	// Resolve all UUIDs to titles
	const titleMap = new Map<string, string | null>();
	for (const uuid of uuids) {
		try {
			const rows = (await db.select(
				`SELECT COALESCE(title, '') as title FROM items WHERE id = ? LIMIT 1`,
				[uuid]
			)) as Array<{ title: string }>;
			titleMap.set(uuid, rows.length > 0 ? (rows[0].title || null) : null);
		} catch {
			titleMap.set(uuid, null);
		}
	}

	return replaceProtocolWithWikilinks(content, (uuid: string) => {
		return titleMap.get(uuid) ?? null;
	});
}

/**
 * Full save pipeline: write file, then convert and persist wikilinks.
 */
export async function saveWithWikilinkConversion(
	db: WikilinkResolver,
	linkDb: LinkReferencesExecutor,
	filePath: string,
	content: string,
	writeFileFn: (path: string, content: string) => Promise<void>
): Promise<void> {
	// First, get the source item ID
	const sourceItemId = await getItemIdForPath(db, filePath);

	if (!sourceItemId) {
		// No associated item — write file as-is
		await writeFileFn(filePath, content);
		return;
	}

	// Convert wikilinks in content
	const converted = await convertWikilinksOnSave(db, linkDb, sourceItemId, content);

	// Write the converted content to disk
	await writeFileFn(filePath, converted);
}
