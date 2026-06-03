<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	import { getInitializedDatabase } from '$lib/db';
	import { createTauriSqlExecutor, runBrowserImport, type DetectedBrowserSource } from '$lib/import/browser';
	import { parseKoshasAddUrl, persistProtocolCapture } from '$lib/protocol/deep-link';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import type { TabId } from '$lib/components/layout/Sidebar.svelte';
	import Card, { type Item } from '$lib/components/cards/Card.svelte';
	import SearchOverlay from '$lib/components/search/SearchOverlay.svelte';
	import SpacesUI, { type Space } from '$lib/components/spaces/SpacesUI.svelte';
	import NotebookList from '$lib/components/notebooks/NotebookList.svelte';
	import Explorer from '$lib/components/notes/Explorer.svelte';
	import NotebookGrid from '$lib/components/notes/NotebookGrid.svelte';
	import EditorShell from '$lib/components/editor/EditorShell.svelte';
	import QuickNote from '$lib/components/notes/QuickNote.svelte';
	import ForceGraph from '$lib/components/graph/GraphView.svelte';
	import SerendipityPanel from '$lib/components/graph/SerendipityPanel.svelte';
	import { getNotebookState } from '$lib/notebooks/state.svelte';
	import { readFile, writeFile } from '$lib/notes/sync';
	import { parseFrontmatter } from '$lib/notes/frontmatter';
	import { convertWikilinksOnSave } from '$lib/links/converter';
	import { seedDemoData } from '$lib/demo/seed';

	interface ImportProgress {
		browserName: string;
		phase: string;
		current: number;
		total: number;
		message: string;
	}

	interface ImportResult {
		browserName: string;
		importedCount: number;
		inserted: number;
		merged: number;
		sourcesUpserted: number;
	}

	// --- State ---
	let sources = $state<DetectedBrowserSource[]>([]);
	let progressLog = $state<ImportProgress[]>([]);
	let results = $state<ImportResult[]>([]);
	let loadingSources = $state(false);
	let activeImportId = $state<string | null>(null);
	let activeTab = $state<TabId>('collect');
	let statusMessage = $state('Ready');
	let errorMessage = $state<string | null>(null);
	let tauriAvailable = $state(false);
	let items = $state<Item[]>([]);
	let searchOpen = $state(false);
	let showConsole = $state(false);
	let showSpaces = $state(true);
	let counter = $state(0);
	let spaces = $state<Space[]>([]);

	let availableSources = $derived(sources.filter((source) => source.exists));
	let activeSource = $derived(
		activeImportId ? sources.find((source) => source.historyPath === activeImportId) : null
	);
	let ns = $derived(getNotebookState());

	// --- Notes state ---
	let selectedFilePath = $state<string | null>(null);
	let fileContent = $state('');
	let isFocused = $state(false);
	let noteList = $state<{ id: string; filePath: string; title: string; excerpt: string; updatedAt: string; tags: string[]; createdAt: string }[]>([]);
	let noteLoading = $state(false);
	let notesSortBy = $state('updated');

	// --- Notes handlers ---
	async function handleNoteOpen(filePath: string) {
		selectedFilePath = filePath;
		try {
			const content = await readFile(filePath);
			fileContent = content;
		} catch {
			fileContent = '# Error loading file\n\nCould not read file: ' + filePath;
		}
	}

	async function handleNoteSave(path: string, content: string) {
		try {
			// Resolve wikilinks, persist link_references, and convert [[wikilinks]] to koshas:// links
			const db = await getInitializedDatabase();
			const dbExecutor = {
				select: <T>(sql: string, params?: unknown[]) => db.select<T>(sql, params),
				execute: (sql: string, params?: unknown[]) => db.execute(sql, params)
			};

			const { getItemIdForPath } = await import('$lib/links/converter');
			const sourceItemId = await getItemIdForPath(dbExecutor, path);

			let contentToWrite = content;
			if (sourceItemId) {
				// Convert [[wikilinks]] → koshas://item/{uuid} and persist link_references
				contentToWrite = await convertWikilinksOnSave(
					dbExecutor,
					dbExecutor,
					sourceItemId,
					content
				);
			}

			await writeFile(path, contentToWrite);

			// Update local list
			const parsed = parseFrontmatter(contentToWrite);
			noteList = noteList.map((n) =>
				n.filePath === path
					? {
							...n,
							title: (parsed.frontmatter.title as string) || path.split('/').pop()?.replace(/\.md$/, '') || 'Untitled',
							excerpt: parsed.body.split('\n')[0]?.slice(0, 120) || '',
							updatedAt: new Date().toISOString()
						}
					: n
			);
		} catch (e) {
			console.warn('[NoteSave] Error during save:', e);
		}
	}

	async function handleNoteCreated(filePath: string) {
		await loadNotes();
		handleNoteOpen(filePath);
	}

	async function loadNotes() {
		if (!ns.activeNotebook) return;
		noteLoading = true;
		try {
			const db = await getInitializedDatabase();
			const rows = await db.select<Record<string, unknown>[]>(
				`SELECT n.id, n.file_path, i.title, i.body_text, n.created_at, n.updated_at
				 FROM notes n
				 JOIN items i ON i.id = n.item_id
				 WHERE n.notebook_id = ?
				 ORDER BY n.updated_at DESC
				 LIMIT 100`,
				[ns.activeNotebook.id]
			);
			noteList = rows.map((row) => ({
				id: row.id as string,
				filePath: row.file_path as string,
				title: (row.title as string) || (row.file_path as string).split('/').pop()?.replace(/\.md$/, '') || 'Untitled',
				excerpt: ((row.body_text as string) || '').replace(/^---[\s\S]*?---\n*/, '').split('\n')[0]?.slice(0, 120) || '',
				updatedAt: (row.updated_at as string) || (row.created_at as string) || '',
				createdAt: (row.created_at as string) || '',
				tags: []
			}));
		} catch {
			noteList = [];
		} finally {
			noteLoading = false;
		}
	}

	function handleBack() {
		selectedFilePath = null;
		fileContent = '';
	}

	$effect(() => {
		// Reload notes when active notebook changes
		if (ns.activeNotebook && activeTab === 'notes') {
			loadNotes();
		}
	});

	// --- Lifecycle ---
	onMount(() => {
		if (!browser) return;

		void loadSources();
		void loadItems();

		// Auto-seed demo data if empty and in browser
		setTimeout(async () => {
			if (!tauriAvailable && items.length === 0 && !loadingSources) {
				console.log('[Demo] Auto-seeding because app is empty');
				await handleSeedDemo();
			}
		}, 1000);

		const cleanupCallbacks: Array<() => void> = [];

		void import('@tauri-apps/api/event')
			.then(async ({ listen }) => {
				const unlisten = await listen<ImportProgress>('browser-import-progress', (event) => {
					progressLog = [event.payload, ...progressLog].slice(0, 40);
				});
				cleanupCallbacks.push(unlisten);
			})
			.catch(() => {
				tauriAvailable = false;
			});

		void registerDeepLinkHandling(cleanupCallbacks);

		// Keyboard shortcuts
		function handleKeydown(e: KeyboardEvent) {
			if (e.metaKey && e.shiftKey && e.key === 'f') {
				e.preventDefault();
				searchOpen = true;
			}
			if (e.key === 'Escape') {
				searchOpen = false;
			}
			if (e.metaKey && e.key === 'j') {
				e.preventDefault();
				showConsole = !showConsole;
			}
		}
		window.addEventListener('keydown', handleKeydown);
		cleanupCallbacks.push(() => window.removeEventListener('keydown', handleKeydown));

		return () => {
			for (const cleanup of cleanupCallbacks) cleanup();
		};
	});

	async function loadItems() {
		try {
			const database = await getInitializedDatabase();
			const rows = await database.select<Record<string, unknown>[]>('SELECT * FROM items ORDER BY updated_at DESC LIMIT 50');
			items = rows.map(mapRowToItem);
		} catch {
			items = [];
		}
	}

	function mapRowToItem(row: Record<string, unknown>): Item {
		return {
			id: row.id as string,
			itemType: row.item_type as string,
			sourceUrl: row.source_url as string | null,
			normalizedUrl: row.normalized_url as string | null,
			title: row.title as string | null,
			description: row.description as string | null,
			bodyText: row.body_text as string | null,
			thumbnail: row.thumbnail as string | null,
			filePath: row.file_path as string | null,
			metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
			aiTags: row.ai_tags ? JSON.parse(row.ai_tags as string) : null,
			manualTags: row.manual_tags ? JSON.parse(row.manual_tags as string) : null,
			colors: row.colors ? JSON.parse(row.colors as string) : null,
			enrichmentStatus: row.enrichment_status as string | null,
			createdAt: row.created_at as string,
			updatedAt: row.updated_at as string
		};
	}

	async function loadSources() {
		loadingSources = true;
		errorMessage = null;

		try {
			const core = await import('@tauri-apps/api/core').catch(() => null);
			if (!core || !core.invoke) throw new Error('Tauri API not available');
			
			sources = await core.invoke<DetectedBrowserSource[]>('detect_browser_sources');
			tauriAvailable = true;
			statusMessage = sources.length > 0 ? 'Sources checked' : 'No browser sources found';
		} catch (error) {
			tauriAvailable = false;
			statusMessage = 'Demo Mode (Backend Offline)';
			// Mock sources for browser mode
			sources = [
				{
					browserName: 'Chrome',
					profileName: 'Demo Profile',
					historyPath: '/mock/chrome/history',
					bookmarksPath: '/mock/chrome/bookmarks',
					exists: true,
					browserRunning: false
				},
				{
					browserName: 'Brave',
					profileName: 'Demo Profile',
					historyPath: '/mock/brave/history',
					bookmarksPath: null,
					exists: true,
					browserRunning: false
				}
			];
		} finally {
			loadingSources = false;
		}
	}

	async function startImport(source: DetectedBrowserSource) {
		activeImportId = source.historyPath;
		errorMessage = null;
		statusMessage = `Importing ${source.browserName}`;

		try {
			if (tauriAvailable) {
				const core = await import('@tauri-apps/api/core').catch(() => null);
				if (!core || !core.invoke) throw new Error('Tauri API not available');
				
				const result = await runBrowserImport(
					{ invoke: core.invoke, getDatabase: getInitializedDatabase },
					source
				);
				results = [{ browserName: source.browserName, ...result }, ...results];
				statusMessage = `${source.browserName} import complete`;
				counter += result.inserted + result.merged;
			} else {
				// Mock import for browser mode
				await new Promise((resolve) => setTimeout(resolve, 1500));
				const db = await getInitializedDatabase();
				await seedDemoData(db);
				results = [
					{
						browserName: source.browserName,
						importedCount: 10,
						inserted: 10,
						merged: 0,
						sourcesUpserted: 1
					},
					...results
				];
				statusMessage = `Demo: ${source.browserName} history simulated`;
				counter += 10;
			}
			await loadItems();
			if (activeTab === 'notes') await loadNotes();
		} catch (error) {
			errorMessage = formatError(error);
			statusMessage = `${source.browserName} import failed`;
		} finally {
			activeImportId = null;
		}
	}

	async function cancelImport() {
		if (!activeImportId) return;
		try {
			const core = await import('@tauri-apps/api/core').catch(() => null);
			if (core && core.invoke) {
				await core.invoke('cancel_browser_import', { importId: activeImportId });
				statusMessage = 'Cancelling import';
			}
		} catch (error) {
			errorMessage = formatError(error);
		}
	}

	async function handleSeedDemo() {
		try {
			const db = await getInitializedDatabase();
			await seedDemoData(db);
			await loadItems();

			// Reload notebooks and notes
			const nsState = getNotebookState();
			await nsState.loadNotebooks();
			if (activeTab === 'notes') await loadNotes();

			statusMessage = 'Demo data seeded';
		} catch (error) {
			errorMessage = formatError(error);
		}
	}

	async function handleClearData() {
		if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) return;
		try {
			const db = await getInitializedDatabase();
			const tables = ['items', 'sources', 'link_references', 'notebooks', 'notebook_folders', 'notes', 'deleted_items'];
			for (const table of tables) {
				await db.execute(`DELETE FROM ${table}`);
			}
			await loadItems();

			// Clear notebook state
			const nsState = getNotebookState();
			await nsState.loadNotebooks();
			if (activeTab === 'notes') await loadNotes();

			statusMessage = 'Data cleared';
		} catch (error) {
			errorMessage = formatError(error);
		}
	}

	async function registerDeepLinkHandling(cleanupCallbacks: Array<() => void>) {
		try {
			const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
			const currentUrls = await getCurrent();
			if (currentUrls) await handleDeepLinkUrls(currentUrls);

			const unlisten = await onOpenUrl((urls) => {
				void handleDeepLinkUrls(urls);
			});
			cleanupCallbacks.push(unlisten);
		} catch {
			// Deep-link APIs only in Tauri runtime
		}
	}

	async function handleDeepLinkUrls(urls: string[]) {
		const captures = urls.map(parseKoshasAddUrl).filter((capture) => capture !== null);
		if (captures.length === 0) return;

		try {
			const database = await getInitializedDatabase();
			const executor = createTauriSqlExecutor(database);
			for (const capture of captures) {
				await persistProtocolCapture(executor, capture);
			}
			statusMessage = captures.length === 1 ? 'Extension capture saved' : `${captures.length} extension captures saved`;
			tauriAvailable = true;
			counter += captures.length;
			await loadItems();
		} catch (error) {
			errorMessage = formatError(error);
			statusMessage = 'Extension capture failed';
		}
	}

	function formatError(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}

	// Spaces handlers
	function handleSpaceCreate(name: string) {
		const newSpace: Space = {
			id: crypto.randomUUID(),
			name,
			description: null,
			spaceType: 'manual',
			queryDefinition: null,
			sortOrder: spaces.length
		};
		spaces = [...spaces, newSpace];
	}

	function handleSpaceRename(id: string, name: string) {
		spaces = spaces.map((s) => (s.id === id ? { ...s, name } : s));
	}

	function handleSpaceDelete(id: string) {
		spaces = spaces.filter((s) => s.id !== id);
	}
	async function handleTabChange(tab: TabId) {
		activeTab = tab;
		if (tab === 'notes') {
			await loadNotes();
		}
	}
