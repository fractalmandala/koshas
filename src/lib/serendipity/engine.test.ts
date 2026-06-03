import { describe, expect, it } from 'vitest';
import {
	getSuggestion,
	recordKeep,
	recordForget,
	getRemainingCount,
	type SerendipityExecutor
} from './engine';

/**
 * Simpler mock that tracks items directly.
 * Uses a custom flag for test assertions.
 */
class MockSerendipityExecutor implements SerendipityExecutor {
	public items: Array<{
		id: string;
		title: string;
		description: string;
		item_type: string;
		created_at: string;
		seen_at: string | null;
		normalized_url: string | null;
		file_path: string | null;
	}> = [];

	private deletedPaths: string[] = [];
	private deletedUrls: string[] = [];

	addItem(id: string, overrides: Partial<{
		title: string;
		description: string;
		item_type: string;
		created_at: string;
		seen_at: string | null;
		normalized_url: string | null;
		file_path: string | null;
	}> = {}) {
		this.items.push({
			id,
			title: 'Test Item',
			description: '',
			item_type: 'bookmark',
			created_at: new Date().toISOString(),
			seen_at: null,
			normalized_url: null,
			file_path: null,
			...overrides
		});
	}

	addDeletedItem(filePath?: string, url?: string) {
		if (filePath) this.deletedPaths.push(filePath);
		if (url) this.deletedUrls.push(url);
	}

	private isEligible(item: typeof this.items[0]): boolean {
		const FORGOTTEN_SENTINEL = '9999-12-31T23:59:59.000Z';
		const cooldownMs = 4 * 60 * 60 * 1000; // 4 hours

		if (item.seen_at === FORGOTTEN_SENTINEL) return false;

		if (item.seen_at !== null) {
			const seenTime = new Date(item.seen_at).getTime();
			if (Date.now() - seenTime < cooldownMs) return false;
		}

		if (item.file_path && this.deletedPaths.includes(item.file_path)) return false;
		if (item.normalized_url && this.deletedUrls.includes(item.normalized_url)) return false;

		return true;
	}

	async select<T = unknown>(sql: string, _params?: unknown[]): Promise<T[]> {
		const sqlUpper = sql.toUpperCase();

		const eligible = this.items.filter((item) => this.isEligible(item));

		if (sqlUpper.includes('COUNT(*)')) {
			return [{ count: eligible.length }] as T[];
		}

		if (sqlUpper.includes('ORDER BY')) {
			const results = eligible.slice(0, 50).map((item) => ({
				id: item.id,
				title: item.title || 'Untitled',
				description: item.description || '',
				type: item.item_type || 'item',
				date_added: item.created_at
			}));
			return results as T[];
		}

		return [] as T[];
	}

	async execute(sql: string, params?: unknown[]): Promise<unknown> {
		const sqlUpper = sql.trim().toUpperCase();

		if (sqlUpper.startsWith('UPDATE')) {
			// recordForget: UPDATE ... SET seen_at = ?, updated_at = datetime('now') WHERE id = ?
			//   params: [sentinel, itemId]
			// recordKeep: UPDATE ... SET seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
			//   params: [itemId]
			let itemId: string | undefined;
			let seenAtValue: string | undefined;

			if (params && params.length >= 2) {
				// recordForget
				seenAtValue = params[0] as string;
				itemId = params[1] as string;
			} else if (params && params.length === 1) {
				// recordKeep
				itemId = params[0] as string;
			}

			const item = itemId ? this.items.find((i) => i.id === itemId) : undefined;
			if (item) {
				if (seenAtValue) {
					item.seen_at = seenAtValue;
				} else {
					item.seen_at = new Date().toISOString();
				}
			}
		}
		return;
	}
}

describe('serendipity engine', () => {
	function createExecutor(): MockSerendipityExecutor {
		const exec = new MockSerendipityExecutor();
		exec.addItem('item-1', { title: 'First Article', item_type: 'article' });
		exec.addItem('item-2', { title: 'Second Bookmark', item_type: 'bookmark' });
		return exec;
	}

	describe('getSuggestion', () => {
		it('should return a suggestion from eligible items', async () => {
			const exec = createExecutor();
			const suggestion = await getSuggestion(exec);
			expect(suggestion).not.toBeNull();
			expect(suggestion?.id).toBeTruthy();
			expect(suggestion?.title).toBeTruthy();
		});

		it('should not return items with seen_at set recently', async () => {
			const exec = createExecutor();
			exec.addItem('item-3', {
				title: 'Recent',
				seen_at: new Date().toISOString()
			});

			const suggestion = await getSuggestion(exec);
			expect(suggestion).not.toBeNull();
			if (suggestion) {
				expect(suggestion.id).not.toBe('item-3');
			}
		});

		it('should return null when no items are eligible', async () => {
			const exec = new MockSerendipityExecutor();
			exec.addItem('item-1', {
				title: 'Forgotten',
				seen_at: '9999-12-31T23:59:59.000Z'
			});

			const suggestion = await getSuggestion(exec);
			expect(suggestion).toBeNull();
		});

		it('should return null with empty items', async () => {
			const exec = new MockSerendipityExecutor();
			const suggestion = await getSuggestion(exec);
			expect(suggestion).toBeNull();
		});
	});

	describe('recordKeep', () => {
		it('should set seen_at to now', async () => {
			const exec = createExecutor();
			await recordKeep(exec, 'item-1');

			const count = await getRemainingCount(exec);
			expect(count).toBe(1); // Only item-2 remains
		});
	});

	describe('recordForget', () => {
		it('should set seen_at to sentinel value', async () => {
			const exec = createExecutor();
			await recordForget(exec, 'item-1');

			const count = await getRemainingCount(exec);
			expect(count).toBe(1); // Only item-2 remains
		});
	});

	describe('getRemainingCount', () => {
		it('should count eligible items', async () => {
			const exec = createExecutor();
			const count = await getRemainingCount(exec);
			expect(count).toBe(2);
		});

		it('should return 0 when all items are forgotten', async () => {
			const exec = createExecutor();
			await recordForget(exec, 'item-1');
			await recordForget(exec, 'item-2');

			const count = await getRemainingCount(exec);
			expect(count).toBe(0);
		});
	});
});
