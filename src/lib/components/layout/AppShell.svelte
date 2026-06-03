<script lang="ts">
	import Sidebar, { type TabId } from './Sidebar.svelte';

	let {
		children,
		sidebarAside,
		activeTab = 'collect' as TabId,
		onTabChange = (_tab: TabId) => {}
	}: {
		children: import('svelte').Snippet;
		sidebarAside?: import('svelte').Snippet;
		activeTab?: TabId;
		onTabChange?: (tab: TabId) => void;
	} = $props();
</script>

<div class="titlebar">
	<div class="traffic-lights">
		<span class="dot red"></span>
		<span class="dot yellow"></span>
		<span class="dot green"></span>
	</div>
	<span class="win-tag">
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.6;">
			<path d="M12 2L2 7l10 5 10-5-10-5z"/>
			<path d="M2 17l10 5 10-5"/>
			<path d="M2 12l10 5 10-5"/>
		</svg>
		Koshas
	</span>
	<div class="right-btns">
		<!-- Theme toggle placeholder -->
	</div>
</div>

<div class="app-shell">
	<Sidebar {activeTab} {onTabChange}>
		{#if sidebarAside}
			{@render sidebarAside()}
		{/if}
	</Sidebar>
	<section class="main">
		{@render children()}
	</section>
</div>
