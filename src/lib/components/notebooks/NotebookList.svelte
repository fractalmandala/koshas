<script lang="ts">
	import { onMount } from 'svelte';
	import { getNotebookState } from '$lib/notebooks/state.svelte';

	let {
		onNotebookSelect = (_id: string) => {}
	}: {
		onNotebookSelect?: (id: string) => void;
	} = $props();

	let showNewDialog = $state(false);
	let newName = $state('');
	let newFolder = $state('');
	let renameId = $state<string | null>(null);
	let renameValue = $state('');
	let confirmDeleteId = $state<string | null>(null);

	let { notebooks, activeNotebookId, hasNotebooks, loading, addNotebook, updateNotebookName, removeNotebook, setActive } =
		$derived(getNotebookState());

	onMount(() => {
		loadNotebooks();
	});

	async function loadNotebooks() {
		const state = getNotebookState();
		await state.loadNotebooks();
	}

	function handleSelect(id: string) {
		setActive(id);
		onNotebookSelect(id);
	}

	async function handleCreate() {
		if (!newName.trim() || !newFolder.trim()) return;
		const nb = await addNotebook(newName.trim(), [newFolder.trim()]);
		if (nb) {
			newName = '';
			newFolder = '';
			showNewDialog = false;
			onNotebookSelect(nb.id);
		}
	}

	function startRename(id: string, currentName: string, e?: Event) {
		e?.stopPropagation();
		renameId = id;
		renameValue = currentName;
	}

	async function confirmRename() {
		if (renameId && renameValue.trim()) {
			await updateNotebookName(renameId, renameValue.trim());
		}
		renameId = null;
		renameValue = '';
	}

	function cancelRename() {
		renameId = null;
		renameValue = '';
	}

	async function confirmDelete(id: string) {
		await removeNotebook(id);
		confirmDeleteId = null;
	}

	function startDelete(id: string, e: Event) {
		e.stopPropagation();
		confirmDeleteId = id;
	}

	function handleOverlayClick() {
		showNewDialog = false;
	}

	function handleDeleteOverlayClick() {
		confirmDeleteId = null;
	}

	function handleDialogClick(e: MouseEvent) {
		e.stopPropagation();
	}
</script>

