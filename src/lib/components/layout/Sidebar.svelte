<script lang="ts">
	export type TabId = 'collect' | 'notes' | 'graph';

	interface Tab {
		id: TabId;
		label: string;
		disabled: boolean;
	}

	let {
		children,
		activeTab = 'collect' as TabId,
		onTabChange = (_tab: TabId) => {}
	}: {
		children?: import('svelte').Snippet;
		activeTab?: TabId;
		onTabChange?: (tab: TabId) => void;
	} = $props();

	const tabs: Tab[] = [
		{ id: 'collect', label: 'Collect', disabled: false },
		{ id: 'notes', label: 'Notes', disabled: false },
		{ id: 'graph', label: 'Graph', disabled: true }
	];
</script>

<aside class="rail" aria-label="Primary">
	<div class="rail-head">
		<div class="brand" style="display:flex;align-items:center;gap:10px;">
			<span class="brand-mark" style="display:grid;width:32px;height:32px;place-items:center;border-radius:8px;background:#26362d;color:#fff;font-weight:700;font-size:16px;">K</span>
			<div>
				<div style="font-size:16px;font-weight:600;line-height:1.15;">Koshas</div>
				<div class="eyebrow" style="margin-top:1px;">Knowledge companion</div>
			</div>
		</div>
	</div>

	<div class="rail-scroll">
		<div class="vine">
			<div class="stem"></div>
			{#each tabs as tab (tab.id)}
				<button
					type="button"
					class="node"
					class:on={tab.id === activeTab && !tab.disabled}
					disabled={tab.disabled}
					onclick={() => onTabChange(tab.id)}
				>
					<span class="bud"><i></i></span>
					<span class="txt">
						<b>{tab.label}</b>
						<small>{tab.id === 'collect' ? 'Capture &amp; import' : tab.id === 'notes' ? 'Markdown editor' : 'Knowledge graph'}</small>
					</span>
				</button>
			{/each}
		</div>

		<!-- Sidebar aside content (notebook list, etc.) -->
		{#if children}
			<div class="rail-aside">
				{@render children()}
			</div>
		{/if}
	</div>
</aside>

<style lang="sass">
	.rail-aside
		border-top: 1px solid var(--medium-00)
		margin-top: 4px
		padding-top: 4px
</style>
