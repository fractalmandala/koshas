const STORAGE_KEY = 'koshasPendingUrls';

async function getPending(storageArea) {
	const result = await storageArea.get(STORAGE_KEY);
	const pending = result?.[STORAGE_KEY];

	return Array.isArray(pending) ? pending : [];
}

export { STORAGE_KEY };

export function createPendingStore(storageArea, now = () => Date.now()) {
	return {
		async enqueue(url) {
			const pending = await getPending(storageArea);
			const createdAt = now();
			const item = {
				id: `${createdAt}-${pending.length}`,
				url,
				createdAt
			};

			await storageArea.set({ [STORAGE_KEY]: [...pending, item] });

			return item;
		},
		async list() {
			return getPending(storageArea);
		},
		async drain() {
			const pending = await getPending(storageArea);

			await storageArea.remove(STORAGE_KEY);

			return pending.map((item) => item.url);
		}
	};
}
