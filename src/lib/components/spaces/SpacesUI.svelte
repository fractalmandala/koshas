<script lang="ts">
	export interface Space {
		id: string;
		name: string;
		description: string | null;
		spaceType: 'manual' | 'smart';
		queryDefinition: string | null;
		sortOrder: number;
	}

	let {
		spaces = [] as Space[],
		onCreate = (_name: string) => {},
		onRename = (_id: string, _name: string) => {},
		onDelete = (_id: string) => {}
	}: {
		spaces?: Space[];
		onCreate?: (name: string) => void;
		onRename?: (id: string, name: string) => void;
		onDelete?: (id: string) => void;
	} = $props();

	let showDialog = $state(false);
	let dialogMode: 'create' | 'rename' = $state('create');
	let editName = $state('');
	let editId = $state('');

	function openCreate() {
		dialogMode = 'create';
		editName = '';
		showDialog = true;
	}

	function openRename(space: Space) {
		dialogMode = 'rename';
		editName = space.name;
		editId = space.id;
		showDialog = true;
	}

	function confirmDialog() {
		const name = editName.trim();
		if (!name) return;

		if (dialogMode === 'create') {
			onCreate(name);
		} else {
			onRename(editId, name);
		}
		showDialog = false;
		editName = '';
	}

	function handleDelete(id: string) {
		if (window.confirm('Delete this space? Items will not be affected.')) {
			onDelete(id);
		}
	}
</script>

<div class="sec">
	<div class="sec-h">
		<span>Spaces</span>
		<span class="ln"></span>
	</div>

	{#each spaces as space (space.id)}
		<div class="space-item">
			<span style="flex:1;">{space.name}</span>
			<button
				type="button"
				class="icon-btn"
				title="Rename"
				onclick={() => openRename(space)}
				style="font-size:11px;padding:2px 6px;border-radius:4px;">
				✎
			</button>
			<button
				type="button"
				class="icon-btn"
				title="Delete"
				onclick={() => handleDelete(space.id)}
				style="font-size:11px;padding:2px 6px;border-radius:4px;color:var(--fore-tertiary);">
				✕
			</button>
		</div>
	{:else}
		<p class="muted-copy" style="padding: 8px 12px;">No spaces yet. Create a manual or smart space.</p>
	{/each}

	<button
		type="button"
		class="r-item"
		style="margin-top:4px;"
		onclick={openCreate}
	>
		<span>+ New Space</span>
	</button>
</div>

{#if showDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="dialog-overlay" onclick={() => { showDialog = false; }}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<h2>{dialogMode === 'create' ? 'New Space' : 'Rename Space'}</h2>

			<div class="form-group">
				<label for="space-name">Name</label>
				<input
					id="space-name"
					type="text"
					bind:value={editName}
					placeholder="My Space"
					onkeydown={(e) => { if (e.key === 'Enter') confirmDialog(); }}
				/>
			</div>

			<div class="dialog-actions">
				<button type="button" class="secondary" onclick={() => { showDialog = false; }}>Cancel</button>
				<button type="button" class="primary" onclick={confirmDialog} disabled={!editName.trim()}>
					{dialogMode === 'create' ? 'Create' : 'Rename'}
				</button>
			</div>
		</div>
	</div>
{/if}
