import { describe, expect, it } from 'vitest';

import {
	createLinkReference,
	deleteLinkReference,
	deleteLinkReferenceById,
	getReferencesBySource,
	getBacklinksByTarget,
	batchInsertLinks,
	getAllLinkReferences,
	getReferenceCount,
	type LinkReferencesExecutor
} from './persistence';

class MockLinkExecutor implements LinkReferencesExecutor {
	private links: Map<string, Record<string, unknown>> = new Map();
	private items: Map<string, Record<string, unknown>> = new Map();

	addItem(id: string, title: string, itemType: string = 'bookmark') {
		this.items.set(id, { id, title: title || `Item ${id}`, item_type: itemType });
	}

	async select<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
		const sqlUpper = sql.toUpperCase();

		// Count queries
		if (sqlUpper.includes('COUNT(*)')) {
			const isSource = sqlUpper.includes('SOURCE_ITEM_ID = ?');
			const isTarget = sqlUpper.includes('TARGET_ITEM_ID = ?');
			if (isSource || isTarget) {
				const itemId = params?.[0] as string;
				const count = Array.from(this.links.values()).filter((l) =>
					isSource ? l.source_item_id === itemId : l.target_item_id === itemId
				).length;
				return [{ count }] as T[];
			}
		}

		// Join with items (backlinks)
		if (sqlUpper.includes('JOIN ITEMS')) {
			const targetId = params?.[0] as string;
			const rows = Array.from(this.links.values())
				.filter((l) => l.target_item_id === targetId)
				.map((l) => {
					const item = this.items.get(l.source_item_id as string);
					return {
						...l,
						source_title: item?.title ?? null,
						source_item_type: item?.item_type ?? null
					};
				});
			return rows as T[];
		}

		// Select by source + target + type (most specific first)
		if (params && params.length >= 3 && sqlUpper.includes('TARGET_ITEM_ID = ?') && sqlUpper.includes('REFERENCE_TYPE = ?')) {
			const [sourceId, targetId, refType] = params as string[];
			const rows = Array.from(this.links.values()).filter(
				(l) =>
					l.source_item_id === sourceId &&
					l.target_item_id === targetId &&
					l.reference_type === refType
			);
			return rows as T[];
		}

		// Select by source + target
		if (params && params.length >= 2 && sqlUpper.includes('TARGET_ITEM_ID = ?') && !sqlUpper.includes('REFERENCE_TYPE')) {
			const [sourceId, targetId] = params as string[];
			const rows = Array.from(this.links.values()).filter(
				(l) => l.source_item_id === sourceId && l.target_item_id === targetId
			);
			return rows as T[];
		}

		// Select by source
		if (params && params.length >= 1 && sqlUpper.includes('SOURCE_ITEM_ID = ?') && !sqlUpper.includes('TARGET_ITEM_ID')) {
			const sourceId = params?.[0] as string;
			const rows = Array.from(this.links.values()).filter((l) => l.source_item_id === sourceId);
			return rows as T[];
		}

		// Select all
		if (sqlUpper.includes('SELECT * FROM LINK_REFERENCES') && !sqlUpper.includes('WHERE')) {
			return Array.from(this.links.values()) as T[];
		}

		return [];
	}

	async execute(sql: string, params?: unknown[]): Promise<unknown> {
		const sqlUpper = sql.trim().toUpperCase();

		if (sqlUpper.startsWith('INSERT')) {
			const [id, sourceItemId, targetItemId, referenceType, createdAt, updatedAt] =
				params as string[];

			// Simulate INSERT OR IGNORE
			const existing = Array.from(this.links.values()).find(
				(l) =>
					l.source_item_id === sourceItemId &&
					l.target_item_id === targetItemId &&
					l.reference_type === referenceType
			);
			if (!existing) {
				this.links.set(id, {
					id,
					source_item_id: sourceItemId,
					target_item_id: targetItemId,
					reference_type: referenceType,
					created_at: createdAt,
					updated_at: updatedAt
				});
			}
			return;
		}

		if (sqlUpper.startsWith('DELETE')) {
			const isById = sqlUpper.includes('WHERE ID = ?');
			const isByPair = sqlUpper.includes('SOURCE_ITEM_ID = ?') && sqlUpper.includes('TARGET_ITEM_ID = ?');

			if (isById) {
				const id = params?.[0] as string;
				this.links.delete(id);
			} else if (isByPair) {
				const [sourceId, targetId] = params as string[];
				for (const [id, l] of this.links) {
					if (l.source_item_id === sourceId && l.target_item_id === targetId) {
						this.links.delete(id);
					}
				}
			}
			return;
		}

		return;
	}
}

