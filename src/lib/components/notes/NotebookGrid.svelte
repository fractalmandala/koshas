<script lang="ts">
	import ViewSwitcher, { type EditorMode } from '$lib/components/editor/ViewSwitcher.svelte';

	export type ViewStyle = 'grid' | 'list';

	interface NoteEntry {
		id: string;
		filePath: string;
		title: string;
		createdAt: string;
		updatedAt: string;
		tags: string[];
		excerpt: string;
	}

	let {
		notes = [] as NoteEntry[],
		notebookName = '',
		onNoteOpen = (_filePath: string) => {},
		onSortChange = (_sort: string) => {},
		loading = false
	}: {
		notes?: NoteEntry[];
		notebookName?: string;
		onNoteOpen?: (filePath: string) => void;
		onSortChange?: (sort: string) => void;
		loading?: boolean;
	} = $props();

	let viewStyle = $state<ViewStyle>('grid');
	let sortBy = $state('updated');

	function handleSortChange(newSort: string) {
		sortBy = newSort;
		onSortChange(newSort);
	}

	function getTags(tags: string[]): string[] {
		return tags ?? [];
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return iso;
		}
	}

	function getFirstLine(content: string): string {
		const body = content.replace(/^---[\s\S]*?---\n*/, '').trim();
		return body.split('\n')[0]?.slice(0, 120) ?? 'No content';
	}
</script>