<div class="notebook-list">
	<div class="nl-header">
		<h3>Notebooks</h3>
		<button type="button" class="icon-btn" onclick={() => { showNewDialog = true; }}
			aria-label="New notebook">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 5v14M5 12h14"/>
			</svg>
		</button>
	</div>

	{#if loading}
		<div class="nl-loading">
			<span class="nl-loading-dot"></span>
			<span class="nl-loading-dot"></span>
			<span class="nl-loading-dot"></span>
		</div>
	{:else if !hasNotebooks}
		<div class="nl-empty">
			<p>No notebooks yet</p>
			<button type="button" class="secondary" onclick={() => { showNewDialog = true; }}>
				Create one
			</button>
		</div>
	{:else}
		<ul class="nl-items">
			{#each notebooks as nb (nb.id)}
				<li>
					<button
						type="button"
						class="nl-item"
						class:active={nb.id === activeNotebookId}
						onclick={() => handleSelect(nb.id)}
					>
						<span class="nl-icon">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
								<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
							</svg>
						</span>
						<span class="nl-label">
							{#if renameId === nb.id}
								<input
									type="text"
									class="nl-rename-input"
									bind:value={renameValue}
									onclick={(e) => e.stopPropagation()}
									onkeydown={(e) => {
										if (e.key === 'Enter') confirmRename();
										if (e.key === 'Escape') cancelRename();
									}}
									onblur={confirmRename}
									autofocus
								/>
							{:else}
								{nb.name}
							{/if}
						</span>
						<span class="nl-meta">{nb.folders.length} folder{nb.folders.length !== 1 ? 's' : ''}</span>
					</button>

					<div class="nl-actions">
						<button
							type="button"
							class="nl-action"
							onclick={(e) => startRename(nb.id, nb.name, e)}
							aria-label="Rename"
							title="Rename"
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
							</svg>
						</button>
						<button
							type="button"
							class="nl-action danger"
							onclick={(e) => startDelete(nb.id, e)}
							aria-label="Delete"
							title="Delete"
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
							</svg>
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<!-- New Notebook Dialog -->
{#if showNewDialog}
	<div class="nl-overlay" onclick={handleOverlayClick}>
		<div class="nl-dialog" onclick={handleDialogClick}>
			<h3>New Notebook</h3>
			<div class="nl-field">
				<label for="nb-name">Name</label>
				<input id="nb-name" type="text" bind:value={newName} placeholder="My Notebook" autofocus />
			</div>
			<div class="nl-field">
				<label for="nb-folder">Folder path</label>
				<input id="nb-folder" type="text" bind:value={newFolder} placeholder="/Users/me/Documents/Notes" />
				<p class="nl-hint">Full path to a folder on your filesystem. You can add more folders later.</p>
			</div>
			<div class="nl-actions-bar">
				<button type="button" class="secondary" onclick={() => { showNewDialog = false; }}>Cancel</button>
				<button type="button" class="primary" disabled={!newName.trim() || !newFolder.trim()} onclick={handleCreate}>
					Create
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Confirm Delete Dialog -->
{#if confirmDeleteId}
	<div class="nl-overlay" onclick={handleDeleteOverlayClick}>
		<div class="nl-dialog" onclick={handleDialogClick}>
			<h3>Delete Notebook?</h3>
			<p>The notebook grouping will be removed. Files on disk will not be deleted.</p>
			<div class="nl-actions-bar">
				<button type="button" class="secondary" onclick={() => { confirmDeleteId = null; }}>Cancel</button>
				<button type="button" class="danger" onclick={() => { confirmDelete(confirmDeleteId!); }}>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<style lang="sass">
	.notebook-list
		padding: 8px 0

	.nl-header
		display: flex
		align-items: center
		justify-content: space-between
		padding: 0 12px 8px

		h3
			font-size: 11px
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.04em
			color: var(--fore-tertiary)

	.icon-btn
		display: grid
		place-items: center
		width: 22px
		height: 22px
		border-radius: 4px
		color: var(--fore-tertiary)
		transition: all 0.15s var(--ease)

		&:hover
			background: var(--medium-00)
			color: var(--fore-primary)

	.nl-loading
		display: flex
		gap: 4px
		padding: 16px 12px
		justify-content: center

		&-dot
			width: 6px
			height: 6px
			border-radius: 50%
			background: var(--medium-20)
			animation: pulse 1.2s ease-in-out infinite

			&:nth-child(2)
				animation-delay: 0.2s

			&:nth-child(3)
				animation-delay: 0.4s

	@keyframes pulse
		0%, 80%, 100%
			opacity: 0.3
		40%
			opacity: 1

	.nl-empty
		padding: 12px
		text-align: center
		font-size: 13px
		color: var(--fore-tertiary)

		p
			margin-bottom: 8px

	.nl-items
		list-style: none
		padding: 0
		margin: 0

		li
			position: relative
			display: flex
			align-items: center
			padding: 0 8px
			border-radius: 6px
			margin: 0 4px
			transition: background 0.12s var(--ease)

			&:hover
				background: var(--medium-00)

				.nl-actions
					opacity: 1

	.nl-item
		flex: 1
		display: flex
		align-items: center
		gap: 8px
		padding: 6px 4px
		border-radius: 4px
		text-align: left
		width: 100%
		font-size: 13px
		cursor: pointer
		transition: all 0.12s var(--ease)

		&.active
			background: var(--theme-main)
			color: #fff

			.nl-meta
				color: rgba(255, 255, 255, 0.6)

	.nl-icon
		display: grid
		place-items: center
		width: 18px
		height: 18px
		flex-shrink: 0
		opacity: 0.6

	.nl-label
		flex: 1
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		font-weight: 500

	.nl-rename-input
		flex: 1
		font-size: 13px
		padding: 2px 6px
		border: 1px solid var(--theme-main)
		border-radius: 4px
		background: var(--surface-00)
		color: var(--fore-primary)
		outline: none
		width: 100%

	.nl-meta
		font-size: 10px
		color: var(--fore-tertiary)
		flex-shrink: 0

	.nl-actions
		display: flex
		gap: 2px
		opacity: 0
		transition: opacity 0.12s var(--ease)

	.nl-action
		display: grid
		place-items: center
		width: 22px
		height: 22px
		border-radius: 4px
		color: var(--fore-tertiary)
		transition: all 0.12s var(--ease)

		&:hover
			background: var(--medium-10)
			color: var(--fore-primary)

		&.danger:hover
			background: rgba(220, 80, 60, 0.15)
			color: #dc503c

	.nl-overlay
		position: fixed
		inset: 0
		background: rgba(0, 0, 0, 0.4)
		display: grid
		place-items: center
		z-index: 100

	.nl-dialog
		background: var(--surface-00)
		border-radius: 12px
		padding: 24px
		width: 380px
		box-shadow: var(--sh-3)

		h3
			font-size: 16px
			margin-bottom: 16px

		p
			font-size: 13px
			color: var(--fore-secondary)
			margin-bottom: 16px

	.nl-field
		margin-bottom: 14px

		label
			display: block
			font-size: 12px
			font-weight: 500
			margin-bottom: 4px
			color: var(--fore-secondary)

		input
			width: 100%
			padding: 8px 10px
			font-size: 13px
			border: 1px solid var(--medium-10)
			border-radius: 6px
			background: var(--surface-10)
			color: var(--fore-primary)
			outline: none

			&:focus
				border-color: var(--theme-main)

	.nl-hint
		font-size: 11px !important
		color: var(--fore-tertiary) !important
		margin-top: 4px !important
		margin-bottom: 0 !important

	.nl-actions-bar
		display: flex
		justify-content: flex-end
		gap: 8px
		margin-top: 20px
</style>
