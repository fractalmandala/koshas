<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import * as d3 from 'd3';

	interface GraphNode {
		id: string;
		title: string;
		type: string;
	}

	interface GraphLink {
		source: string;
		target: string;
		type: string;
	}

	// Extended for D3 simulation
	interface SimNode extends GraphNode {
		x: number;
		y: number;
		fx?: number | null;
		fy?: number | null;
	}

	interface SimLink {
		source: string | SimNode;
		target: string | SimNode;
		type: string;
	}

	const NODE_TYPE_COLORS: Record<string, string> = {
		bookmark: '#6366f1',
		article: '#8b5cf6',
		note: '#ec4899',
		item: '#14b8a6',
		podcast: '#f59e0b',
		video: '#ef4444'
	};

	function getNodeColor(type: string): string {
		return NODE_TYPE_COLORS[type] || '#6366f1';
	}

	function getNodeId(d: string | SimNode): string {
		return typeof d === 'object' ? d.id : d;
	}

	let {
		nodes: externalNodes = [] as GraphNode[],
		links: externalLinks = [] as GraphLink[],
		loadFromDb = true,
		height = '100%',
		onNodeClick = (_node: GraphNode) => {}
	}: {
		nodes?: GraphNode[];
		links?: GraphLink[];
		loadFromDb?: boolean;
		height?: string;
		onNodeClick?: (node: GraphNode) => void;
	} = $props();

	let svgEl = $state<SVGSVGElement | null>(null);
	let containerEl = $state<HTMLDivElement | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let nodes = $state<GraphNode[]>(externalNodes);
	let links = $state<GraphLink[]>(externalLinks);
	let selectedNode = $state<GraphNode | null>(null);

	let simulation: d3.Simulation<SimNode, d3.SimulationLinkDatum<SimNode>> | null = null;

	// Load data from DB
	$effect(() => {
		if (browser && loadFromDb && externalNodes.length === 0 && nodes.length === 0) {
			void loadGraphData();
		}
	});

	$effect(() => {
		if (externalNodes.length > 0 || externalLinks.length > 0) {
			nodes = [...externalNodes];
			links = [...externalLinks];
			loading = false;
		}
	});

	async function loadGraphData() {
		loading = true;
		error = null;
		try {
			const { getInitializedDatabase } = await import('$lib/db');
			const db = await getInitializedDatabase();

			const itemRows = (await db.select(
				`SELECT id, COALESCE(title, 'Untitled') as title, COALESCE(item_type, 'item') as type
				 FROM items ORDER BY title`
			)) as Array<{ id: string; title: string; type: string }>;

			const linkRows = (await db.select(
				`SELECT lr.source_item_id, lr.target_item_id, COALESCE(lr.reference_type, 'wikilink') as ref_type
				 FROM link_references lr
				 JOIN items s ON s.id = lr.source_item_id
				 JOIN items t ON t.id = lr.target_item_id`
			)) as Array<{ source_item_id: string; target_item_id: string; ref_type: string }>;

			const nodeMap = new Map<string, GraphNode>();
			for (const row of itemRows) {
				nodeMap.set(row.id, { id: row.id, title: row.title, type: row.type });
			}

			const loadedNodes = Array.from(nodeMap.values());
			const loadedLinks = linkRows
				.filter((l) => nodeMap.has(l.source_item_id) && nodeMap.has(l.target_item_id))
				.map((l) => ({
					source: l.source_item_id,
					target: l.target_item_id,
					type: l.ref_type
				}));

			nodes = loadedNodes;
			links = loadedLinks;
			loading = false;
		} catch (err) {
			console.error('[ForceGraph] Error loading data:', err);
			error = 'Failed to load graph data.';
			loading = false;
		}
	}

	function buildGraph() {
		if (!svgEl || !containerEl || nodes.length === 0) return;

		const width = containerEl.clientWidth;
		const heightVal = containerEl.clientHeight;
		if (width === 0 || heightVal === 0) return;

		// Clear previous
		d3.select(svgEl).selectAll('*').remove();
		if (simulation) simulation.stop();

		const svg = d3.select(svgEl);

		// Define arrow marker
		svg.append('defs').append('marker')
			.attr('id', 'arrowhead')
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', 20)
			.attr('refY', 0)
			.attr('markerWidth', 6)
			.attr('markerHeight', 6)
			.attr('orient', 'auto')
			.append('path')
			.attr('d', 'M0,-5L10,0L0,5')
			.attr('fill', 'var(--fore-quaternary, #666)');

		// Zoom
		const zoom = d3.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 8])
			.on('zoom', (event) => {
				zoomGroup.attr('transform', event.transform.toString());
			});

		svg.call(zoom);

		const zoomGroup = svg.append('g');

		// Prepare simulation data
		const simNodes: SimNode[] = nodes.map((n) => ({
			...n,
			x: width / 2 + (Math.random() - 0.5) * 200,
			y: heightVal / 2 + (Math.random() - 0.5) * 200
		}));

		const nodeIdMap = new Map(simNodes.map((n) => [n.id, n]));

		const simLinks: SimLink[] = links
			.filter((l) => nodeIdMap.has(l.source) && nodeIdMap.has(l.target))
			.map((l) => ({
				source: l.source,
				target: l.target,
				type: l.type
			}));

		// Link elements
		const linkElements = zoomGroup.append('g')
			.selectAll('line')
			.data(simLinks)
			.join('line')
			.attr('stroke', 'var(--fore-quaternary, #666)')
			.attr('stroke-width', 1)
			.attr('stroke-opacity', 0.4)
			.attr('marker-end', 'url(#arrowhead)');

		// Node groups
		const nodeGroups = zoomGroup.append('g')
			.selectAll('g')
			.data(simNodes)
			.join('g')
			.attr('cursor', 'pointer');

		// Drag behavior
		const drag = d3.drag<SVGGElement, SimNode>()
			.on('start', (_event, d) => {
				if (!simulation) return;
				if (!_event.active) simulation.alphaTarget(0.3).restart();
				d.fx = d.x;
				d.fy = d.y;
			})
			.on('drag', (event, d) => {
				d.fx = event.x;
				d.fy = event.y;
			})
			.on('end', (_event, d) => {
				if (!simulation) return;
				if (!_event.active) simulation.alphaTarget(0);
				d.fx = null;
				d.fy = null;
			});

		nodeGroups.call(drag as never);

		// Node circles
		nodeGroups.append('circle')
			.attr('r', (d) => d.type === 'note' ? 6 : 8)
			.attr('fill', (d) => getNodeColor(d.type))
			.attr('stroke', '#fff')
			.attr('stroke-width', 1.5);

		// Node labels
		nodeGroups.append('text')
			.text((d) => d.title.length > 20 ? d.title.slice(0, 18) + '…' : d.title)
			.attr('dx', 12)
			.attr('dy', 4)
			.attr('font-size', 11)
			.attr('fill', 'var(--fore-primary, #333)')
			.attr('pointer-events', 'none')
			.style('text-shadow', '0 1px 2px var(--surface-00, #fff)');

		// Hover highlighting
		nodeGroups.on('mouseenter', function (_event, d) {
			const connectedIds = new Set<string>();
			connectedIds.add(d.id);
			for (const l of simLinks) {
				const srcId = getNodeId(l.source);
				const tgtId = getNodeId(l.target);
				if (srcId === d.id) connectedIds.add(tgtId);
				if (tgtId === d.id) connectedIds.add(srcId);
			}

			nodeGroups.attr('opacity', (n) => connectedIds.has(n.id) ? 1 : 0.15);
			linkElements.attr('stroke-opacity', (l) => {
				const srcId = getNodeId(l.source);
				const tgtId = getNodeId(l.target);
				return (srcId === d.id || tgtId === d.id) ? 0.8 : 0.05;
			});
		});

		nodeGroups.on('mouseleave', function () {
			nodeGroups.attr('opacity', 1);
			linkElements.attr('stroke-opacity', 0.4);
		});

		// Click to select
		nodeGroups.on('click', function (_event, d) {
			_event.stopPropagation();
			selectedNode = d;
			onNodeClick(d);
		});

		// Click background to deselect
		svg.on('click', () => {
			selectedNode = null;
		});

		// Force simulation
		simulation = d3.forceSimulation<SimNode>(simNodes)
			.force('link', d3.forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(simLinks as unknown as d3.SimulationLinkDatum<SimNode>[])
				.id((d: unknown) => (d as SimNode).id)
				.distance(100))
			.force('charge', d3.forceManyBody().strength(-200))
			.force('center', d3.forceCenter(width / 2, heightVal / 2))
			.force('collision', d3.forceCollide(20));

		simulation.on('tick', () => {
			linkElements
				.attr('x1', (d) => (d.source as SimNode).x)
				.attr('y1', (d) => (d.source as SimNode).y)
				.attr('x2', (d) => (d.target as SimNode).x)
				.attr('y2', (d) => (d.target as SimNode).y);

			nodeGroups.attr('transform', (d) => `translate(${d.x},${d.y})`);
		});
	}

	// Reactively build graph when nodes/loading state change
	$effect(() => {
		if (!loading && nodes.length > 0 && svgEl && containerEl) {
			buildGraph();
		}
	});

	$effect(() => {
		// Rebuild on resize (container dimensions)
		if (!loading && nodes.length > 0 && containerEl) {
			const width = containerEl.clientWidth;
			const heightVal = containerEl.clientHeight;
			if (width > 0 && heightVal > 0) {
				buildGraph();
			}
		}
	});

	let resizeObserver: ResizeObserver | null = null;

	onMount(() => {
		if (!containerEl) return;
		resizeObserver = new ResizeObserver(() => {
			if (!loading && nodes.length > 0 && svgEl && containerEl) {
				buildGraph();
			}
		});
		resizeObserver.observe(containerEl);

		return () => {
			resizeObserver?.disconnect();
		};
	});

	onDestroy(() => {
		if (simulation) simulation.stop();
	});
