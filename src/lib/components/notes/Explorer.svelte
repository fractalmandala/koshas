<script lang="ts">
	import { scanDirectory, readFile, type ScannedFile } from '$lib/notes/sync';

	let {
		folderPaths = [] as string[],
		onFileSelect = (_path: string) => {},
		onFolderToggle = (_path: string, _expanded: boolean) => {}
	}: {
		folderPaths?: string[];
		onFileSelect?: (path: string) => void;
		onFolderToggle?: (path: string, expanded: boolean) => void;
	} = $props();

	let expandedFolders = $state<Set<string>>(new Set());
	let folderContents = $state<Map<string, ScannedFile[]>>(new Map());
	let loading = $state<Set<string>>(new Set());

	async function toggleFolder(folderPath: string) {
		if (expandedFolders.has(folderPath)) {
			expandedFolders.delete(folderPath);
			expandedFolders = new Set(expandedFolders);
			onFolderToggle(folderPath, false);
			return;
		}

		expandedFolders.add(folderPath);
		expandedFolders = new Set(expandedFolders);
		loading.add(folderPath);
		loading = new Set(loading);
		onFolderToggle(folderPath, true);

		try {
			const files = await scanDirectory(folderPath);
			folderContents.set(folderPath, files);
			folderContents = new Map(folderContents);
		} catch {
			// Silently fail
		}

		loading.delete(folderPath);
		loading = new Set(loading);
	}

	function handleFileClick(path: string, e: Event) {
		e.stopPropagation();
		onFileSelect(path);
	}

	function getIcon(ext: string, isDir: boolean): string {
		if (isDir) return '📁';
		switch (ext.toLowerCase()) {
			case 'md': return '📝';
			case 'txt': return '📄';
			case 'json': return '📋';
			case 'yaml':
			case 'yml': return '📋';
			case 'css':
			case 'scss':
			case 'sass': return '🎨';
			case 'js':
			case 'ts': return '⚡';
			case 'html': return '🌐';
			case 'png':
			case 'jpg':
			case 'jpeg':
			case 'gif':
			case 'svg': return '🖼️';
			case 'pdf': return '📕';
			default: return '📄';
		}
	}
</script>

<div class="explorer">
	<div class="explorer-header">
		<h3>Explorer</h3>
	</div>

	{#if folderPaths.length === 0}
		<div class="explorer-empty">
			<p>No folders added to this notebook.</p>
		</div>
	{:else}
		<div class="explorer-tree">
			{#each folderPaths as folderPath (folderPath)}
				<div class="tree-folder">
					<button
						type="button"
						class="tree-folder-btn"
						onclick={() => toggleFolder(folderPath)}
					>
						<span class="tree-arrow" class:expanded={expandedFolders.has(folderPath)}>
							<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M9 18l6-6-6-6"/>
							</svg>
						</span>
						<span class="tree-icon">📁</span>
						<span class="tree-label" title={folderPath}>{folderPath.split('/').pop() || folderPath}</span>
						{#if loading.has(folderPath)}
							<span class="tree-loading">…</span>
						{/if}
					</button>

					{#if expandedFolders.has(folderPath) && folderContents.has(folderPath)}
						<div class="tree-children">
							{#each folderContents.get(folderPath) ?? [] as file (file.path)}
								{#if !file.is_dir}
									<button
										type="button"
										class="tree-file"
										onclick={(e) => handleFileClick(file.path, e)}
										title={file.path}
									>
										<span class="tree-icon">{getIcon(file.extension, false)}</span>
										<span class="tree-label">{file.name}</span>
									</button>
								{/if}
							{/each}
						</div>
					{/if}

					{#if expandedFolders.has(folderPath) && !folderContents.has(folderPath) && !loading.has(folderPath)}
						<div class="tree-empty">No files found</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style lang="sass">
	.explorer
		padding: 8px 0

	.explorer-header
		padding: 0 12px 8px

		h3
			font-size: 11px
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.04em
			color: var(--fore-tertiary)

	.explorer-empty
		padding: 12px
		text-align: center
		font-size: 13px
		color: var(--fore-tertiary)

	.explorer-tree
		display: flex
		flex-direction: column

	.tree-folder-btn, .tree-file
		display: flex
		align-items: center
		gap: 6px
		padding: 4px 12px
		width: 100%
		text-align: left
		font-size: 13px
		cursor: pointer
		transition: background 0.1s var(--ease)
		border-radius: 0

		&:hover
			background: var(--medium-00)

	.tree-arrow
		display: grid
		place-items: center
		width: 14px
		height: 14px
		transition: transform 0.12s var(--ease)
		color: var(--fore-tertiary)

		&.expanded
			transform: rotate(90deg)

	.tree-icon
		flex-shrink: 0
		font-size: 13px
		line-height: 1

	.tree-label
		flex: 1
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	.tree-loading
		font-size: 11px
		color: var(--fore-tertiary)

	.tree-children
		padding-left: 4px

	.tree-empty
		padding: 4px 12px 4px 32px
		font-size: 12px
		color: var(--fore-tertiary)
</style>
