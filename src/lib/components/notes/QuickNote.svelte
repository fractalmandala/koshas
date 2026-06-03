<script lang="ts">
	import { getNotebookState } from '$lib/notebooks/state.svelte';
	import { writeFile } from '$lib/notes/sync';
	import { serializeFrontmatter } from '$lib/notes/frontmatter';
	import { getInitializedDatabase } from '$lib/db';

	let {
		onNoteCreated = (_filePath: string) => {}
	}: {
		onNoteCreated?: (filePath: string) => void;
	} = $props();

	let isExpanded = $state(false);
	let title = $state('');
	let content = $state('');
	let isSaving = $state(false);
	let confirmDiscard = $state(false);

	let ns = $derived(getNotebookState());

	function reset() {
		title = '';
		content = '';
		isExpanded = false;
		confirmDiscard = false;
	}

	async function saveQuickNote() {
		if (!title.trim() || !ns.activeNotebook) return;

		isSaving = true;
		try {
			const slug = title
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');
			const now = new Date().toISOString();
			const fileName = `${now.slice(0, 10)}-${slug}.md`;
			const filePath = `${ns.activeNotebook.defaultSaveLocation}/${fileName}`;

			const frontmatter = {
				title: title.trim(),
				created: now,
				updated: now,
				tags: [] as string[],
				type: 'quick-note'
			};

			const fullContent = serializeFrontmatter(frontmatter, content.trim());

			await writeFile(filePath, fullContent);

			// Register in the notes table
			const db = await getInitializedDatabase();
			const itemId = crypto.randomUUID();
			const noteId = crypto.randomUUID();
			await db.execute(
				`INSERT INTO items (id, item_type, title, body_text, file_path, enrichment_status, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
				[itemId, 'note', title.trim(), fullContent, filePath, now, now]
			);
			await db.execute(
				`INSERT OR IGNORE INTO notes (id, item_id, file_path, notebook_id, file_modified_at, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[noteId, itemId, filePath, ns.activeNotebook.id, now, now, now]
			);

			onNoteCreated(filePath);
			reset();
		} catch {
			// Handle error
		} finally {
			isSaving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (title || content) {
				confirmDiscard = true;
			} else {
				reset();
			}
		}
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			saveQuickNote();
		}
	}
</script>

{#if !isExpanded}
	<button type="button" class="qn-fab" onclick={() => { isExpanded = true; }} aria-label="Quick note">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M12 5v14M5 12h14"/>
		</svg>
	</button>
{:else}
	<div class="qn-overlay" onclick={() => { confirmDiscard = true; }}>
		<div class="qn-panel" onclick={(e) => e.stopPropagation()} onkeydown={handleKeydown}>
			<div class="qn-header">
				<h3>Quick Note</h3>
				<div class="qn-header-actions">
					<button type="button" class="qn-shortcut-hint">
						<kbd>⌘⏎</kbd> Save
					</button>
					<button type="button" class="qn-close" onclick={() => { confirmDiscard = true; }} aria-label="Close">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 6L6 18M6 6l12 12"/>
						</svg>
					</button>
				</div>
			</div>

			<input
				type="text"
				class="qn-title"
				bind:value={title}
				placeholder="Note title…"
				autofocus
			/>

			<textarea
				class="qn-body"
				bind:value={content}
				placeholder="Start writing… (markdown supported)"
				rows="6"
			></textarea>

			<div class="qn-footer">
				<span class="qn-path">
					{ns.activeNotebook?.name ?? 'No notebook'} / {new Date().toLocaleDateString()}
				</span>
				<div class="qn-footer-actions">
					<button type="button" class="secondary" onclick={() => { confirmDiscard = true; }}>
						Discard
					</button>
					<button
						type="button"
						class="primary"
						disabled={!title.trim() || isSaving || !ns.activeNotebook}
						onclick={saveQuickNote}
					>
						{isSaving ? 'Saving…' : 'Save Note'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Confirm discard dialog -->
{#if confirmDiscard}
	<div class="qn-confirm-overlay" onclick={() => { confirmDiscard = false; }}>
		<div class="qn-confirm" onclick={(e) => e.stopPropagation()}>
			<p>Discard this note?</p>
			<div class="qn-confirm-actions">
				<button type="button" class="secondary" onclick={() => { confirmDiscard = false; }}>Keep editing</button>
				<button type="button" class="danger" onclick={reset}>Discard</button>
			</div>
		</div>
	</div>
{/if}

<style lang="sass">
	.qn-fab
		position: fixed
		bottom: 24px
		right: 24px
		width: 44px
		height: 44px
		border-radius: 50%
		display: grid
		place-items: center
		background: var(--theme-main)
		color: #fff
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25)
		transition: all 0.15s var(--ease)
		z-index: 50

		&:hover
			transform: scale(1.05)
			box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3)

	.qn-overlay
		position: fixed
		inset: 0
		background: rgba(0, 0, 0, 0.3)
		display: grid
		place-items: center
		z-index: 100

	.qn-panel
		width: 520px
		max-height: 80vh
		background: var(--surface-00)
		border-radius: 12px
		box-shadow: var(--sh-3)
		display: flex
		flex-direction: column
		overflow: hidden

	.qn-header
		display: flex
		align-items: center
		justify-content: space-between
		padding: 16px 16px 0

		h3
			font-size: 16px
			font-weight: 600

	.qn-header-actions
		display: flex
		align-items: center
		gap: 8px

	.qn-shortcut-hint
		font-size: 11px
		color: var(--fore-tertiary)

		kbd
			padding: 2px 5px
			background: var(--medium-00)
			border-radius: 3px
			font-family: inherit
			margin-right: 4px

	.qn-close
		display: grid
		place-items: center
		width: 24px
		height: 24px
		border-radius: 4px
		color: var(--fore-tertiary)

		&:hover
			background: var(--medium-00)

	.qn-title
		padding: 12px 16px
		font-size: 18px
		font-weight: 600
		background: transparent
		border: none
		outline: none
		color: var(--fore-primary)
		width: 100%

		&::placeholder
			color: var(--fore-tertiary)

	.qn-body
		flex: 1
		padding: 0 16px 16px
		font-size: 14px
		line-height: 1.6
		background: transparent
		border: none
		outline: none
		resize: none
		color: var(--fore-primary)
		font-family: inherit

		&::placeholder
			color: var(--fore-tertiary)

	.qn-footer
		display: flex
		align-items: center
		justify-content: space-between
		padding: 12px 16px
		border-top: 1px solid var(--medium-00)
		background: var(--surface-20)

	.qn-path
		font-size: 12px
		color: var(--fore-tertiary)

	.qn-footer-actions
		display: flex
		gap: 8px

	.qn-confirm-overlay
		position: fixed
		inset: 0
		background: rgba(0, 0, 0, 0.3)
		display: grid
		place-items: center
		z-index: 110

	.qn-confirm
		background: var(--surface-00)
		border-radius: 10px
		padding: 20px
		width: 300px
		box-shadow: var(--sh-3)

		p
			font-size: 14px
			margin-bottom: 16px

	.qn-confirm-actions
		display: flex
		justify-content: flex-end
		gap: 8px
</style>