describe('link_references persistence', () => {
	function createExecutor(): MockLinkExecutor {
		const exec = new MockLinkExecutor();
		exec.addItem('item-1', 'First Article', 'article');
		exec.addItem('item-2', 'Second Note', 'note');
		exec.addItem('item-3', 'Third Bookmark', 'bookmark');
		return exec;
	}

	describe('createLinkReference', () => {
		it('should create a link reference between two items', async () => {
			const exec = createExecutor();

			const ref = await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-2',
				referenceType: 'wikilink'
			});

			expect(ref.id).toBeTruthy();
			expect(ref.sourceItemId).toBe('item-1');
			expect(ref.targetItemId).toBe('item-2');
			expect(ref.referenceType).toBe('wikilink');
			expect(ref.createdAt).toBeTruthy();
		});

		it('should deduplicate identical link references', async () => {
			const exec = createExecutor();

			const ref1 = await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-2',
				referenceType: 'wikilink'
			});

			const ref2 = await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-2',
				referenceType: 'wikilink'
			});

			// Both should exist (INSERT OR IGNORE + SELECT returns existing)
			expect(ref1.id).toBeTruthy();
			expect(ref2.id).toBeTruthy();
		});

		it('should allow different reference types between same items', async () => {
			const exec = createExecutor();

			const ref1 = await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-2',
				referenceType: 'wikilink'
			});

			const ref2 = await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-2',
				referenceType: 'auto_detected'
			});

			expect(ref1.id).not.toBe(ref2.id);
		});
	});

	describe('deleteLinkReference', () => {
		it('should delete a link reference by source + target', async () => {
			const exec = createExecutor();

			await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-2',
				referenceType: 'wikilink'
			});

			await deleteLinkReference(exec, 'item-1', 'item-2');

			const refs = await getReferencesBySource(exec, 'item-1');
			expect(refs).toHaveLength(0);
		});
	});

	describe('deleteLinkReferenceById', () => {
		it('should delete a link reference by id', async () => {
			const exec = createExecutor();

			const ref = await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-2',
				referenceType: 'wikilink'
			});

			await deleteLinkReferenceById(exec, ref.id);

			const refs = await getReferencesBySource(exec, 'item-1');
			expect(refs).toHaveLength(0);
		});
	});

	describe('getReferencesBySource', () => {
		it('should return all outgoing references from a source item', async () => {
			const exec = createExecutor();

			await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-2',
				referenceType: 'wikilink'
			});
			await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-3',
				referenceType: 'wikilink'
			});

			const refs = await getReferencesBySource(exec, 'item-1');

			expect(refs).toHaveLength(2);
			expect(refs.every((r) => r.sourceItemId === 'item-1')).toBe(true);
		});

		it('should return empty array when no references exist', async () => {
			const exec = createExecutor();

			const refs = await getReferencesBySource(exec, 'item-1');
			expect(refs).toHaveLength(0);
		});
	});

	describe('getBacklinksByTarget', () => {
		it('should return all incoming references to a target item', async () => {
			const exec = createExecutor();

			await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-3',
				referenceType: 'wikilink'
			});
			await createLinkReference(exec, {
				sourceItemId: 'item-2',
				targetItemId: 'item-3',
				referenceType: 'wikilink'
			});

			const backlinks = await getBacklinksByTarget(exec, 'item-3');

			expect(backlinks).toHaveLength(2);
			expect(backlinks.every((r) => r.targetItemId === 'item-3')).toBe(true);
		});

		it('should include source title from joined items', async () => {
			const exec = createExecutor();

			await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-3',
				referenceType: 'wikilink'
			});

			const backlinks = await getBacklinksByTarget(exec, 'item-3');

			expect(backlinks[0].sourceTitle).toBeTruthy();
			expect(backlinks[0].sourceItemType).toBe('article');
		});

		it('should return empty array when no backlinks exist', async () => {
			const exec = createExecutor();

			const backlinks = await getBacklinksByTarget(exec, 'item-1');
			expect(backlinks).toHaveLength(0);
		});
	});

	describe('batchInsertLinks', () => {
		it('should insert multiple link references', async () => {
			const exec = createExecutor();

			const count = await batchInsertLinks(exec, [
				{ sourceItemId: 'item-1', targetItemId: 'item-2', referenceType: 'wikilink' },
				{ sourceItemId: 'item-1', targetItemId: 'item-3', referenceType: 'wikilink' },
				{ sourceItemId: 'item-2', targetItemId: 'item-3', referenceType: 'auto_detected' }
			]);

			expect(count).toBe(3);

			const all = await getAllLinkReferences(exec);
			expect(all).toHaveLength(3);
		});

		it('should skip duplicates', async () => {
			const exec = createExecutor();

			const count = await batchInsertLinks(exec, [
				{ sourceItemId: 'item-1', targetItemId: 'item-2', referenceType: 'wikilink' },
				{ sourceItemId: 'item-1', targetItemId: 'item-2', referenceType: 'wikilink' }
			]);

			expect(count).toBe(2); // Both attempts to insert (INSERT OR IGNORE)

			const all = await getAllLinkReferences(exec);
			expect(all).toHaveLength(1); // Only one actual row
		});
	});

	describe('getAllLinkReferences', () => {
		it('should return all link references', async () => {
			const exec = createExecutor();

			await batchInsertLinks(exec, [
				{ sourceItemId: 'item-1', targetItemId: 'item-2', referenceType: 'wikilink' },
				{ sourceItemId: 'item-2', targetItemId: 'item-3', referenceType: 'wikilink' }
			]);

			const all = await getAllLinkReferences(exec);
			expect(all).toHaveLength(2);
		});
	});

	describe('getReferenceCount', () => {
		it('should return outgoing and incoming counts', async () => {
			const exec = createExecutor();

			// item-1 links to item-2 and item-3
			await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-2',
				referenceType: 'wikilink'
			});
			await createLinkReference(exec, {
				sourceItemId: 'item-1',
				targetItemId: 'item-3',
				referenceType: 'wikilink'
			});
			// item-2 links to item-1
			await createLinkReference(exec, {
				sourceItemId: 'item-2',
				targetItemId: 'item-1',
				referenceType: 'wikilink'
			});

			const counts1 = await getReferenceCount(exec, 'item-1');
			expect(counts1.outgoing).toBe(2);
			expect(counts1.incoming).toBe(1);

			const counts2 = await getReferenceCount(exec, 'item-2');
			expect(counts2.outgoing).toBe(1);
			expect(counts2.incoming).toBe(1);

			const counts3 = await getReferenceCount(exec, 'item-3');
			expect(counts3.outgoing).toBe(0);
			expect(counts3.incoming).toBe(1);
		});
	});
});