</script>

<AppShell {activeTab} onTabChange={handleTabChange}>
	{#snippet sidebarAside()}
		{#if activeTab === 'notes'}
			<NotebookList onNotebookSelect={() => { handleBack(); }} />
			{#if ns.activeNotebook}
				<Explorer
					folderPaths={ns.activeNotebook.folders.map(f => f.folderPath)}
					onFileSelect={handleNoteOpen}
				/>
			{/if}
		{:else if activeTab === 'graph'}
			<div class="sidebar-section-header">
				<span>Discover</span>
			</div>
			<SerendipityPanel />
		{/if}
	{/snippet}

	<div class="topbar">
		<button type="button" class="search" onclick={() => { searchOpen = true; }}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"/>
				<path d="m21 21-4.35-4.35"/>
			</svg>
			<input
				type="text"
				placeholder="Search…"
				aria-label="Search items"
				onfocus={() => { searchOpen = true; }}
				readonly
			/>
			<kbd class="kbd">⌘⇧F</kbd>
		</button>

		<div class="scope">
			<button type="button" class:on={true}>All</button>
			<button type="button">Collect</button>
		</div>
	</div>

	<div class="content">
		{#if activeTab === 'notes'}
			<div class="content-pad" class:focus-mode={isFocused}>
				<div class="notes-header">
					<div>
						<p class="eyebrow">Notes Sheath</p>
						<h1>Your <em>writing</em> space</h1>
					</div>
					<div class="notes-header-actions">
						<button
							type="button"
							class="focus-toggle"
							class:active={isFocused}
							onclick={() => { isFocused = !isFocused; }}
							aria-label="Toggle focus mode"
							title={isFocused ? 'Exit focus mode' : 'Enter focus mode'}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
							</svg>
							Focus
						</button>
					</div>
				</div>

				{#if selectedFilePath}
					<!-- Editor view -->
					<div class="editor-container">
						<EditorShell
							filePath={selectedFilePath}
							content={fileContent}
							onSave={handleNoteSave}
							onBack={handleBack}
						/>
					</div>
				{:else if ns.activeNotebook}
					<!-- Notebook grid -->
					<NotebookGrid
						notes={noteList}
						notebookName={ns.activeNotebook.name}
						onNoteOpen={handleNoteOpen}
						onSortChange={(s) => { notesSortBy = s; }}
						loading={noteLoading}
					/>
				{:else}
					<!-- Empty state -->
					<div class="notes-placeholder">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
							<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
							<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
						</svg>
						<p>Select or create a notebook from the sidebar to get started.</p>
					</div>
				{/if}
			</div>

			<!-- Quick Note FAB (only in notes mode, not when editing) -->
			{#if activeTab === 'notes' && !selectedFilePath}
				<QuickNote onNoteCreated={handleNoteCreated} />
			{/if}
		{:else if activeTab === 'graph'}
			<div class="graph-tab">
				<ForceGraph height="calc(100vh - var(--titlebar-h, 0px) - 120px)" />
			</div>
		{:else}
			<div class="content-pad">
				<div class="collect-head">
					<div>
						<p class="eyebrow">Collect Sheath</p>
						<h1>Your <em>knowledge</em> garden</h1>
					</div>
					<div class="headrow-sub">
						<span class="pill">{items.length} items</span>
						<span class="pill">{counter > 0 ? `${counter} imported` : 'No imports yet'}</span>
						<div class="demo-controls" style="margin-left:auto;display:flex;gap:8px;">
							<button type="button" class="secondary" onclick={handleSeedDemo} style="font-size:11px;padding:2px 8px;border-radius:4px;">Seed Demo</button>
							<button type="button" class="secondary" onclick={handleClearData} style="font-size:11px;padding:2px 8px;border-radius:4px;opacity:0.6;">Clear</button>
						</div>
					</div>
				</div>

				{#if errorMessage}
					<p class="error" role="alert" style="padding:12px;border:1px solid #d5b2aa;border-radius:8px;background:#fff2ef;color:#77352e;margin-bottom:16px;">{errorMessage}</p>
				{/if}

				{#if !tauriAvailable}
					<div class="notice demo-notice" style="padding:16px;border:1px solid #c2e1d1;border-radius:12px;background:#f0f9f4;margin-bottom:24px;display:flex;flex-direction:column;gap:12px;box-shadow:var(--sh-1);">
						<div style="display:flex;align-items:center;gap:12px;">
							<div style="font-size:24px;">✨</div>
							<div>
								<h3 style="font-size:14px;color:#1e5d40;font-weight:700;">Koshas Browser Demo</h3>
								<p style="font-size:13px;color:#2e7d5a;">Experience the <strong>Collect, Notes, and Graph</strong> sheaths without the desktop app.</p>
							</div>
						</div>
						<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px;padding-top:8px;border-top:1px solid #c2e1d1;">
							<div style="font-size:11px;color:#1e5d40;">
								<strong>1. Collect</strong><br/>Click "Import" below to simulate history capture.
							</div>
							<div style="font-size:11px;color:#1e5d40;">
								<strong>2. Write</strong><br/>Switch to Notes tab, select the notebook, and edit.
							</div>
							<div style="font-size:11px;color:#1e5d40;">
								<strong>3. Connect</strong><br/>Use [[wikilinks]] in notes to build the Graph.
							</div>
						</div>
					</div>
				{/if}

				<!-- Browser Import Section -->
				<div style="margin-bottom:24px;">
					<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
						<h3 style="font-size:15px;">Browser import</h3>
						<button type="button" class="secondary" disabled={loadingSources} onclick={loadSources}
							style="font-size:12px;padding:4px 12px;">
							{loadingSources ? 'Checking' : 'Refresh'}
						</button>
						<button type="button" class="danger" disabled={!activeImportId} onclick={cancelImport}
							style="font-size:12px;padding:4px 12px;">Cancel</button>
						<button type="button" class="secondary" onclick={() => { showConsole = !showConsole; }}
							style="font-size:12px;padding:4px 12px;margin-left:auto;">
							{showConsole ? 'Hide log' : 'Show log'}
						</button>
					</div>

					<div class="source-grid">
						{#each sources as source (source.browserName + source.profileName + source.historyPath)}
							<article style="border:1px solid var(--medium-10);border-radius:8px;background:var(--surface-00);padding:16px;display:grid;gap:12px;" class:muted={!source.exists}>
								<div>
									<h3 style="font-size:15px;">{source.browserName}</h3>
									<p style="font-size:13px;color:var(--fore-secondary);">{source.profileName}</p>
								</div>
								<div style="display:flex;gap:8px;font-size:12px;">
									<span style="border-radius:999px;background:var(--medium-20);padding:2px 8px;" class:warning={source.browserRunning}>
										{source.browserRunning ? 'Quit browser first' : source.exists ? 'Ready' : 'Not found'}
									</span>
								</div>
								<button
									type="button"
									disabled={!source.exists || Boolean(activeImportId)}
									onclick={() => startImport(source)}
									style="padding:6px 14px;border-radius:6px;background:var(--theme-main);color:var(--surface-00);font-weight:600;border:none;">
									{activeSource === source ? 'Importing…' : 'Import'}
								</button>
							</article>
						{:else}
							<div class="empty-state" style="border:1px solid var(--medium-10);border-radius:8px;background:var(--surface-00);padding:24px;">
								<p>{loadingSources ? 'Checking browser sources…' : 'No browser sources detected'}</p>
							</div>
						{/each}
					</div>

					<!-- Console log -->
					{#if showConsole && progressLog.length > 0}
						<div style="margin-top:12px;border:1px solid var(--medium-10);border-radius:8px;background:var(--surface-00);padding:12px;max-height:200px;overflow-y:auto;">
							<p class="eyebrow" style="margin-bottom:8px;">Import log</p>
							{#each progressLog as event, i}
								<div style="font-size:12px;padding:2px 0;display:grid;grid-template-columns:80px 60px 60px 1fr;gap:8px;color:var(--fore-secondary);">
									<span>{event.browserName}</span>
									<span>{event.phase}</span>
									<span>{event.current}/{event.total}</span>
									<span>{event.message}</span>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Recent results -->
					{#if results.length > 0}
						<div style="margin-top:12px;">
							<h3 style="font-size:13px;color:var(--fore-tertiary);margin-bottom:6px;">Recent imports</h3>
							{#each results as result, i}
								<div style="display:flex;gap:12px;font-size:12px;padding:4px 0;">
									<span style="font-weight:500;">{result.browserName}</span>
									<span>{result.inserted} new</span>
									<span>{result.merged} merged</span>
									<span>{result.sourcesUpserted} sources</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Items Grid -->
				<div style="margin-bottom:16px;">
					<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
						<h3 style="font-size:15px;">Items</h3>
						<div class="viewtoggle" style="display:flex;gap:3px;background:var(--surface-20);border:1px solid var(--medium-10);border-radius:8px;padding:3px;">
							<button type="button" class="on" style="width:32px;height:28px;border-radius:6px;">⊞</button>
							<button type="button" style="width:32px;height:28px;border-radius:6px;">≡</button>
						</div>
					</div>

					<div class="grid">
						{#each items as item (item.id)}
							<Card {item} />
						{:else}
							<div class="empty-state" style="grid-column:1/-1;border:1px solid var(--medium-10);border-radius:8px;background:var(--surface-00);padding:48px 24px;">
								<p style="font-size:15px;font-weight:500;">No items yet</p>
								<p style="font-size:13px;color:var(--fore-tertiary);">Import your browser history or use the extension to capture content.</p>
							</div>
						{/each}
					</div>
				</div>

				<!-- Spaces -->
				{#if showSpaces}
					<div style="margin-top:24px;border-top:1px solid var(--medium-10);padding-top:16px;">
						<SpacesUI
							{spaces}
							onCreate={handleSpaceCreate}
							onRename={handleSpaceRename}
							onDelete={handleSpaceDelete}
						/>
					</div>
			{/if}
		</div>
	{/if}
</div>
</AppShell>

<SearchOverlay
	open={searchOpen}
	onClose={() => { searchOpen = false; }}
	onSelect={(result) => {
		// Navigate to item — placeholder
		console.log('Selected:', result.id);
	}}
/>

<style lang="sass">
	article.muted
		opacity: 0.6

	span.warning
		background: #fff0c9 !important
		color: #70500c !important

	.headrow-sub
		display: flex
		align-items: center
		gap: 16px
		color: var(--fore-tertiary)
		font-size: 13px
		margin: 14px 0 24px
		border-bottom: 1px solid var(--medium-10)
		padding-bottom: 18px

		.pill
			font-family: "Google Sans"
			font-size: 11px
			color: var(--fore-secondary)
			background: var(--surface-20)
			border: 1px solid var(--medium-10)
			border-radius: 20px
			padding: 3px 10px

	.notes-header
		display: flex
		align-items: center
		justify-content: space-between
		margin-bottom: 24px

		h1
			font-size: 28px
			font-weight: 600

		.eyebrow
			font-size: 11px
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.04em
			color: var(--fore-tertiary)
			margin-bottom: 4px

	.notes-header-actions
		display: flex
		align-items: center
		gap: 8px

	.focus-toggle
		display: flex
		align-items: center
		gap: 5px
		padding: 5px 12px
		font-size: 12px
		border-radius: 6px
		color: var(--fore-tertiary)
		border: 1px solid var(--medium-10)
		transition: all 0.12s var(--ease)

		&:hover
			background: var(--medium-00)
			color: var(--fore-primary)

		&.active
			background: var(--theme-main)
			color: #fff
			border-color: var(--theme-main)

	.focus-mode
		:global(.topbar)
			display: none

		.notes-header
			margin-bottom: 0

		.notes-header-actions,
		.eyebrow
			display: none

		h1
			font-size: 20px

	.editor-container
		height: calc(100vh - 200px)
		border: 1px solid var(--medium-10)
		border-radius: 10px
		overflow: hidden

	.notes-placeholder
		display: grid
		place-items: center
		gap: 12px
		padding: 64px 24px
		text-align: center
		color: var(--fore-tertiary)
		font-size: 14px
		border: 1px dashed var(--medium-10)
		border-radius: 12px

		& p
			max-width: 320px

	.nl-hint
		font-size: 13px
		color: var(--fore-tertiary)
		margin-top: 4px

	.sidebar-section-header
		padding: 10px 12px 4px
		font-size: 10px
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.05em
		color: var(--fore-quaternary)
</style>
