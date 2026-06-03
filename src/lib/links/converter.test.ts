import { describe, expect, it } from 'vitest';
import {
	resolveWikilinkTarget,
	getItemIdForPath,
	type WikilinkResolver
} from './converter';
import { type LinkReferencesExecutor } from './persistence';
import { convertWikilinksOnSave } from './converter';
import { extractWikilinks } from './wikilink';

class MockResolver implements WikilinkResolver {
	private data: Map<string, Array<Record<string, unknown>>> = new Map();

	seed(table: string, rows: Array<Record<string, unknown>>) {
		this.data.set(table, rows);
	}

	async select<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
		const sqlUpper = sql.toUpperCase();

		// Items by title
		if (sqlUpper.includes('WHERE TITLE = ?') && sqlUpper.includes('ITEMS')) {
			const title = params?.[0] as string;
			const items = this.data.get('items') || [];
			const matches = items.filter((i) => i.title === title);
			return matches.map((m) => ({ id: m.id })) as T[];
		}

		// Notes by title via items join
		if (sqlUpper.includes('NOTES N') && sqlUpper.includes('WHERE I.TITLE = ?')) {
			const title = params?.[0] as string;
			const items = this.data.get('items') || [];
			const notes = this.data.get('notes') || [];
			const itemMatch = items.find((i) => i.title === title);
			if (itemMatch) {
				const noteMatch = notes.find((n) => n.item_id === itemMatch.id);
				if (noteMatch) return [{ id: noteMatch.item_id }] as T[];
			}
			return [] as T[];
		}

		// Case-insensitive items by title
		if (sqlUpper.includes('LOWER(TITLE) = LOWER(?)') && sqlUpper.includes('ITEMS')) {
			const titleLc = (params?.[0] as string).toLowerCase();
			const items = this.data.get('items') || [];
			const matches = items.filter((i) => (i.title as string).toLowerCase() === titleLc);
			return matches.map((m) => ({ id: m.id })) as T[];
		}

		// Case-insensitive notes by title
		if (sqlUpper.includes('LOWER(I.TITLE) = LOWER(?)') && sqlUpper.includes('NOTES')) {
			const titleLc = (params?.[0] as string).toLowerCase();
			const items = this.data.get('items') || [];
			const notes = this.data.get('notes') || [];
			const itemMatch = items.find((i) => (i.title as string).toLowerCase() === titleLc);
			if (itemMatch) {
				const noteMatch = notes.find((n) => n.item_id === itemMatch.id);
				if (noteMatch) return [{ id: noteMatch.item_id }] as T[];
			}
			return [] as T[];
		}

		// file_path lookup
		if (sqlUpper.includes('FILE_PATH = ?')) {
			const filePath = params?.[0] as string;
			const notes = this.data.get('notes') || [];
			const match = notes.find((n) => n.file_path === filePath);
			if (match) return [{ item_id: match.item_id }] as T[];
			return [] as T[];
		}

		// Item title by id
		if (sqlUpper.includes('WHERE ID = ?') && sqlUpper.includes('ITEMS')) {
			const id = params?.[0] as string;
			const items = this.data.get('items') || [];
			const match = items.find((i) => i.id === id);
			if (match) return [{ title: match.title || '' }] as T[];
			return [{ title: '' }] as T[];
		}

		return [] as T[];
	}

	async execute(_sql: string, _params?: unknown[]): Promise<unknown> {
		return;
	}
}

class MockLinkExecutor implements LinkReferencesExecutor {
	private links: Array<Record<string, unknown>> = [];

	async select<T = unknown>(_sql: string, _params?: unknown[]): Promise<T[]> {
		return [] as T[];
	}

	async execute(sql: string, params?: unknown[]): Promise<unknown> {
		if (sql.startsWith('INSERT')) {
			const [id, sourceItemId, targetItemId, referenceType] = params as string[];
			// Dedup check
			const exists = this.links.some(
				(l) =>
					l.source_item_id === sourceItemId &&
					l.target_item_id === targetItemId &&
					l.reference_type === referenceType
			);
			if (!exists) {
				this.links.push({
					id,
					source_item_id: sourceItemId,
					target_item_id: targetItemId,
					reference_type: referenceType,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				});
			}
		}
		return;
	}

	getAllLinks() {
		return this.links;
	}
}

