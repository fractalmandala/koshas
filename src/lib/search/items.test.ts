import { describe, expect, it } from 'vitest';

import { buildItemFtsSearchQuery, createItemSearchService, type SearchExecutor } from './items';

describe('client-safe item search adapter', () => {
	it('exposes query construction and runtime search without server-only imports', async () => {
		const query = buildItemFtsSearchQuery({ query: 'search adapter', limit: 5 });
		const executor: SearchExecutor = {
			async select<T>(): Promise<T[]> {
				return [
					{
						id: 'item-client',
						item_type: 'bookmark',
						source_url: null,
						normalized_url: null,
						title: 'Client-safe search',
						description: null,
						body_text: null,
						ocr_text: null,
						summary: null,
						thumbnail: null,
						file_path: null,
						seen_at: null,
						updated_at: '2026-06-03T10:00:00Z',
						rank: -0.1
					}
				] as T[];
			}
		};
		const service = createItemSearchService({ getDatabase: async () => executor });

		const results = await service.search({ query: 'client' });

		expect(query.params).toEqual(['search adapter', 5, 0]);
		expect(results).toEqual([
			expect.objectContaining({
				id: 'item-client',
				itemType: 'bookmark',
				rank: -0.1
			})
		]);
	});
});
