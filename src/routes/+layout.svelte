<script lang="ts">
	import '$lib/app.sass';
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';

	let { children }: { children: import('svelte').Snippet } = $props();

	// Theme toggling
	let theme = $state<'light' | 'dark'>('light');

	// Apply theme class to body
	$effect(() => {
		if (browser) {
			document.body.className = theme;
		}
	});

	// Detect system preference on mount
	if (browser) {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		if (prefersDark) theme = 'dark';

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', (e) => {
			theme = e.matches ? 'dark' : 'light';
		});
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div id="grain"></div>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="win" onkeydown={(e) => {
	if (e.metaKey && e.shiftKey && e.key === 'f') {
		e.preventDefault();
	}
	if (e.key === 'Escape') {
		// handled by search overlay
	}
}}>
	{@render children()}
</div>
