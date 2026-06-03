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
