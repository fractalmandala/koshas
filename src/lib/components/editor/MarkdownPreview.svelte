<script lang="ts">
	import { onMount } from 'svelte';

	let {
		markdown = '',
		scrollPosition = 0,
		onScroll = (_pos: number) => {}
	}: {
		markdown?: string;
		scrollPosition?: number;
		onScroll?: (pos: number) => void;
	} = $props();

	let renderedHtml = $state('');
	let previewEl = $state<HTMLDivElement | null>(null);

	onMount(async () => {
		updatePreview(markdown);
	});

	$effect(() => {
		updatePreview(markdown);
	});

	async function updatePreview(md: string) {
		if (!md.trim()) {
			renderedHtml =
				'<div class="empty-preview"><p>Nothing to preview — start writing in Source or WYSIWYG mode.</p></div>';
			return;
		}

		try {
			const { unified } = await import('unified');
			const remarkParse = (await import('remark-parse')).default;
			const remarkGfm = (await import('remark-gfm')).default;
			const remarkRehype = (await import('remark-rehype')).default;
			const rehypeStringify = (await import('rehype-stringify')).default;
			const rehypeHighlight = (await import('rehype-highlight')).default;

			const file = await unified()
				.use(remarkParse)
				.use(remarkGfm)
				.use(remarkRehype)
				.use(rehypeHighlight)
				.use(rehypeStringify)
				.process(md);

			renderedHtml = String(file);
		} catch {
			renderedHtml = `<pre class="fallback">${escapeHtml(md)}</pre>`;
		}
	}

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function handleScroll() {
		if (previewEl) {
			onScroll(previewEl.scrollTop);
		}
	}
</script>

<div class="preview-wrapper" bind:this={previewEl} onscroll={handleScroll}>
	<div class="preview-content">
		{@html renderedHtml}
	</div>
</div>

<style lang="sass">
	.preview-wrapper
		height: 100%
		overflow-y: auto
		padding: 16px 24px
		background: var(--surface-00)
		border-radius: 8px

	.preview-content
		max-width: 720px
		margin: 0 auto
		font-size: 15px
		line-height: 1.7
		color: var(--fore-primary)

	:global(.preview-content h1),
	:global(.preview-content h2),
	:global(.preview-content h3),
	:global(.preview-content h4)
		margin: 24px 0 12px
		font-weight: 600
		line-height: 1.3

	:global(.preview-content h1)
		font-size: 28px
		border-bottom: 1px solid var(--medium-00)
		padding-bottom: 8px

	:global(.preview-content h2)
		font-size: 22px

	:global(.preview-content h3)
		font-size: 18px

	:global(.preview-content p)
		margin-bottom: 16px

	:global(.preview-content a)
		color: var(--theme-main)
		text-decoration: underline

	:global(.preview-content ul),
	:global(.preview-content ol)
		padding-left: 24px
		margin-bottom: 16px

	:global(.preview-content li)
		margin-bottom: 4px

	:global(.preview-content blockquote)
		border-left: 4px solid var(--theme-main)
		padding: 8px 16px
		margin: 16px 0
		color: var(--fore-secondary)
		background: var(--medium-00)
		border-radius: 0 6px 6px 0

	:global(.preview-content pre)
		background: #1e1e2e
		border-radius: 8px
		padding: 16px
		overflow-x: auto
		margin: 16px 0

	:global(.preview-content pre code)
		color: #cdd6f4
		font-size: 13px
		font-family: 'Cascadia Code', 'JetBrains Mono', monospace

	:global(.preview-content code)
		background: var(--medium-00)
		padding: 2px 6px
		border-radius: 4px
		font-size: 0.9em

	:global(.preview-content img)
		max-width: 100%
		border-radius: 8px
		margin: 16px 0

	:global(.preview-content table)
		border-collapse: collapse
		width: 100%
		margin: 16px 0

	:global(.preview-content th),
	:global(.preview-content td)
		border: 1px solid var(--medium-10)
		padding: 8px 12px
		text-align: left

	:global(.preview-content th)
		background: var(--medium-00)
		font-weight: 600

	:global(.preview-content hr)
		border: none
		border-top: 1px solid var(--medium-10)
		margin: 24px 0

	:global(.preview-content .empty-preview)
		text-align: center
		padding: 48px 24px
		color: var(--fore-tertiary)

	:global(.preview-content .fallback)
		white-space: pre-wrap
		font-family: 'Cascadia Code', monospace
		font-size: 13px
</style>
