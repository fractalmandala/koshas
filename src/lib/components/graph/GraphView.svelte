<script lang="ts">
	import { browser } from '$app/environment';
	import ForceGraph from './ForceGraph.svelte';

	interface GraphNode {
		id: string;
		title: string;
		type: string;
	}

	interface GraphLink {
		source: string;
		target: string;
		type: string;
	}

	let {
		height = '100%'
	}: {
		height?: string;
	} = $props();

	let searchQuery = $state('');
	let selectedTypes = $state<Set<string>>(new Set(['bookmark', 'article', 'note', 'item', 'podcast', 'video']));
	let allNodes = $state<GraphNode[]>([]);
	let allLinks = $state<GraphLink[]>([]);
	let loading = $state(true);

	// Debounce search
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let debouncedQuery = $state('');

	const NODE_TYPE_COLORS: Record<string, string> = {
		bookmark: '#6366f1',
		article: '#8b5cf6',
		note: '#ec4899',
		item: '#14b8a6',
		podcast: '#f59e0b',
		video: '#ef4444'
	};

	function getNodeColor(type: string): string {
		return NODE_TYPE_COLORS[type] || '#6366f1';
	}

	$effect(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debouncedQuery = searchQuery;
		}, 200);
		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	// Load all data on mount
	$effect(() => {
		if (browser && allNodes.length === 0) {
			void loadAllData();
		}
	});

	async function loadAllData() {
		loading = true;
		try {
			const { getInitializedDatabase } = await import('$lib/db');
			const db = await getInitializedDatabase();

			const itemRows = (await db.select(
				`SELECT id, COALESCE(title, 'Untitled') as title, COALESCE(item_type, 'item') as type
				 FROM items ORDER BY title`
			)) as Array<{ id: string; title: string; type: string }>;

			const linkRows = (await db.select(
				`SELECT lr.source_item_id, lr.target_item_id, COALESCE(lr.reference_type, 'wikilink') as ref_type
				 FROM link_references lr
				 JOIN items s ON s.id = lr.source_item_id
				 JOIN items t ON t.id = lr.target_item_id`
			)) as Array<{ source_item_id: string; target_item_id: string; ref_type: string }>;

			const nodeMap = new Map<string, GraphNode>();
			for (const row of itemRows) {
				nodeMap.set(row.id, { id: row.id, title: row.title, type: row.type });
			}

			allNodes = Array.from(nodeMap.values());
			allLinks = linkRows
				.filter((l) => nodeMap.has(l.source_item_id) && nodeMap.has(l.target_item_id))
				.map((l) => ({
					source: l.source_item_id,
					target: l.target_item_id,
					type: l.ref_type
				}));

			loading = false;
		} catch (err) {
			console.error('[GraphView] Error loading data:', err);
			loading = false;
		}
	}

	// Get available types from data
	let availableTypes = $derived.by(() => {
		const types = new Set(allNodes.map((n) => n.type));
		return Array.from(types).sort();
	});

	// Filtered nodes and links
	let filteredNodes = $derived.by(() => {
		let result = allNodes;

		// Filter by type
		result = result.filter((n) => selectedTypes.has(n.type));

		// Filter by search query
		if (debouncedQuery.trim()) {
			const q = debouncedQuery.toLowerCase().trim();
			result = result.filter(
				(n) => n.title.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
			);
		}

		return result;
	});

	// Filtered links — only show links where both source and target are in filtered nodes
	let filteredLinks = $derived.by(() => {
		const visibleIds = new Set(filteredNodes.map((n) => n.id));
		return allLinks.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target));
	});

	function toggleType(type: string) {
		const next = new Set(selectedTypes);
		if (next.has(type)) {
			next.delete(type);
		} else {
			next.add(type);
		}
		selectedTypes = next;
	}

	function clearFilters() {
		searchQuery = '';
		selectedTypes = new Set(availableTypes);
	}

	// Check if any filter is active
	let hasActiveFilters = $derived(
		debouncedQuery.trim().length > 0 || selectedTypes.size < allNodes.length
	);
</script>

