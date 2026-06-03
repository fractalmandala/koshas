import { getInitializedDatabase } from '$lib/db';

export interface NoteSearchResult {
	id: string;
	itemId: string;
	noteId: string;
	title: string;
	filePath: string;
	notebookName: string;
	snippet: string;
	score: number;
}

/**
 * Wire up FTS5 for notes by ensuring the notes FTS virtual table exists.
 * Called lazily at query time.
 */
async function ensureNotesFts(): Promise<void> {
	const db = await getInitializedDatabase();

	// Create the FTS5 virtual table for notes if it doesn't exist
	await db.execute(`
		CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
			note_id UNINDEXED,
			notebook_id UNINDEXED,
			title,
			body_text,
			tokenize='porter unicode61'
		)
	`);

	// Create index for lookups if not exists
	try {
		await db.execute('CREATE INDEX IF NOT EXISTS notes_body_text_idx ON items (body_text)');
	} catch {
		// FTS5 might already cover this
	}
}

/**
 * Index a note into the FTS5 search index.
 */
export async function indexNoteForSearch(
	noteId: string,
	notebookId: string,
	title: string,
	bodyText: string
): Promise<void> {
	await ensureNotesFts();

	const db = await getInitializedDatabase();
	try {
		// Delete old entry if exists
		await db.execute('DELETE FROM notes_fts WHERE note_id = ?', [noteId]);
	} catch {
		// Table might not be fully set up yet
	}

	try {
		await db.execute(
			`INSERT INTO notes_fts (note_id, notebook_id, title, body_text)
			 VALUES (?, ?, ?, ?)`,
			[noteId, notebookId, title, bodyText]
		);
	} catch {
		// FTS5 might reject empty content
	}
}

/**
 * Remove a note from the FTS5 search index.
 */
export async function removeNoteFromSearch(noteId: string): Promise<void> {
	try {
		const db = await getInitializedDatabase();
		await db.execute('DELETE FROM notes_fts WHERE note_id = ?', [noteId]);
	} catch {
		// Ignore if FTS table doesn't exist yet
	}
}

/**
 * Search across notes using FTS5.
 * Falls back to LIKE search if FTS5 is not available.
 */
export async function searchNotes(query: string): Promise<NoteSearchResult[]> {
	if (!query.trim()) return [];

	await ensureNotesFts();
	const db = await getInitializedDatabase();

	const sanitized = query.trim().replace(/['"]/g, '');

	try {
		// Try FTS5 search first
		const rows = await db.select<Record<string, unknown>[]>(
			`SELECT
				n.id AS note_id,
				n.item_id,
				n.file_path,
				i.title,
				i.body_text,
				nb.name AS notebook_name,
				COALESCE(n.updated_at, n.created_at) AS recency
			FROM notes_fts fts
			JOIN notes n ON n.id = fts.note_id
			JOIN items i ON i.id = n.item_id
			JOIN notebooks nb ON nb.id = n.notebook_id
			WHERE notes_fts MATCH ?
			ORDER BY rank
			LIMIT 50`,
			[sanitized]
		);

		return rows.map((row) => {
			const bodyText = (row.body_text as string) || '';
			return {
				id: row.note_id as string,
				itemId: row.item_id as string,
				noteId: row.note_id as string,
				title: (row.title as string) || 'Untitled',
				filePath: row.file_path as string,
				notebookName: (row.notebook_name as string) || 'Unknown',
				snippet: extractSnippet(bodyText, sanitized),
				score: (row.rank as number) || 0
			};
		});
	} catch {
		// Fallback to LIKE search
		try {
			const rows = await db.select<Record<string, unknown>[]>(
				`SELECT
					n.id AS note_id,
					n.item_id,
					n.file_path,
					i.title,
					i.body_text,
					nb.name AS notebook_name
				FROM notes n
				JOIN items i ON i.id = n.item_id
				JOIN notebooks nb ON nb.id = n.notebook_id
				WHERE i.title LIKE ? OR i.body_text LIKE ?
				ORDER BY n.updated_at DESC
				LIMIT 50`,
				[`%${sanitized}%`, `%${sanitized}%`]
			);

			return rows.map((row) => {
				const bodyText = (row.body_text as string) || '';
				return {
					id: row.note_id as string,
					itemId: row.item_id as string,
					noteId: row.note_id as string,
					title: (row.title as string) || 'Untitled',
					filePath: row.file_path as string,
					notebookName: (row.notebook_name as string) || 'Unknown',
					snippet: extractSnippet(bodyText, sanitized),
					score: 0
				};
			});
		} catch {
			return [];
		}
	}
}

/**
 * Search across both notes and items for the cross-sheath search.
 */
export async function crossSheathSearch(query: string): Promise<{
	notes: NoteSearchResult[];
	items: Record<string, unknown>[];
}> {
	const [notes, items] = await Promise.all([
		searchNotes(query),
		loadItemsSearch(query)
	]);

	return { notes, items };
}

async function loadItemsQuery(query: string) {
	const db = await getInitializedDatabase();
	const sanitized = query.trim().replace(/['"]/g, '');

	try {
		return await db.select<Record<string, unknown>[]>(
			`SELECT id, title, url, body_text, source_name, created_at
			 FROM items
			 WHERE item_type != 'note'
			   AND (title LIKE ? OR body_text LIKE ? OR url LIKE ?)
			 ORDER BY created_at DESC
			 LIMIT 30`,
			[`%${sanitized}%`, `%${sanitized}%`, `%${sanitized}%`]
		);
	} catch {
		return [];
	}
}

function loadItemsSearch(query: string): Promise<Record<string, unknown>[]> {
	return loadItemsQuery(query);
}

function extractSnippet(text: string, query: string, contextChars = 80): string {
	if (!text) return '';

	const lower = text.toLowerCase();
	const queryLower = query.toLowerCase();
	const idx = lower.indexOf(queryLower);

	if (idx === -1) return text.slice(0, contextChars * 2) + '…';

	const start = Math.max(0, idx - contextChars);
	const end = Math.min(text.length, idx + query.length + contextChars);

	let snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
	return snippet;
}
