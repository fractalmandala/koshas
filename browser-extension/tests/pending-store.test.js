import { describe, expect, it } from 'vitest';

import { createPendingStore } from '../src/pending-store.js';

function createMemoryArea(initial = {}) {
	const data = { ...initial };

	return {
		async get(keys) {
			if (Array.isArray(keys)) {
				return Object.fromEntries(keys.map((key) => [key, data[key]]));
			}

			return { [keys]: data[keys] };
		},
		async set(values) {
			Object.assign(data, values);
		},
		async remove(keys) {
			for (const key of Array.isArray(keys) ? keys : [keys]) {
				delete data[key];
			}
		},
		data
	};
}

describe('pending Koshas URL storage', () => {
	it('queues pending URLs with stable metadata and newest-last ordering', async () => {
		const area = createMemoryArea();
		const store = createPendingStore(area, () => 1700000000000);

		await store.enqueue('koshas://add?url=one');
		await store.enqueue('koshas://add?url=two');

		expect(await store.list()).toEqual([
			{ id: '1700000000000-0', url: 'koshas://add?url=one', createdAt: 1700000000000 },
			{ id: '1700000000000-1', url: 'koshas://add?url=two', createdAt: 1700000000000 }
		]);
	});

	it('clears pending URLs after launch sends them', async () => {
		const area = createMemoryArea({
			koshasPendingUrls: [
				{ id: 'one', url: 'koshas://add?url=one', createdAt: 1 },
				{ id: 'two', url: 'koshas://add?url=two', createdAt: 2 }
			]
		});
		const store = createPendingStore(area);

		const urls = await store.drain();

		expect(urls).toEqual(['koshas://add?url=one', 'koshas://add?url=two']);
		expect(await store.list()).toEqual([]);
	});
});