<div class="graph-view" style="height: {height};">
	<div class="graph-toolbar">
		<div class="search-bar">
			<svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"/>
				<path d="M21 21l-4.35-4.35"/>
			</svg>
			<input
				type="text"
				class="search-input"
				placeholder="Search nodes..."
				bind:value={searchQuery}
				aria-label="Search graph nodes"
			/>
			{#if debouncedQuery}
				<button
					type="button"
					class="clear-btn"
					onclick={() => { searchQuery = ''; }}
					aria-label="Clear search"
				>
					&times;
				</button>
			{/if}
		</div>

		<div class="filter-chips">
			{#each availableTypes as type}
				<button
					type="button"
					class="chip"
					class:active={selectedTypes.has(type)}
					onclick={() => toggleType(type)}
				>
					<span class="chip-indicator" style="background: {getNodeColor(type)}"></span>
					{type}
				</button>
			{/each}
		</div>

		{#if hasActiveFilters}
			<button type="button" class="clear-all-btn" onclick={clearFilters}>
				Clear filters
			</button>
		{/if}

		<div class="node-count">
			{filteredNodes.length} / {allNodes.length} nodes
		</div>
	</div>

	{#if filteredNodes.length === 0 && !loading}
		<div class="graph-empty">
			<span>No nodes match your search.</span>
			<button type="button" class="clear-filters-link" onclick={clearFilters}>Clear filters</button>
		</div>
	{:else}
		<ForceGraph
			nodes={filteredNodes}
			links={filteredLinks}
			loadFromDb={false}
			{height}
		/>
	{/if}
</div>

<style lang="sass">
	.graph-view
		display: flex
		flex-direction: column
		overflow: hidden

	.graph-toolbar
		display: flex
		align-items: center
		gap: 8px
		padding: 8px 12px
		border-bottom: 1px solid var(--medium-10)
		background: var(--surface-00)
		flex-wrap: wrap

	.search-bar
		display: flex
		align-items: center
		gap: 6px
		background: var(--surface-20)
		border: 1px solid var(--medium-10)
		border-radius: 6px
		padding: 4px 8px
		flex: 1
		min-width: 160px
		max-width: 280px

		.search-icon
			flex-shrink: 0
			color: var(--fore-tertiary)

		.search-input
			flex: 1
			border: none
			background: none
			font-size: 12px
			color: var(--fore-primary)
			outline: none
			padding: 2px 0

			&::placeholder
				color: var(--fore-quaternary)

		.clear-btn
			border: none
			background: none
			font-size: 16px
			line-height: 1
			color: var(--fore-tertiary)
			cursor: pointer
			padding: 0 2px

			&:hover
				color: var(--fore-primary)

	.filter-chips
		display: flex
		gap: 4px
		flex-wrap: wrap

	.chip
		display: flex
		align-items: center
		gap: 4px
		padding: 3px 8px
		border-radius: 12px
		font-size: 10px
		font-weight: 500
		text-transform: capitalize
		border: 1px solid var(--medium-10)
		background: var(--surface-20)
		color: var(--fore-tertiary)
		cursor: pointer
		transition: all 0.12s ease

		&.active
			background: var(--surface-10)
			color: var(--fore-primary)
			border-color: var(--medium-20)

		&:hover
			border-color: var(--medium-20)

		.chip-indicator
			width: 6px
			height: 6px
			border-radius: 50%
			display: inline-block

	.clear-all-btn
		font-size: 11px
		padding: 3px 10px
		border-radius: 4px
		border: 1px solid var(--medium-10)
		background: none
		color: var(--fore-secondary)
		cursor: pointer

		&:hover
			background: var(--medium-00)

	.node-count
		font-size: 11px
		color: var(--fore-quaternary)
		margin-left: auto
		white-space: nowrap

	.graph-empty
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		gap: 8px
		height: 100%
		min-height: 200px
		font-size: 13px
		color: var(--fore-tertiary)

		.clear-filters-link
			font-size: 12px
			padding: 4px 12px
			border-radius: 4px
			border: 1px solid var(--medium-10)
			background: none
			color: var(--theme-main, #6366f1)
			cursor: pointer
</style>