<div class="notebook-grid">
	<div class="ng-header">
		<div class="ng-header-left">
			<h2>{notebookName}</h2>
			<span class="ng-count">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
		</div>
		<div class="ng-header-right">
			<select class="ng-sort" bind:value={sortBy} onchange={() => handleSortChange(sortBy)}>
				<option value="updated">Last updated</option>
				<option value="created">Date created</option>
				<option value="title">Title A-Z</option>
			</select>
			<div class="ng-view-toggle">
				<button
					type="button"
					class="ng-view-btn"
					class:active={viewStyle === 'grid'}
					onclick={() => { viewStyle = 'grid'; }}
					aria-label="Grid view"
					title="Grid view"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
						<rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
					</svg>
				</button>
				<button
					type="button"
					class="ng-view-btn"
					class:active={viewStyle === 'list'}
					onclick={() => { viewStyle = 'list'; }}
					aria-label="List view"
					title="List view"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
						<line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
						<line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
					</svg>
				</button>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="ng-loading">
			<div class="ng-loading-pulse"></div>
			<div class="ng-loading-pulse"></div>
			<div class="ng-loading-pulse"></div>
		</div>
	{:else if notes.length === 0}
		<div class="ng-empty">
			<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
				<polyline points="14 2 14 8 20 8"/>
			</svg>
			<p>No notes yet in this notebook.</p>
			<p class="ng-empty-sub">Create a note using Quick Note (bottom-right button) or open a markdown file from the Explorer.</p>
		</div>
	{:else if viewStyle === 'grid'}
		<div class="ng-items-grid">
			{#each notes as note (note.id)}
				<button type="button" class="ng-card" onclick={() => onNoteOpen(note.filePath)}>
					<div class="ng-card-body">
						<h3 class="ng-card-title">{note.title || 'Untitled'}</h3>
						<p class="ng-card-excerpt">{note.excerpt}</p>
					</div>
					<div class="ng-card-footer">
						<div class="ng-card-tags">
							{#each getTags(note.tags).slice(0, 3) as tag}
								<span class="ng-tag">{tag}</span>
							{/each}
						</div>
						<span class="ng-card-date">{formatDate(note.updatedAt)}</span>
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<div class="ng-items-list">
			{#each notes as note (note.id)}
				<button type="button" class="ng-row" onclick={() => onNoteOpen(note.filePath)}>
					<div class="ng-row-icon">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14 2 14 8 20 8"/>
						</svg>
					</div>
					<div class="ng-row-content">
						<span class="ng-row-title">{note.title || 'Untitled'}</span>
						<span class="ng-row-excerpt">{note.excerpt}</span>
					</div>
					<div class="ng-row-tags">
						{#each getTags(note.tags).slice(0, 2) as tag}
							<span class="ng-tag">{tag}</span>
						{/each}
					</div>
					<span class="ng-row-date">{formatDate(note.updatedAt)}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style lang="sass">
	.notebook-grid
		padding: 0

	.ng-header
		display: flex
		align-items: center
		justify-content: space-between
		margin-bottom: 20px
		flex-wrap: wrap
		gap: 12px

		&-left
			display: flex
			align-items: baseline
			gap: 10px

			h2
				font-size: 20px
				font-weight: 600

		&-right
			display: flex
			align-items: center
			gap: 10px

	.ng-count
		font-size: 13px
		color: var(--fore-tertiary)

	.ng-sort
		padding: 5px 8px
		font-size: 12px
		border: 1px solid var(--medium-10)
		border-radius: 6px
		background: var(--surface-10)
		color: var(--fore-primary)
		outline: none

	.ng-view-toggle
		display: flex
		gap: 2px
		padding: 2px
		background: var(--surface-20)
		border: 1px solid var(--medium-10)
		border-radius: 6px

	.ng-view-btn
		display: grid
		place-items: center
		width: 28px
		height: 26px
		border-radius: 4px
		color: var(--fore-tertiary)

		&.active
			background: var(--surface-00)
			color: var(--fore-primary)
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1)

	.ng-loading
		display: flex
		flex-direction: column
		gap: 12px
		padding: 24px

		&-pulse
			height: 80px
			background: var(--medium-00)
			border-radius: 8px
			animation: shimmer 1.5s ease-in-out infinite

	@keyframes shimmer
		0%, 100%
			opacity: 0.3
		50%
			opacity: 0.6

	.ng-empty
		display: grid
		place-items: center
		gap: 12px
		padding: 64px 24px
		text-align: center
		color: var(--fore-tertiary)

		p
			font-size: 14px

		&-sub
			font-size: 12px !important
			max-width: 360px

	.ng-items-grid
		display: grid
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))
		gap: 12px

	.ng-card
		display: flex
		flex-direction: column
		text-align: left
		border: 1px solid var(--medium-10)
		border-radius: 10px
		background: var(--surface-00)
		padding: 16px
		cursor: pointer
		transition: all 0.12s var(--ease)

		&:hover
			border-color: var(--medium-20)
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06)

		&-body
			flex: 1

		&-title
			font-size: 15px
			font-weight: 600
			margin-bottom: 6px
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap

		&-excerpt
			font-size: 13px
			color: var(--fore-secondary)
			overflow: hidden
			text-overflow: ellipsis
			display: -webkit-box
			-webkit-line-clamp: 2
			-webkit-box-orient: vertical
			margin-bottom: 12px

		&-footer
			display: flex
			align-items: center
			justify-content: space-between
			gap: 8px

		&-tags
			display: flex
			gap: 4px
			flex: 1
			overflow: hidden

		&-date
			font-size: 11px
			color: var(--fore-tertiary)
			flex-shrink: 0

	.ng-tag
		font-size: 10px
		padding: 1px 6px
		border-radius: 999px
		background: var(--medium-00)
		color: var(--fore-secondary)

	.ng-items-list
		display: flex
		flex-direction: column
		border: 1px solid var(--medium-10)
		border-radius: 10px
		overflow: hidden

	.ng-row
		display: flex
		align-items: center
		gap: 12px
		padding: 10px 16px
		text-align: left
		border-bottom: 1px solid var(--medium-00)
		cursor: pointer
		transition: background 0.1s var(--ease)

		&:last-child
			border-bottom: none

		&:hover
			background: var(--medium-00)

		&-icon
			color: var(--fore-tertiary)
			flex-shrink: 0

		&-content
			flex: 1
			min-width: 0

		&-title
			display: block
			font-size: 14px
			font-weight: 500
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap

		&-excerpt
			display: block
			font-size: 12px
			color: var(--fore-tertiary)
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap

		&-tags
			display: flex
			gap: 4px
			flex-shrink: 0

		&-date
			font-size: 12px
			color: var(--fore-tertiary)
			flex-shrink: 0
			width: 80px
			text-align: right
</style>
