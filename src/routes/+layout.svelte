<script lang="ts">
	import '$lib/app.sass';
	import favicon from '$lib/assets/favicon.svg';

	let { children }: { children: import('svelte').Snippet } = $props();

	// Keyboard shortcut: Cmd+Shift+F → search overlay
	let searchOpen = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		// Cmd+Shift+F
		if (e.metaKey && e.shiftKey && e.key === 'f') {
			e.preventDefault();
			searchOpen = true;
		}
		// Escape closes search
		if (e.key === 'Escape' && searchOpen) {
			searchOpen = false;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div onkeydown={handleKeydown}>
	{@render children()}
</div>
