<script lang="ts">
	import { searchItems, type ItemSearchResult } from '$lib/search/items';
	import { getInitializedDatabase } from '$lib/db';
	import { searchNotes, type NoteSearchResult } from '$lib/notes/search';

	let {
		open = false,
		onClose = () => {},
		onSelect = (_item: ItemSearchResult) => {}
	}: {
		open?: boolean;
		onClose?: () => void;
		onSelect?: (item: ItemSearchResult) => void;
	} = $props();

	let query = $state('');
	let results = $state<ItemSearchResult[]>([]);
	let notesResults = $state<NoteSearchResult[]>([]);
	let grouped = $state<Record<string, ItemSearchResult[]>>({});
	let focusedIndex = $state(0);
	let flatResults = $state<ItemSearchResult[]>([]);
	let loading = $state(false);

	$effect(() => {
		if (!open) {
			query = '';
			results = [];
			notesResults = [];
			grouped = {};
			flatResults = [];
		}
	});

	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	$effect(() => {
		if (query.length < 1) {
			results = [];
			notesResults = [];
			grouped = {};
			flatResults = [];
			return;
		}

		loading = true;

		const timer = setTimeout(async () => {
			try {
				const database = await getInitializedDatabase();
				const executor = {
					select: <T>(sql: string, params: unknown[]) => database.select<T[]>(sql, params)
				};
				const [hits, notes] = await Promise.all([
					searchItems(executor, { query, limit: 20 }),
					searchNotes(query)
				]);
				results = hits;
				notesResults = notes;
				const g: Record<string, ItemSearchResult[]> = {};
				for (const hit of hits) {
					const type = hit.itemType || 'other';
					if (!g[type]) g[type] = [];
					g[type].push(hit);
				}
				// Add notes group
				if (notes.length > 0) {
					g['note'] = notes.map((n): ItemSearchResult => ({
						id: n.noteId,
						title: n.title,
						description: n.snippet,
						itemType: 'note',
						sourceUrl: n.filePath,
						normalizedUrl: n.filePath,
						bodyText: n.snippet,
						ocrText: null,
						summary: null,
						thumbnail: null,
						filePath: n.filePath,
						seenAt: null,
						updatedAt: '',
						rank: n.score
					}));
				}
				grouped = g;
				flatResults = hits;
				focusedIndex = 0;
			} catch {
				results = [];
				notesResults = [];
				grouped = {};
				flatResults = [];
			} finally {
				loading = false;
			}
		}, 150);

		return () => clearTimeout(timer);
	});

	let groupKeys = $derived(Object.keys(grouped));
	let resultCount = $derived(flatResults.length);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusedIndex = Math.min(focusedIndex + 1, flatResults.length - 1);
			return;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusedIndex = Math.max(focusedIndex - 1, 0);
			return;
		}

		if (e.key === 'Enter' && flatResults[focusedIndex]) {
			e.preventDefault();
			onSelect(flatResults[focusedIndex]);
			onClose();
			return;
		}
	}

	function formatType(type: string): string {
		return type.charAt(0).toUpperCase() + type.slice(1) + 's';
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="search-overlay" role="dialog" aria-label="Search" tabindex="-1" onclick={onClose}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div class="search-modal" role="document" onclick={(e) => e.stopPropagation()} onkeydown={handleKeydown}>
			<div class="search-input-wrap">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8"/>
					<path d="m21 21-4.35-4.35"/>
				</svg>
				<input
					bind:value={query}
					placeholder="Search items, notes, and more…"
					aria-label="Search query"
					bind:this={inputEl}
				/>
				<kbd class="kbd">ESC</kbd>
			</div>

			{#if loading}
				<div class="empty-state">
					<p>Searching…</p>
				</div>
			{:else if query && resultCount === 0}
				<div class="empty-state">
					<p>No results for "{query}"</p>
				</div>
			{:else if query.length > 0}
				<div class="search-results">
					{#each groupKeys as type (type)}
						<div class="search-group">
							<div class="sg-label">{formatType(type)} ({grouped[type].length})</div>
							{#each grouped[type] as result, i}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="search-result-item"
									class:focused={flatResults[focusedIndex] === result}
									onclick={() => { onSelect(result); onClose(); }}
								>
									<div>
										<div class="sri-title">{result.title ?? 'Untitled'}</div>
										{#if result.description}
											<div class="sri-desc">{result.description}</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{/if}

			{#if query && resultCount > 0}
				<div class="search-filters">
					<button type="button" class="filter-chip active">All</button>
					{#each groupKeys as type (type)}
						<button type="button" class="filter-chip">{formatType(type)}</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
