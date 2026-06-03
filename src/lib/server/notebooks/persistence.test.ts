import { describe, expect, it } from 'vitest';

import {
	getAllNotebooks,
	getNotebookById,
	createNotebook,
	renameNotebook,
	deleteNotebook,
	addFolderToNotebook,
	removeFolderFromNotebook,
	setDefaultSaveLocation,
	reorderNotebook,
	type NotebookPersistenceExecutor,
	type NotebookWithFolders
} from './persistence';

// Mock executor that simulates an in-memory SQLite store
class MockNotebookExecutor implements NotebookPersistenceExecutor {
	private notebooks: Map<string, Record<string, unknown>> = new Map();
	private folders: Map<string, Record<string, unknown>> = new Map();

	constructor() {
		// Nothing to initialize
	}

	async select<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
		const sqlUpper = sql.toUpperCase();

		if (sqlUpper.includes('SELECT * FROM NOTEBOOKS') && !sqlUpper.includes('WHERE')) {
			const all = Array.from(this.notebooks.values()).sort(
				(a, b) => (a.sort_order as number) - (b.sort_order as number) || String(a.name).localeCompare(String(b.name))
			);
			return all as T[];
		}

		if (sqlUpper.includes('SELECT * FROM NOTEBOOKS WHERE ID = ?')) {
			const id = params?.[0] as string;
			const row = this.notebooks.get(id);
			return (row ? [row] : []) as T[];
		}

		if (sqlUpper.includes('SELECT * FROM NOTEBOOK_FOLDERS') && !sqlUpper.includes('WHERE')) {
			const all = Array.from(this.folders.values()).sort(
				(a, b) => String(a.folder_path).localeCompare(String(b.folder_path))
			);
			return all as T[];
		}

		if (sqlUpper.includes('SELECT * FROM NOTEBOOK_FOLDERS WHERE NOTEBOOK_ID = ?')) {
			const notebookId = params?.[0] as string;
			const rows = Array.from(this.folders.values())
				.filter((f) => f.notebook_id === notebookId)
				.sort((a, b) => String(a.folder_path).localeCompare(String(b.folder_path)));
			return rows as T[];
		}

		if (sqlUpper.includes('SELECT COALESCE(MAX(SORT_ORDER), -1) + 1 AS NEXT_SORT')) {
			const orders = Array.from(this.notebooks.values()).map((n) => (n.sort_order as number) ?? -1);
			const max = orders.length > 0 ? Math.max(...orders) : -1;
			return [{ next_sort: max + 1 }] as T[];
		}

		return [];
	}

	async execute(sql: string, params?: unknown[]): Promise<unknown> {
		const sqlUpper = sql.trim().toUpperCase();
		const now = new Date().toISOString();

		if (sqlUpper.startsWith('INSERT INTO NOTEBOOKS')) {
			const [id, name, defaultSaveLocation, sortOrder] = params as string[];
			this.notebooks.set(id, {
				id,
				name,
				default_save_location: defaultSaveLocation,
				sort_order: sortOrder,
				created_at: now,
				updated_at: now
			});
			return;
		}

		if (sqlUpper.startsWith('INSERT INTO NOTEBOOK_FOLDERS')) {
			const [id, notebookId, folderPath] = params as string[];
			this.folders.set(id, {
				id,
				notebook_id: notebookId,
				folder_path: folderPath,
				added_at: now,
				updated_at: now
			});
			return;
		}

		if (sqlUpper.startsWith('UPDATE NOTEBOOKS SET NAME = ?')) {
			const [name, , id] = params as string[];
			const nb = this.notebooks.get(id);
			if (nb) {
				nb.name = name;
				nb.updated_at = now;
			}
			return;
		}

		if (sqlUpper.startsWith('UPDATE NOTEBOOKS SET SORT_ORDER = ?')) {
			const [sortOrder, , id] = params as string[];
			const nb = this.notebooks.get(id);
			if (nb) {
				nb.sort_order = sortOrder;
				nb.updated_at = now;
			}
			return;
		}

		if (sqlUpper.includes('DEFAULT_SAVE_LOCATION = ?')) {
			const [saveLocation, , id] = params as string[];
			const nb = this.notebooks.get(id);
			if (nb) {
				nb.default_save_location = saveLocation;
				nb.updated_at = now;
			}
			return;
		}

		if (sqlUpper.startsWith('DELETE FROM NOTEBOOK_FOLDERS WHERE NOTEBOOK_ID = ?')) {
			const [notebookId] = params as string[];
			for (const [key, folder] of this.folders) {
				if (folder.notebook_id === notebookId) this.folders.delete(key);
			}
			return;
		}

		if (sqlUpper.startsWith('DELETE FROM NOTEBOOKS WHERE ID = ?')) {
			const [id] = params as string[];
			this.notebooks.delete(id);
			return;
		}

		if (sqlUpper.startsWith('DELETE FROM NOTEBOOK_FOLDERS WHERE ID = ?')) {
			const [id] = params as string[];
			this.folders.delete(id);
			return;
		}

		return;
	}
}

function createExecutor(): NotebookPersistenceExecutor {
	return new MockNotebookExecutor();
}

