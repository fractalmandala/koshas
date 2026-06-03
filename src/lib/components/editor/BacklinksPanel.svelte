<script lang="ts">
	import { browser } from '$app/environment';

	let {
		filePath = '',
		currentItemId = ''
	}: {
		filePath?: string;
		currentItemId?: string;
	} = $props();

	let backlinks = $state<Array<{ id: string; sourceTitle: string; sourceItemType: string }>>([]);
	let loading = $state(false);
	let collapsed = $state(false);

	// Load backlinks when the file/item changes
	$effect(() => {
		if (browser) {
			const key = filePath + '|' + currentItemId;
			void loadBacklinks(key);
		}
	});

	async function loadBacklinks(key: string) {
		if (!currentItemId && !filePath) {
			backlinks = [];
			return;
		}

		loading = true;
		try {
			const { getInitializedDatabase } = await import('$lib/db');
			const db = await getInitializedDatabase();

			// Resolve the current item id if not provided
			let targetId = currentItemId;
			if (!targetId && filePath) {
				const rows = (await db.select(
					`SELECT item_id FROM notes WHERE file_path = ? LIMIT 1`,
					[filePath]
				)) as Array<{ item_id: string }>;
				if (rows.length > 0) targetId = rows[0].item_id;
			}

			if (!targetId) {
				backlinks = [];
				return;
			}

			const rows = (await db.select(
				`SELECT lr.id, COALESCE(i.title, 'Untitled') as source_title, COALESCE(i.item_type, 'note') as source_item_type
				 FROM link_references lr
				 JOIN items i ON i.id = lr.source_item_id
				 WHERE lr.target_item_id = ?
				 ORDER BY lr.created_at DESC
				 LIMIT 50`,
				[targetId]
			)) as Array<{ id: string; source_title: string; source_item_type: string }>;

			// Map snake_case from DB to camelCase for the component
			backlinks = rows.map((r) => ({
				id: r.id,
				sourceTitle: r.source_title,
				sourceItemType: r.source_item_type
			}));

			// Guard against stale updates
			const currentKey = filePath + '|' + currentItemId;
			if (currentKey !== key) return;
		} catch (err) {
			console.warn('[BacklinksPanel] Error loading backlinks:', err);
			backlinks = [];
		} finally {
			loading = false;
		}
	}

	function handleNavigate(id: string, title: string) {
		// Emit navigate event for parent to handle
		const event = new CustomEvent('navigate', {
			detail: { target: id, source: 'backlinks', title },
			bubbles: true
		});
		document.dispatchEvent(event);
	}
</script>

<div class="backlinks-panel" class:collapsed>
	<button
		type="button"
		class="backlinks-header"
		onclick={() => { collapsed = !collapsed; }}
		aria-expanded={!collapsed}
	>
		<svg
			class="chevron"
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="M9 18l6-6-6-6"/>
		</svg>
		<span>Backlinks</span>
		<span class="count">{backlinks.length}</span>
	</button>

	{#if !collapsed}
		<div class="backlinks-body">
			{#if loading}
				<div class="backlinks-status">Loading...</div>
			{:else if backlinks.length === 0}
				<div class="backlinks-empty">
					No backlinks yet.
					<span class="hint">Create [[wikilinks]] in other notes to link here.</span>
				</div>
			{:else}
				<ul class="backlinks-list">
					{#each backlinks as link}
						<li class="backlink-item">
							<button
								type="button"
								class="backlink-btn"
								onclick={() => handleNavigate(link.id, link.sourceTitle)}
							>
								<span class="backlink-title">{link.sourceTitle}</span>
								<span class="backlink-type">{link.sourceItemType}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style lang="sass">
	.backlinks-panel
		border-top: 1px solid var(--medium-00)
		background: var(--surface-20)

	.backlinks-header
		display: flex
		align-items: center
		gap: 6px
		width: 100%
		padding: 8px 12px
		font-size: 12px
		font-weight: 600
		color: var(--fore-secondary)
		cursor: pointer
		transition: background 0.12s ease
		border: none
		background: none

		&:hover
			background: var(--medium-00)

		.chevron
			transition: transform 0.15s ease

		.collapsed &
			.chevron
				transform: rotate(-90deg)

		.count
			margin-left: auto
			background: var(--medium-00)
			border-radius: 10px
			padding: 0 6px
			font-size: 10px
			font-weight: 500
			color: var(--fore-tertiary)

	.backlinks-body
		padding: 4px 8px 8px

	.backlinks-status
		padding: 12px
		text-align: center
		font-size: 12px
		color: var(--fore-tertiary)

	.backlinks-empty
		padding: 16px 12px
		text-align: center
		font-size: 12px
		color: var(--fore-tertiary)
		line-height: 1.5

		.hint
			display: block
			margin-top: 4px
			font-size: 11px
			color: var(--fore-quaternary)
			font-style: italic

	.backlinks-list
		list-style: none
		padding: 0
		margin: 0
		display: flex
		flex-direction: column
		gap: 2px

	.backlink-item
		margin: 0

	.backlink-btn
		display: flex
		align-items: center
		gap: 8px
		width: 100%
		padding: 6px 8px
		border-radius: 4px
		font-size: 12px
		cursor: pointer
		transition: background 0.12s ease
		border: none
		background: none
		text-align: left
		color: var(--fore-primary)

		&:hover
			background: var(--medium-00)

	.backlink-title
		font-weight: 500
		flex: 1
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	.backlink-type
		font-size: 10px
		color: var(--fore-tertiary)
		background: var(--medium-00)
		border-radius: 3px
		padding: 1px 5px
		text-transform: uppercase
		letter-spacing: 0.03em
</style>