describe('resolveWikilinkTarget', () => {
	it('should return UUID if target is already a UUID', async () => {
		const resolver = new MockResolver();
		const uuid = '550e8400-e29b-41d4-a716-446655440000';
		const result = await resolveWikilinkTarget(resolver, uuid);
		expect(result).toBe(uuid);
	});

	it('should look up items by title', async () => {
		const resolver = new MockResolver();
		resolver.seed('items', [
			{ id: 'item-uuid-1', title: 'My Article' }
		]);

		const result = await resolveWikilinkTarget(resolver, 'My Article');
		expect(result).toBe('item-uuid-1');
	});

	it('should return null for unresolvable targets', async () => {
		const resolver = new MockResolver();
		resolver.seed('items', [
			{ id: 'item-uuid-1', title: 'My Article' }
		]);

		const result = await resolveWikilinkTarget(resolver, 'Non-existent');
		expect(result).toBeNull();
	});

	it('should perform case-insensitive fallback lookup', async () => {
		const resolver = new MockResolver();
		resolver.seed('items', [
			{ id: 'item-uuid-1', title: 'My Article' }
		]);

		const result = await resolveWikilinkTarget(resolver, 'my article');
		expect(result).toBe('item-uuid-1');
	});

	it('should look up notes by title', async () => {
		const resolver = new MockResolver();
		resolver.seed('items', [
			{ id: 'note-item-uuid', title: 'My Note' }
		]);
		resolver.seed('notes', [
			{ item_id: 'note-item-uuid', file_path: '/notes/my-note.md' }
		]);

		const result = await resolveWikilinkTarget(resolver, 'My Note');
		expect(result).toBe('note-item-uuid');
	});
});

describe('getItemIdForPath', () => {
	it('should return item_id for a known file path', async () => {
		const resolver = new MockResolver();
		resolver.seed('notes', [
			{ item_id: 'note-uuid', file_path: '/notes/test.md' }
		]);

		const result = await getItemIdForPath(resolver, '/notes/test.md');
		expect(result).toBe('note-uuid');
	});

	it('should return null for unknown file path', async () => {
		const resolver = new MockResolver();
		const result = await getItemIdForPath(resolver, '/notes/unknown.md');
		expect(result).toBeNull();
	});
});

describe('convertWikilinksOnSave', () => {
	it('should persist wikilinks to link_references', async () => {
		const resolver = new MockResolver();
		const UUID_1 = '550e8400-e29b-41d4-a716-446655440000';
		const UUID_2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
		resolver.seed('items', [
			{ id: 'source-uuid', title: 'Source' },
			{ id: UUID_1, title: 'Target Article' },
			{ id: UUID_2, title: 'Second Item' }
		]);

		const linkDb = new MockLinkExecutor();

		await convertWikilinksOnSave(
			resolver,
			linkDb,
			'source-uuid',
			`Check [[Target Article]] and [[${UUID_2}]] for details`
		);

		const allLinks = linkDb.getAllLinks();
		expect(allLinks).toHaveLength(2);
		expect(allLinks[0].source_item_id).toBe('source-uuid');
	});

	it('should convert wikilink text to koshas:// URLs', async () => {
		const resolver = new MockResolver();
		const TARGET_UUID = '550e8400-e29b-41d4-a716-446655440000';
		resolver.seed('items', [
			{ id: 'source-uuid', title: 'Source' },
			{ id: TARGET_UUID, title: 'Target Article' }
		]);

		const linkDb = new MockLinkExecutor();

		const result = await convertWikilinksOnSave(
			resolver,
			linkDb,
			'source-uuid',
			'Check [[Target Article]]'
		);

		expect(result).toBe(`Check [Target Article](koshas://item/${TARGET_UUID})`);
	});

	it('should leave unresolvable wikilinks as-is', async () => {
		const resolver = new MockResolver();
		resolver.seed('items', [
			{ id: 'source-uuid', title: 'Source' }
		]);

		const linkDb = new MockLinkExecutor();

		const result = await convertWikilinksOnSave(
			resolver,
			linkDb,
			'source-uuid',
			'Check [[Missing Article]]'
		);

		expect(result).toBe('Check [[Missing Article]]');
	});
});

describe('extractWikilinks utility', () => {
	it('should parse wikilinks correctly from complex content', () => {
		const content = `# Title

Some text with [[link-1]] and [[Link Two|Display Two]].

Another paragraph with [[550e8400-e29b-41d4-a716-446655440000]].`;

		const matches = extractWikilinks(content);
		expect(matches).toHaveLength(3);
		expect(matches[0].target).toBe('link-1');
		expect(matches[1].target).toBe('Link Two');
		expect(matches[1].displayText).toBe('Display Two');
		expect(matches[2].isUuid).toBe(true);
	});
});