</script>

<div class="force-graph-container" bind:this={containerEl} style="height: {height};">
	{#if loading}
		<div class="graph-state">
			<div class="spinner"></div>
			<span>Loading graph...</span>
		</div>
	{:else if error}
		<div class="graph-state error">
			<span>{error}</span>
			<button type="button" class="retry-btn" onclick={() => void loadGraphData()}>Retry</button>
		</div>
	{:else if nodes.length === 0}
		<div class="graph-state empty">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
				<path d="M12 2L2 7l10 5 10-5-10-5z"/>
				<path d="M2 17l10 5 10-5"/>
				<path d="M2 12l10 5 10-5"/>
			</svg>
			<span>No connections yet</span>
			<span class="hint">Create [[wikilinks]] in your notes to build connections.</span>
		</div>
	{:else}
		<svg bind:this={svgEl} width="100%" height="100%" class="force-graph-svg"></svg>

		{#if selectedNode}
			<div class="node-preview" style="position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);">
				<div class="preview-card">
					<span class="preview-type">{selectedNode.type}</span>
					<span class="preview-title">{selectedNode.title}</span>
					<span class="preview-id">{selectedNode.id.slice(0, 12)}…</span>
				</div>
			</div>
		{/if}
	{/if}

	<div class="graph-legend">
		{#each Object.keys(NODE_TYPE_COLORS) as type}
			<span class="legend-item">
				<span class="legend-dot" style="background: {getNodeColor(type)}"></span>
				{type}
			</span>
		{/each}
	</div>
</div>

<style lang="sass">
	.force-graph-container
		position: relative
		width: 100%
		overflow: hidden
		background: var(--surface-00)

	.force-graph-svg
		display: block

	.graph-state
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		gap: 12px
		height: 100%
		min-height: 300px
		color: var(--fore-tertiary)
		font-size: 14px

		&.error
			color: #ef4444

		.hint
			font-size: 12px
			color: var(--fore-quaternary)
			font-style: italic
			max-width: 240px
			text-align: center

	.spinner
		width: 24px
		height: 24px
		border: 2px solid var(--medium-00)
		border-top-color: var(--theme-main, #6366f1)
		border-radius: 50%
		animation: spin 0.6s linear infinite

		@keyframes spin
			to
				transform: rotate(360deg)

	.retry-btn
		padding: 6px 16px
		border-radius: 6px
		font-size: 12px
		border: 1px solid var(--medium-00)
		background: var(--surface-20)
		cursor: pointer
		color: var(--fore-primary)

	.node-preview
		z-index: 10
		pointer-events: none

	.preview-card
		display: flex
		align-items: center
		gap: 8px
		padding: 8px 14px
		border-radius: 8px
		background: var(--surface-20)
		border: 1px solid var(--medium-00)
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12)
		font-size: 12px

		.preview-type
			font-size: 10px
			color: var(--fore-tertiary)
			background: var(--medium-00)
			border-radius: 3px
			padding: 1px 5px
			text-transform: uppercase

		.preview-title
			font-weight: 600
			color: var(--fore-primary)

		.preview-id
			font-size: 10px
			color: var(--fore-quaternary)
			font-family: monospace

	.graph-legend
		position: absolute
		top: 12px
		right: 12px
		display: flex
		flex-wrap: wrap
		gap: 6px 10px
		padding: 6px 10px
		border-radius: 6px
		background: var(--surface-20)
		border: 1px solid var(--medium-00)
		font-size: 10px
		color: var(--fore-tertiary)
		max-width: 200px

		.legend-item
			display: flex
			align-items: center
			gap: 4px

		.legend-dot
			width: 8px
			height: 8px
			border-radius: 50%
			display: inline-block
			flex-shrink: 0
</style>
