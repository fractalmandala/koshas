<script lang="ts">
	import ViewSwitcher, { type EditorMode } from './ViewSwitcher.svelte';
	import CodeMirrorEditor from './CodeMirrorEditor.svelte';
	import TipTapEditor from './TipTapEditor.svelte';
	import MarkdownPreview from './MarkdownPreview.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import { parseFrontmatter, serializeFrontmatter, updateFrontmatterFields } from '$lib/notes/frontmatter';

	let {
		filePath = '',
		content = '',
		onSave = (_path: string, _content: string) => {},
		onBack = () => {}
	}: {
		filePath?: string;
		content?: string;
		onSave?: (path: string, content: string) => void;
		onBack?: () => void;
	} = $props();

	let mode = $state<EditorMode>('wysiwyg');
	let showMetadata = $state(true);
	let isDirty = $state(false);

	// Parse frontmatter
	let fm = $derived(parseFrontmatter(content));
	let body = $state(fm.body);
	let frontmatter = $state(fm.frontmatter);

	$effect(() => {
		const parsed = parseFrontmatter(content);
		body = parsed.body;
		frontmatter = parsed.frontmatter;
	});

	function handleContentChange(newBody: string) {
		body = newBody;
		isDirty = true;
	}

	function handleFrontmatterUpdate(updated: Record<string, unknown>) {
		frontmatter = { ...frontmatter, ...updated };
		isDirty = true;
	}

	function handleSave() {
		const fullContent = serializeFrontmatter(frontmatter, body);
		onSave(filePath, fullContent);
		isDirty = false;
	}

	function getFileName(path: string): string {
		return path.split('/').pop() ?? 'untitled';
	}
</script>

<div class="editor-shell">
	<div class="editor-toolbar">
		<div class="editor-toolbar-left">
			<button type="button" class="back-btn" onclick={onBack} aria-label="Back to notebook">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M19 12H5M12 19l-7-7 7-7"/>
				</svg>
			</button>
			<span class="file-name">{getFileName(filePath)}</span>
			{#if isDirty}
				<span class="dirty-badge">Unsaved</span>
			{/if}
		</div>
		<div class="editor-toolbar-center">
			<ViewSwitcher {mode} onModeChange={(m) => { mode = m; }} />
		</div>
		<div class="editor-toolbar-right">
			<button
				type="button"
				class="meta-toggle"
				onclick={() => { showMetadata = !showMetadata; }}
				aria-label="Toggle metadata"
				title="Toggle metadata"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
					<line x1="16" y1="13" x2="8" y2="13"/>
					<line x1="16" y1="17" x2="8" y2="17"/>
				</svg>
			</button>
			<button type="button" class="save-btn" onclick={handleSave} disabled={!isDirty}>
				Save
			</button>
		</div>
	</div>

	<div class="editor-body">
		<div class="editor-main" class:with-metadata={showMetadata}>
			{#if mode === 'wysiwyg'}
				<TipTapEditor value={body} onChange={handleContentChange} />
			{:else if mode === 'source'}
				<CodeMirrorEditor value={body} onChange={handleContentChange} />
			{:else if mode === 'preview'}
				<MarkdownPreview markdown={body} />
			{/if}
		</div>

		{#if showMetadata}
			<MetadataPanel
				frontmatter={frontmatter}
				filePath={filePath}
				onUpdate={handleFrontmatterUpdate}
			/>
		{/if}
	</div>
</div>

{#if isDirty}
	<div class="save-bar">
		<span>You have unsaved changes</span>
		<button type="button" class="secondary" onclick={handleSave}>Save now</button>
	</div>
{/if}

<style lang="sass">
	.editor-shell
		display: flex
		flex-direction: column
		height: 100%
		position: relative

	.editor-toolbar
		display: flex
		align-items: center
		justify-content: space-between
		padding: 8px 16px
		border-bottom: 1px solid var(--medium-00)
		background: var(--surface-20)
		gap: 12px

		&-left
			display: flex
			align-items: center
			gap: 8px

		&-center
			flex: 1
			display: flex
			justify-content: center

		&-right
			display: flex
			align-items: center
			gap: 8px

	.back-btn
		display: grid
		place-items: center
		width: 28px
		height: 28px
		border-radius: 6px
		color: var(--fore-secondary)
		transition: all 0.12s var(--ease)

		&:hover
			background: var(--medium-00)
			color: var(--fore-primary)

	.file-name
		font-size: 14px
		font-weight: 500

	.dirty-badge
		font-size: 10px
		padding: 2px 6px
		border-radius: 4px
		background: rgba(230, 180, 50, 0.2)
		color: #e6b432

	.save-btn
		padding: 5px 14px
		font-size: 12px
		font-weight: 600
		border-radius: 6px
		background: var(--theme-main)
		color: var(--surface-00)

		&:disabled
			opacity: 0.5

	.meta-toggle
		display: grid
		place-items: center
		width: 28px
		height: 28px
		border-radius: 6px
		color: var(--fore-tertiary)
		transition: all 0.12s var(--ease)

		&:hover
			background: var(--medium-00)
			color: var(--fore-primary)

	.editor-body
		flex: 1
		display: flex
		overflow: hidden

	.editor-main
		flex: 1
		overflow: hidden

		&.with-metadata
			border-right: 1px solid var(--medium-00)

	.save-bar
		display: flex
		align-items: center
		justify-content: center
		gap: 12px
		padding: 8px 16px
		background: rgba(230, 180, 50, 0.08)
		border-top: 1px solid rgba(230, 180, 50, 0.2)
		font-size: 13px
		color: var(--fore-secondary)
</style>
