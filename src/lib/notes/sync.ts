export interface FileEvent {
	kind: 'create' | 'modify' | 'delete';
	path: string;
	name: string;
}

export interface ScannedFile {
	path: string;
	name: string;
	extension: string;
	is_dir: boolean;
	file_size: number | null;
	modified_at: string | null;
}

type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

let invokeFn: TauriInvoke | null = null;

async function getInvoke(): Promise<TauriInvoke | null> {
	if (invokeFn) return invokeFn;
	try {
		// More robust import for different environments
		const core = await import('@tauri-apps/api/core').catch(() => null);
		if (core && typeof core.invoke === 'function') {
			invokeFn = core.invoke as TauriInvoke;
			return invokeFn;
		}
		return null;
	} catch {
		return null;
	}
}

export async function scanDirectory(path: string): Promise<ScannedFile[]> {
	const inv = await getInvoke();
	if (!inv) return [];
	return inv<ScannedFile[]>('scan_notebook_directory', { path });
}

export async function collectMarkdownFiles(path: string): Promise<string[]> {
	const inv = await getInvoke();
	if (!inv) return [];
	return inv<string[]>('collect_markdown_files', { path });
}

// In-memory mock storage for browser mode
const browserFileStorage: Record<string, string> = {};

export async function readFile(path: string): Promise<string> {
	const inv = await getInvoke();
	if (!inv) {
		// Fallback to in-memory/localStorage for demo
		const content = browserFileStorage[path] || localStorage.getItem(`file:${path}`);
		if (content === null) {
			console.warn(`[Sync] Mock file not found: ${path}`);
			throw new Error(`Could not read file: ${path}`);
		}
		return content;
	}
	return inv<string>('read_file', { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
	const inv = await getInvoke();
	if (!inv) {
		// Fallback to in-memory/localStorage for demo
		console.log(`[Sync] Mock writeFile: ${path}`);
		browserFileStorage[path] = content;
		localStorage.setItem(`file:${path}`, content);
		return;
	}
	return inv<void>('write_file', { path, content });
}

export async function deleteFile(path: string): Promise<void> {
	const inv = await getInvoke();
	if (!inv) return;
	return inv<void>('delete_file_rust', { path });
}

export async function addWatchPath(path: string): Promise<void> {
	const inv = await getInvoke();
	if (!inv) return;
	return inv<void>('add_watch_path', { path });
}

export async function removeWatchPath(path: string): Promise<void> {
	const inv = await getInvoke();
	if (!inv) return;
	return inv<void>('remove_watch_path', { path });
}

export async function startWatching(notebookFolderPaths: string[]): Promise<void> {
	const inv = await getInvoke();
	if (!inv) return;

	// Register all notebook folders as watch paths
	for (const folderPath of notebookFolderPaths) {
		try {
			await inv<void>('add_watch_path', { path: folderPath });
		} catch {
			// Path might not exist yet
		}
	}

	// Start the watcher
	try {
		await inv<void>('start_file_watching', {});
	} catch {
		// Watcher might already be running
	}
}

/**
 * Listen for file watcher events and update the DB accordingly.
 */
export function listenForFileChanges(callback?: (events: FileEvent[]) => void): () => void {
	let unlisten: (() => void) | null = null;

	import('@tauri-apps/api/event')
		.then(async (eventApi) => {
			if (!eventApi || typeof eventApi.listen !== 'function') return;
			const unlistenFn = await eventApi.listen<FileEvent>('fs-watcher-event', (event) => {
				if (callback) {
					callback([event.payload]);
				}
			});
			unlisten = unlistenFn;
		})
		.catch(() => {});

	return () => {
		if (unlisten) unlisten();
	};
}
