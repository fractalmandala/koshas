<script lang="ts">
	export type EditorMode = 'wysiwyg' | 'source' | 'preview';

	let {
		mode = 'wysiwyg' as EditorMode,
		onModeChange = (_mode: EditorMode) => {}
	}: {
		mode?: EditorMode;
		onModeChange?: (mode: EditorMode) => void;
	} = $props();

	const modes: { id: EditorMode; label: string; icon: string }[] = [
		{ id: 'wysiwyg', label: 'Visual', icon: 'T' },
		{ id: 'source', label: 'Source', icon: '</>' },
		{ id: 'preview', label: 'Preview', icon: '👁' }
	];
</script>

<div class="switcher">
	{#each modes as m (m.id)}
		<button
			type="button"
			class="switcher-btn"
			class:active={m.id === mode}
			onclick={() => onModeChange(m.id)}
			aria-label={`${m.label} mode`}
			title={m.label}
		>
			<span class="switcher-icon">{m.icon}</span>
			<span class="switcher-label">{m.label}</span>
		</button>
	{/each}
</div>

<style lang="sass">
	.switcher
		display: flex
		gap: 2px
		padding: 3px
		background: var(--surface-20)
		border: 1px solid var(--medium-10)
		border-radius: 8px

	.switcher-btn
		display: flex
		align-items: center
		gap: 5px
		padding: 4px 10px
		border-radius: 6px
		font-size: 12px
		color: var(--fore-secondary)
		transition: all 0.12s var(--ease)

		&:hover
			color: var(--fore-primary)

		&.active
			background: var(--surface-00)
			color: var(--fore-primary)
			font-weight: 500
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
</style>
