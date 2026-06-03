<script lang="ts" module>
	export interface Item {
		id: string;
		itemType: string;
		sourceUrl: string | null;
		normalizedUrl: string | null;
		title: string | null;
		description: string | null;
		bodyText: string | null;
		thumbnail: string | null;
		filePath: string | null;
		metadata: Record<string, unknown> | null;
		aiTags: string[] | null;
		manualTags: string[] | null;
		colors: string[] | null;
		enrichmentStatus: string | null;
		createdAt: string;
		updatedAt: string;
	}
</script>

<script lang="ts">
	let {
		item,
		view = 'grid'
	}: {
		item: Item;
		view?: 'grid' | 'list';
	} = $props();

	let domain = $derived(
		item.sourceUrl
			? (() => {
					try {
						return new URL(item.sourceUrl).hostname.replace('www.', '');
					} catch {
						return item.sourceUrl;
					}
				})()
			: null
	);

	let favicon = $derived(
		item.sourceUrl
			? `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
			: null
	);

	let typeLabel = $derived(item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1));

	let tagList = $derived([
		...(item.manualTags ?? []).map((t: string) => ({ text: t, isAi: false })),
		...(item.aiTags ?? []).map((t: string) => ({ text: t, isAi: true }))
	]);

	let gradient = $derived.by(() => {
		const colors: Record<string, string> = {
			bookmark: 'linear-gradient(135deg, #2eaf7d, #0b8e55)',
			article: 'linear-gradient(135deg, #4a90d9, #357abd)',
			image: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
			pdf: 'linear-gradient(135deg, #e74c3c, #c0392b)',
			video: 'linear-gradient(135deg, #e67e22, #d35400)',
			note: 'linear-gradient(135deg, #2ecc71, #27ae60)',
			quote: 'linear-gradient(135deg, #f39c12, #e67e22)',
			highlight: 'linear-gradient(135deg, #1abc9c, #16a085)',
			product: 'linear-gradient(135deg, #3498db, #2980b9)',
			recipe: 'linear-gradient(135deg, #e91e63, #c2185b)',
			book: 'linear-gradient(135deg, #9b59b6, #8e44ad)'
		};
		return colors[item.itemType] ?? 'linear-gradient(135deg, #2eaf7d, #0b8e55)';
	});

	let enrichmentIcon = $derived.by(() => {
		switch (item.enrichmentStatus) {
			case 'pending': return '○';
			case 'enriching': return '◌';
			case 'done': return '●';
			case 'failed': return '○';
			default: return '○';
		}
	});

	let timeAgo = $derived.by(() => {
		const now = Date.now();
		const then = new Date(item.createdAt).getTime();
		const diff = now - then;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}d ago`;
		return new Date(item.createdAt).toLocaleDateString();
	});

	// Color swatches for items with extracted colors
	let colorSwatches = $derived(item.colors?.slice(0, 5) ?? null);
</script>

{#if view === 'list'}
	<!-- List View -->
	<div class="card" style="display:flex;align-items:center;gap:12px;padding:10px 14px;margin-bottom:6px;">
		<div class="type-tag" style="font-size:11px;flex-shrink:0;">{typeLabel}</div>
		<div style="flex:1;min-width:0;">
			<div style="font-size:14px;font-weight:500;color:var(--fore-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
				{item.title ?? 'Untitled'}
			</div>
			{#if domain}
				<div style="font-size:11px;color:var(--fore-tertiary);">{domain}</div>
			{/if}
		</div>
		<div class="enriching-tag" style="margin:0;flex-shrink:0;" title="Enrichment: {item.enrichmentStatus}">
			<span class="sprout" style={item.enrichmentStatus === 'enriching' ? '' : 'animation:none;'}>{enrichmentIcon}</span>
		</div>
	</div>
{:else}
	<!-- Grid / Card View -->
	<div class="card">
		{#if item.thumbnail}
			<div class="media" style="background:{gradient};">
				<img
					src={item.thumbnail}
					alt={item.title ?? ''}
					style="width:100%;height:100%;object-fit:cover;"
					loading="lazy"
					onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
				/>
				<div class="grad"></div>
				<div class="grain-overlay"></div>
			</div>
		{/if}

		<div class="card-body">
			<div class="type-row">
				<span class="type-tag">{typeLabel}</span>
				<span class="dot"></span>
				<span class="saved">{timeAgo}</span>
			</div>

			<h3>{item.title ?? 'Untitled'}</h3>

			{#if item.description}
				<p class="desc">{item.description}</p>
			{/if}

			{#if domain}
				<div class="domain">
					{#if favicon}
						<img src={favicon} alt="" class="fav" />
					{/if}
					<span>{domain}</span>
				</div>
			{/if}

			{#if tagList.length > 0}
				<div class="tags">
					{#each tagList as tag}
						<span class="tag" class:ai={tag.isAi}>{tag.isAi ? '✦ ' : ''}{tag.text}</span>
					{/each}
				</div>
			{/if}

			{#if colorSwatches}
				<div class="pigments">
					{#each colorSwatches as swatch}
						<span class="sw" style="background:{swatch};"></span>
					{/each}
					<small>Colors</small>
				</div>
			{/if}

			<div class="enriching-tag">
				<span class="sprout" style={item.enrichmentStatus === 'enriching' ? '' : 'animation:none;opacity:0.4;'}>{enrichmentIcon}</span>
				<span>
					{item.enrichmentStatus === 'done' ? 'Enriched' :
						item.enrichmentStatus === 'enriching' ? 'Enriching…' :
						item.enrichmentStatus === 'failed' ? 'Enrichment failed' :
						'Pending enrichment'}
				</span>
			</div>
		</div>
	</div>
{/if}
