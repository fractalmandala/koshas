<script lang="ts">
	interface FileTypeHandler {
		extensions: string[];
		icon: string;
		label: string;
		mode: 'source' | 'preview' | 'binary';
	}

	const fileTypeRegistry: FileTypeHandler[] = [
		{ extensions: ['md', 'markdown'], icon: '📝', label: 'Markdown', mode: 'source' },
		{ extensions: ['txt'], icon: '📄', label: 'Plain Text', mode: 'source' },
		{ extensions: ['json'], icon: '📋', label: 'JSON', mode: 'source' },
		{ extensions: ['yaml', 'yml'], icon: '📋', label: 'YAML', mode: 'source' },
		{ extensions: ['js', 'jsx'], icon: '⚡', label: 'JavaScript', mode: 'source' },
		{ extensions: ['ts', 'tsx'], icon: '⚡', label: 'TypeScript', mode: 'source' },
		{ extensions: ['css', 'scss', 'sass'], icon: '🎨', label: 'Stylesheet', mode: 'source' },
		{ extensions: ['html', 'htm'], icon: '🌐', label: 'HTML', mode: 'source' },
		{ extensions: ['json5'], icon: '📋', label: 'JSON5', mode: 'source' },
		{ extensions: ['xml'], icon: '📋', label: 'XML', mode: 'source' },
		{ extensions: ['svg'], icon: '🖼️', label: 'SVG', mode: 'source' },
		{ extensions: ['csv'], icon: '📊', label: 'CSV', mode: 'source' },
		{ extensions: ['env', 'gitignore', 'editorconfig'], icon: '⚙️', label: 'Config', mode: 'source' },
		{ extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'], icon: '🖼️', label: 'Image', mode: 'preview' },
		{ extensions: ['pdf'], icon: '📕', label: 'PDF', mode: 'preview' },
	];

	let {
		filePath = '',
		onOpen = (_path: string) => {}
	}: {
		filePath?: string;
		onOpen?: (path: string) => void;
	} = $props();

	function getHandler(path: string): FileTypeHandler | null {
		const ext = path.split('.').pop()?.toLowerCase() ?? '';
		return fileTypeRegistry.find((h) => h.extensions.includes(ext)) ?? null;
	}

	function getIcon(path: string): string {
		return getHandler(path)?.icon ?? '📄';
	}

	function getLabel(path: string): string {
		return getHandler(path)?.label ?? 'Unknown';
	}

	function canOpen(path: string): boolean {
		return getHandler(path) !== null || isTextFile(path);
	}

	function isTextFile(path: string): boolean {
		const ext = path.split('.').pop()?.toLowerCase() ?? '';
		// A broad set of text file extensions that fallback to source mode
		const textExtensions = [
			'md', 'txt', 'json', 'yaml', 'yml', 'js', 'jsx', 'ts', 'tsx',
			'css', 'scss', 'sass', 'html', 'htm', 'xml', 'svg', 'csv',
			'env', 'gitignore', 'editorconfig', 'sh', 'bash', 'zsh',
			'toml', 'ini', 'cfg', 'conf', 'log', 'sql', 'py', 'rb',
			'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'vue', 'svelte'
		];
		return textExtensions.includes(ext);
	}

	function getMode(path: string): 'source' | 'preview' | 'binary' {
		const handler = getHandler(path);
		if (handler) return handler.mode;
		if (isTextFile(path)) return 'source';
		return 'binary';
	}
</script>

<div class="fo-matrix">
	<div class="fo-header">
		<h3>File Openability</h3>
		<span class="fo-count">{fileTypeRegistry.length} types registered</span>
	</div>

	<div class="fo-table">
		<div class="fo-row fo-head">
			<span class="fo-col-icon"></span>
			<span class="fo-col-ext">Extension</span>
			<span class="fo-col-label">Type</span>
			<span class="fo-col-mode">Mode</span>
			<span class="fo-col-action"></span>
		</div>
		{#each fileTypeRegistry as handler (handler.label + handler.extensions.join(','))}
			<div class="fo-row">
				<span class="fo-col-icon">{handler.icon}</span>
				<span class="fo-col-ext">
					<code>.{handler.extensions[0]}</code>
					{#if handler.extensions.length > 1}
						<span class="fo-alt">+{handler.extensions.length - 1}</span>
					{/if}
				</span>
				<span class="fo-col-label">{handler.label}</span>
				<span class="fo-col-mode">
					<span class="fo-badge" class:source={handler.mode === 'source'} class:preview={handler.mode === 'preview'} class:binary={handler.mode === 'binary'}>
						{handler.mode}
					</span>
				</span>
				<span class="fo-col-action">
					{#if filePath && canOpen(filePath)}
						<button type="button" class="fo-open" onclick={() => onOpen(filePath)}>Open</button>
					{/if}
				</span>
			</div>
		{/each}
	</div>
</div>

<style lang="sass">
	.fo-matrix
		padding: 8px 0

	.fo-header
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

	.fo-count
		font-size: 11px
		color: var(--fore-tertiary)

	.fo-table
		display: flex
		flex-direction: column
		font-size: 12px

	.fo-row
		display: flex
		align-items: center
		padding: 4px 12px
		gap: 8px
		border-radius: 4px

		&:hover
			background: var(--medium-00)

		&.fo-head
			font-size: 10px
			color: var(--fore-tertiary)
			text-transform: uppercase
			letter-spacing: 0.03em

	.fo-col-icon
		width: 20px
		text-align: center
		flex-shrink: 0

	.fo-col-ext
		width: 80px
		flex-shrink: 0

		code
			font-family: 'Cascadia Code', monospace
			font-size: 12px
			background: var(--medium-00)
			padding: 1px 5px
			border-radius: 3px

	.fo-alt
		font-size: 10px
		color: var(--fore-tertiary)
		margin-left: 4px

	.fo-col-label
		flex: 1

	.fo-col-mode
		width: 70px

	.fo-badge
		font-size: 10px
		padding: 1px 6px
		border-radius: 999px
		background: var(--medium-00)
		color: var(--fore-secondary)

		&.source
			background: rgba(100, 180, 255, 0.12)
			color: #64b4ff

		&.preview
			background: rgba(100, 220, 150, 0.12)
			color: #64dc96

	.fo-open
		font-size: 11px
		padding: 2px 10px
		border-radius: 4px
		background: var(--theme-main)
		color: var(--surface-00)
</style>
