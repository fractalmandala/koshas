<script lang="ts">
	let {
		frontmatter = {} as Record<string, unknown>,
		filePath = '',
		onUpdate = (_fields: Record<string, unknown>) => {}
	}: {
		frontmatter?: Record<string, unknown>;
		filePath?: string;
		onUpdate?: (fields: Record<string, unknown>) => void;
	} = $props();

	let tagsString = $state<string>((frontmatter.tags as string[])?.join(', ') || '');
	let localTitle = $state<string>((frontmatter.title as string) || '');
	let localType = $state<string>((frontmatter.type as string) || '');
	let isExpanded = $state(true);

	$effect(() => {
		localTitle = (frontmatter.title as string) || '';
		tagsString = (frontmatter.tags as string[])?.join(', ') || '';
		localType = (frontmatter.type as string) || '';
	});

	function emitUpdate() {
		const tags = tagsString
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
		onUpdate({
			...frontmatter,
			title: localTitle || undefined,
			type: localType || undefined,
			tags: tags.length > 0 ? tags : undefined
		});
	}

	function getFileExtension(path: string): string {
		const ext = path.split('.').pop();
		return ext ? `.${ext}` : '';
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return iso;
		}
	}
</script>

<div class="meta-panel" class:collapsed={!isExpanded}>
	<div class="meta-header" onclick={() => { isExpanded = !isExpanded; }}>
		<h3>Metadata</h3>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
			class:rotated={!isExpanded}>
			<path d="M6 9l6 6 6-6"/>
		</svg>
	</div>

	{#if isExpanded}
		<div class="meta-body">
			<div class="meta-field">
				<label for="meta-title">Title</label>
				<input
					id="meta-title"
					type="text"
					bind:value={localTitle}
					oninput={emitUpdate}
					placeholder="Untitled"
				/>
			</div>

			<div class="meta-field">
				<label for="meta-type">Type</label>
				<select id="meta-type" bind:value={localType} onchange={emitUpdate}>
					<option value="">Default</option>
					<option value="article">Article</option>
					<option value="note">Note</option>
					<option value="journal">Journal</option>
					<option value="bookmark">Bookmark</option>
					<option value="draft">Draft</option>
				</select>
			</div>

			<div class="meta-field">
				<label for="meta-tags">Tags</label>
				<input
					id="meta-tags"
					type="text"
					bind:value={tagsString}
					oninput={emitUpdate}
					placeholder="tag1, tag2, tag3"
				/>
				<p class="meta-hint">Comma-separated</p>
			</div>

			<div class="meta-divider"></div>

			<div class="meta-info">
				<div class="meta-info-row">
					<span class="meta-info-label">Path</span>
					<span class="meta-info-value" title={filePath}>{filePath.split('/').pop() || '-'}</span>
				</div>
				{#if frontmatter.created}
					<div class="meta-info-row">
						<span class="meta-info-label">Created</span>
						<span class="meta-info-value">{formatDate(frontmatter.created as string)}</span>
					</div>
				{/if}
				{#if frontmatter.updated}
					<div class="meta-info-row">
						<span class="meta-info-label">Updated</span>
						<span class="meta-info-value">{formatDate(frontmatter.updated as string)}</span>
					</div>
				{/if}
				<div class="meta-info-row">
					<span class="meta-info-label">Format</span>
					<span class="meta-info-value">{getFileExtension(filePath) || '.md'}</span>
				</div>
			</div>
		</div>
	{/if}
</div>

<style lang="sass">
	.meta-panel
		width: 240px
		background: var(--surface-20)
		border-left: 1px solid var(--medium-00)
		overflow-y: auto
		flex-shrink: 0

		&.collapsed
			width: auto

	.meta-header
		display: flex
		align-items: center
		justify-content: space-between
		padding: 10px 12px
		cursor: pointer
		border-bottom: 1px solid var(--medium-00)

		h3
			font-size: 11px
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.04em
			color: var(--fore-tertiary)

		svg
			transition: transform 0.15s var(--ease)
			color: var(--fore-tertiary)

			&.rotated
				transform: rotate(-90deg)

	.meta-body
		padding: 12px

	.meta-field
		margin-bottom: 12px

		label
			display: block
			font-size: 11px
			font-weight: 500
			color: var(--fore-tertiary)
			margin-bottom: 3px

		input, select
			width: 100%
			padding: 6px 8px
			font-size: 12px
			border: 1px solid var(--medium-10)
			border-radius: 5px
			background: var(--surface-00)
			color: var(--fore-primary)
			outline: none

			&:focus
				border-color: var(--theme-main)

		.meta-hint
			font-size: 10px
			color: var(--fore-tertiary)
			margin-top: 2px

	.meta-divider
		height: 1px
		background: var(--medium-10)
		margin: 12px 0

	.meta-info
		display: flex
		flex-direction: column
		gap: 6px

	.meta-info-row
		display: flex
		flex-direction: column
		gap: 1px

		.meta-info-label
			font-size: 10px
			color: var(--fore-tertiary)
			text-transform: uppercase
			letter-spacing: 0.03em

		.meta-info-value
			font-size: 12px
			color: var(--fore-secondary)
			word-break: break-all
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap
</style>