function verifyNotebook(actual: NotebookWithFolders, expected: { name: string; folderCount: number; saveLocation?: string }) {
	expect(actual.id).toBeTruthy();
	expect(actual.name).toBe(expected.name);
	expect(actual.folders).toHaveLength(expected.folderCount);
	if (expected.saveLocation) {
		expect(actual.defaultSaveLocation).toBe(expected.saveLocation);
	}
}

describe('createNotebook', () => {
	it('creates a notebook with folders', async () => {
		const executor = createExecutor();
		const nb = await createNotebook('Test Notebook', ['/Users/test/notes'], undefined, executor);

		verifyNotebook(nb, { name: 'Test Notebook', folderCount: 1 });
		expect(nb.folders[0].folderPath).toBe('/Users/test/notes');
	});

	it('creates a notebook with multiple folders', async () => {
		const executor = createExecutor();
		const nb = await createNotebook(
			'Multi-root',
			['/Users/test/work', '/Users/test/personal'],
			'/Users/test/work',
			executor
		);

		verifyNotebook(nb, { name: 'Multi-root', folderCount: 2, saveLocation: '/Users/test/work' });
	});

	it('assigns incremental sort order', async () => {
		const executor = createExecutor();
		const a = await createNotebook('A', ['/a'], undefined, executor);
		const b = await createNotebook('B', ['/b'], undefined, executor);

		expect(a.sortOrder).toBe(0);
		expect(b.sortOrder).toBe(1);
	});
});

describe('getAllNotebooks', () => {
	it('returns empty list when no notebooks exist', async () => {
		const executor = createExecutor();
		const notebooks = await getAllNotebooks(executor);
		expect(notebooks).toEqual([]);
	});

	it('returns all notebooks with their folders', async () => {
		const executor = createExecutor();
		await createNotebook('A', ['/a'], undefined, executor);
		await createNotebook('B', ['/b1', '/b2'], undefined, executor);

		const notebooks = await getAllNotebooks(executor);
		expect(notebooks).toHaveLength(2);
		expect(notebooks[0].name).toBe('A');
		expect(notebooks[0].folders).toHaveLength(1);
		expect(notebooks[1].name).toBe('B');
		expect(notebooks[1].folders).toHaveLength(2);
	});
});

describe('getNotebookById', () => {
	it('returns notebook by id', async () => {
		const executor = createExecutor();
		const created = await createNotebook('Test', ['/path'], undefined, executor);
		const found = await getNotebookById(created.id, executor);

		expect(found).not.toBeNull();
		expect(found!.name).toBe('Test');
		expect(found!.folders).toHaveLength(1);
	});

	it('returns null for nonexistent id', async () => {
		const executor = createExecutor();
		const found = await getNotebookById('nonexistent', executor);
		expect(found).toBeNull();
	});
});

describe('renameNotebook', () => {
	it('renames a notebook', async () => {
		const executor = createExecutor();
		const nb = await createNotebook('Old', ['/path'], undefined, executor);
		await renameNotebook(nb.id, 'New Name', executor);

		const found = await getNotebookById(nb.id, executor);
		expect(found!.name).toBe('New Name');
	});
});

describe('reorderNotebook', () => {
	it('updates sort order', async () => {
		const executor = createExecutor();
		const nb = await createNotebook('Test', ['/path'], undefined, executor);
		await reorderNotebook(nb.id, 5, executor);

		const found = await getNotebookById(nb.id, executor);
		expect(found!.sortOrder).toBe(5);
	});
});

describe('setDefaultSaveLocation', () => {
	it('updates default save location', async () => {
		const executor = createExecutor();
		const nb = await createNotebook('Test', ['/path'], '/path', executor);
		await setDefaultSaveLocation(nb.id, '/new-path', executor);

		const found = await getNotebookById(nb.id, executor);
		expect(found!.defaultSaveLocation).toBe('/new-path');
	});
});

describe('deleteNotebook', () => {
	it('deletes a notebook and its folder associations', async () => {
		const executor = createExecutor();
		const nb = await createNotebook('Test', ['/path'], undefined, executor);
		await deleteNotebook(nb.id, executor);

		const all = await getAllNotebooks(executor);
		expect(all).toHaveLength(0);
	});
});

describe('addFolderToNotebook', () => {
	it('adds a folder to an existing notebook', async () => {
		const executor = createExecutor();
		const nb = await createNotebook('Test', ['/existing'], undefined, executor);
		const folder = await addFolderToNotebook(nb.id, '/new-folder', executor);

		expect(folder.folderPath).toBe('/new-folder');
		expect(folder.notebookId).toBe(nb.id);

		const found = await getNotebookById(nb.id, executor);
		expect(found!.folders).toHaveLength(2);
	});
});

describe('removeFolderFromNotebook', () => {
	it('removes a folder from a notebook', async () => {
		const executor = createExecutor();
		const nb = await createNotebook('Test', ['/keep', '/remove'], undefined, executor);
		const folderToRemove = nb.folders.find((f) => f.folderPath === '/remove')!;
		await removeFolderFromNotebook(folderToRemove.id, executor);

		const found = await getNotebookById(nb.id, executor);
		expect(found!.folders).toHaveLength(1);
		expect(found!.folders[0].folderPath).toBe('/keep');
	});
});
