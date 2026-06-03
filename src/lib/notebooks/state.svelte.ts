import { browser } from '$app/environment';
import { getInitializedDatabase } from '$lib/db';

const STORAGE_KEY = 'koshas:activeNotebookId';

export interface Notebook {
	id: string;
	name: string;
	defaultSaveLocation: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface NotebookFolder {
	id: string;
	notebookId: string;
	folderPath: string;
	addedAt: string;
	updatedAt: string;
}

export interface NotebookWithFolders extends Notebook {
	folders: NotebookFolder[];
}

function mapNotebook(row: Record<string, unknown>): Notebook {
	return {
		id: row.id as string,
		name: row.name as string,
		defaultSaveLocation: row.default_save_location as string,
		sortOrder: (row.sort_order as number) ?? 0,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string
	};
}

function mapNotebookFolder(row: Record<string, unknown>): NotebookFolder {
	return {
		id: row.id as string,
		notebookId: row.notebook_id as string,
		folderPath: row.folder_path as string,
		addedAt: row.added_at as string,
		updatedAt: row.updated_at as string
	};
}

// --- Reactive state ---
let notebooks = $state<NotebookWithFolders[]>([]);
let activeNotebookId = $state<string | null>(null);
let loading = $state(true);

// --- Derived ---
let activeNotebook = $derived(
	activeNotebookId ? notebooks.find((n) => n.id === activeNotebookId) ?? null : null
);

let hasNotebooks = $derived(notebooks.length > 0);

// --- DB operations (browser-safe, uses Tauri plugin-sql) ---
async function loadNotebooks(): Promise<void> {
	loading = true;
	try {
		const db = await getInitializedDatabase();
		const notebookRows = await db.select<Record<string, unknown>[]>(
			'SELECT * FROM notebooks ORDER BY sort_order ASC, name ASC'
		);

		let folderRows: Record<string, unknown>[] = [];
		if (notebookRows.length > 0) {
			folderRows = await db.select<Record<string, unknown>[]>(
				'SELECT * FROM notebook_folders ORDER BY folder_path ASC'
			);
		}

		const foldersByNotebook = new Map<string, NotebookFolder[]>();
		for (const row of folderRows) {
			const folder = mapNotebookFolder(row);
			const list = foldersByNotebook.get(folder.notebookId) ?? [];
			list.push(folder);
			foldersByNotebook.set(folder.notebookId, list);
		}

		notebooks = notebookRows.map((row) => {
			const nb = mapNotebook(row);
			return {
				...nb,
				folders: foldersByNotebook.get(nb.id) ?? []
			};
		});

		// Restore active notebook from storage
		if (browser) {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored && notebooks.some((n) => n.id === stored)) {
				activeNotebookId = stored;
			} else if (notebooks.length > 0) {
				activeNotebookId = notebooks[0].id;
			}
		}
	} catch {
		notebooks = [];
	} finally {
		loading = false;
	}
}

async function addNotebook(name: string, folderPaths: string[]): Promise<NotebookWithFolders | null> {
	try {
		const db = await getInitializedDatabase();
		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		const maxRows = await db.select<Record<string, unknown>[]>(
			'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM notebooks'
		);
		const sortOrder = (maxRows[0]?.next_sort as number) ?? 0;
		const saveLocation = folderPaths.length > 0 ? folderPaths[0] : '';

		await db.execute(
			`INSERT INTO notebooks (id, name, default_save_location, sort_order, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[id, name, saveLocation, sortOrder, now, now]
		);

		const folders: NotebookFolder[] = [];
		for (const folderPath of folderPaths) {
			const folderId = crypto.randomUUID();
			await db.execute(
				`INSERT INTO notebook_folders (id, notebook_id, folder_path, added_at, updated_at)
				 VALUES (?, ?, ?, ?, ?)`,
				[folderId, id, folderPath, now, now]
			);
			folders.push({ id: folderId, notebookId: id, folderPath, addedAt: now, updatedAt: now });
		}

		const nb: NotebookWithFolders = {
			id,
			name,
			defaultSaveLocation: saveLocation,
			sortOrder,
			createdAt: now,
			updatedAt: now,
			folders
		};

		notebooks = [...notebooks, nb];
		activeNotebookId = nb.id;
		persistActive();
		return nb;
	} catch {
		return null;
	}
}

async function updateNotebookName(id: string, name: string): Promise<boolean> {
	try {
		const db = await getInitializedDatabase();
		const now = new Date().toISOString();
		await db.execute('UPDATE notebooks SET name = ?, updated_at = ? WHERE id = ?', [name, now, id]);
		notebooks = notebooks.map((n) => (n.id === id ? { ...n, name } : n));
		return true;
	} catch {
		return false;
	}
}

async function removeNotebook(id: string): Promise<boolean> {
	try {
		const db = await getInitializedDatabase();
		await db.execute('DELETE FROM notebook_folders WHERE notebook_id = ?', [id]);
		await db.execute('DELETE FROM notebooks WHERE id = ?', [id]);
		notebooks = notebooks.filter((n) => n.id !== id);
		if (activeNotebookId === id) {
			activeNotebookId = notebooks.length > 0 ? notebooks[0].id : null;
			persistActive();
		}
		return true;
	} catch {
		return false;
	}
}

function setActive(id: string | null): void {
	activeNotebookId = id;
	persistActive();
}

function persistActive(): void {
	if (browser) {
		if (activeNotebookId) {
			localStorage.setItem(STORAGE_KEY, activeNotebookId);
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	}
}

// --- Exported getters ---
export function getNotebookState() {
	return {
		get notebooks() {
			return notebooks;
		},
		get activeNotebookId() {
			return activeNotebookId;
		},
		get activeNotebook() {
			return activeNotebook;
		},
		get hasNotebooks() {
			return hasNotebooks;
		},
		get loading() {
			return loading;
		},
		loadNotebooks,
		addNotebook,
		updateNotebookName,
		removeNotebook,
		setActive
	};
}
