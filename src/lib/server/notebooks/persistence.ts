export interface NotebookPersistenceExecutor {
	select<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
	execute(sql: string, params?: unknown[]): Promise<unknown>;
}

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

export async function getAllNotebooks(
	executor: NotebookPersistenceExecutor
): Promise<NotebookWithFolders[]> {
	const notebookRows = await executor.select<Record<string, unknown>>(
		'SELECT * FROM notebooks ORDER BY sort_order ASC, name ASC'
	);
	if (notebookRows.length === 0) return [];

	const folderRows = await executor.select<Record<string, unknown>>(
		'SELECT * FROM notebook_folders ORDER BY folder_path ASC'
	);

	const foldersByNotebook = new Map<string, NotebookFolder[]>();
	for (const row of folderRows) {
		const folder = mapNotebookFolder(row);
		const list = foldersByNotebook.get(folder.notebookId) ?? [];
		list.push(folder);
		foldersByNotebook.set(folder.notebookId, list);
	}

	return notebookRows.map((row) => {
		const notebook = mapNotebook(row);
		return {
			...notebook,
			folders: foldersByNotebook.get(notebook.id) ?? []
		};
	});
}

export async function getNotebookById(
	id: string,
	executor: NotebookPersistenceExecutor
): Promise<NotebookWithFolders | null> {
	const rows = await executor.select<Record<string, unknown>>(
		'SELECT * FROM notebooks WHERE id = ?',
		[id]
	);
	if (rows.length === 0) return null;

	const notebook = mapNotebook(rows[0]);
	const folderRows = await executor.select<Record<string, unknown>>(
		'SELECT * FROM notebook_folders WHERE notebook_id = ? ORDER BY folder_path ASC',
		[id]
	);

	return {
		...notebook,
		folders: folderRows.map(mapNotebookFolder)
	};
}

export async function createNotebook(
	name: string,
	folderPaths: string[],
	defaultSaveLocation: string | undefined,
	executor: NotebookPersistenceExecutor
): Promise<NotebookWithFolders> {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	// Get max sort order
	const maxRows = await executor.select<Record<string, unknown>>(
		'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM notebooks'
	);
	const sortOrder = (maxRows[0]?.next_sort as number) ?? 0;

	const saveLocation = defaultSaveLocation ?? (folderPaths.length > 0 ? folderPaths[0] : '');

	await executor.execute(
		`INSERT INTO notebooks (id, name, default_save_location, sort_order, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		[id, name, saveLocation, sortOrder, now, now]
	);

	const folders: NotebookFolder[] = [];
	for (const folderPath of folderPaths) {
		const folderId = crypto.randomUUID();
		await executor.execute(
			`INSERT INTO notebook_folders (id, notebook_id, folder_path, added_at, updated_at)
			 VALUES (?, ?, ?, ?, ?)`,
			[folderId, id, folderPath, now, now]
		);
		folders.push({
			id: folderId,
			notebookId: id,
			folderPath,
			addedAt: now,
			updatedAt: now
		});
	}

	return {
		id,
		name,
		defaultSaveLocation: saveLocation,
		sortOrder,
		createdAt: now,
		updatedAt: now,
		folders
	};
}

export async function renameNotebook(
	id: string,
	name: string,
	executor: NotebookPersistenceExecutor
): Promise<void> {
	const now = new Date().toISOString();
	await executor.execute(
		'UPDATE notebooks SET name = ?, updated_at = ? WHERE id = ?',
		[name, now, id]
	);
}

export async function reorderNotebook(
	id: string,
	sortOrder: number,
	executor: NotebookPersistenceExecutor
): Promise<void> {
	const now = new Date().toISOString();
	await executor.execute(
		'UPDATE notebooks SET sort_order = ?, updated_at = ? WHERE id = ?',
		[sortOrder, now, id]
	);
}

export async function setDefaultSaveLocation(
	id: string,
	defaultSaveLocation: string,
	executor: NotebookPersistenceExecutor
): Promise<void> {
	const now = new Date().toISOString();
	await executor.execute(
		'UPDATE notebooks SET default_save_location = ?, updated_at = ? WHERE id = ?',
		[defaultSaveLocation, now, id]
	);
}

export async function deleteNotebook(
	id: string,
	executor: NotebookPersistenceExecutor
): Promise<void> {
	await executor.execute('DELETE FROM notebook_folders WHERE notebook_id = ?', [id]);
	await executor.execute('DELETE FROM notebooks WHERE id = ?', [id]);
	// Note: does NOT delete files on disk — only removes the virtual grouping
}

export async function addFolderToNotebook(
	notebookId: string,
	folderPath: string,
	executor: NotebookPersistenceExecutor
): Promise<NotebookFolder> {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	await executor.execute(
		`INSERT INTO notebook_folders (id, notebook_id, folder_path, added_at, updated_at)
		 VALUES (?, ?, ?, ?, ?)`,
		[id, notebookId, folderPath, now, now]
	);

	return { id, notebookId, folderPath, addedAt: now, updatedAt: now };
}

export async function removeFolderFromNotebook(
	folderId: string,
	executor: NotebookPersistenceExecutor
): Promise<void> {
	await executor.execute('DELETE FROM notebook_folders WHERE id = ?', [folderId]);
}
