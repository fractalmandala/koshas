<script lang="ts">
	import { browser } from '$app/environment';
	import { getSuggestion, recordKeep, recordForget, getRemainingCount } from '$lib/serendipity/engine';

	interface SerendipityItem {
		id: string;
		title: string;
		description: string;
		type: string;
		dateAdded: string;
	}

	let suggestion = $state<SerendipityItem | null>(null);
	let remaining = $state(0);
	let loading = $state(false);
	let actionLoading = $state(false);
	let dismissed = $state(false);

	$effect(() => {
		if (browser) {
			void loadSuggestion();
		}
	});

	async function loadSuggestion() {
		loading = true;
		dismissed = false;
		try {
			const { getInitializedDatabase } = await import('$lib/db');
			const db = await getInitializedDatabase();
			const executor = {
				select: <T>(sql: string, params?: unknown[]) => db.select<T>(sql, params),
				execute: (sql: string, params?: unknown[]) => db.execute(sql, params)
			};

			const [s, r] = await Promise.all([
				getSuggestion(executor),
				getRemainingCount(executor)
			]);

			suggestion = s;
			remaining = r;
		} catch {
			suggestion = null;
			remaining = 0;
		} finally {
			loading = false;
		}
	}

	async function handleKeep() {
		if (!suggestion) return;
		actionLoading = true;
		try {
			const { getInitializedDatabase } = await import('$lib/db');
			const db = await getInitializedDatabase();
			const executor = {
				select: <T>(sql: string, params?: unknown[]) => db.select<T>(sql, params),
				execute: (sql: string, params?: unknown[]) => db.execute(sql, params)
			};

			await recordKeep(executor, suggestion.id);
			dismissed = true;
			remaining = Math.max(0, remaining - 1);
			// Load next suggestion after a brief delay
			setTimeout(() => void loadSuggestion(), 800);
		} catch {
			// Silently fail
		} finally {
			actionLoading = false;
		}
	}

	async function handleForget() {
		if (!suggestion) return;
		actionLoading = true;
		try {
			const { getInitializedDatabase } = await import('$lib/db');
			const db = await getInitializedDatabase();
			const executor = {
				select: <T>(sql: string, params?: unknown[]) => db.select<T>(sql, params),
				execute: (sql: string, params?: unknown[]) => db.execute(sql, params)
			};

			await recordForget(executor, suggestion.id);
			dismissed = true;
			remaining = Math.max(0, remaining - 1);
			setTimeout(() => void loadSuggestion(), 800);
		} catch {
			// Silently fail
		} finally {
			actionLoading = false;
		}
	}

	function handleSurpriseMe() {
		void loadSuggestion();
	}

	function getTypeIcon(type: string): string {
		const icons: Record<string, string> = {
			bookmark: '\ud83d\udd17',
			article: '\ud83d\udcdd',
			note: '\ud83d\udcd6',
			podcast: '\ud83c\udf99\ufe0f',
			video: '\ud83c\udfac',
			image: '\ud83d\uddbc\ufe0f',
			pdf: '\ud83d\udcc4',
			highlight: '\ud83d\udd0d',
			product: '\ud83d\udced',
			recipe: '\ud83c\udf7d\ufe0f',
			book: '\ud83d\udcda'
		};
		return icons[type] || '\ud83d\udccc';
	}

	function formatDate(dateStr: string): string {
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		} catch {
			return dateStr;
		}
	}
</script>

<div class="serendipity-panel">
	<div class="serendipity-header">
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M12 2L2 7l10 5 10-5-10-5z"/>
			<path d="M2 17l10 5 10-5"/>
			<path d="M2 12l10 5 10-5"/>
		</svg>
		<span>Serendipity</span>
		{#if remaining > 0}
			<span class="badge">{remaining}</span>
		{/if}
	</div>

	<div class="serendipity-body">
		{#if loading}
			<div class="serendipity-status">Finding something interesting...</div>
		{:else if suggestion}
			{#if !dismissed}
				<div class="suggestion-card">
					<div class="suggestion-type">
						<span class="type-icon">{getTypeIcon(suggestion.type)}</span>
						<span class="type-label">{suggestion.type}</span>
					</div>
					<div class="suggestion-title">{suggestion.title}</div>
					{#if suggestion.description}
						<div class="suggestion-desc">{suggestion.description.slice(0, 120)}</div>
					{/if}
					<div class="suggestion-date">Added {formatDate(suggestion.dateAdded)}</div>
					<div class="suggestion-actions">
						<button
							type="button"
							class="action-btn keep"
							onclick={handleKeep}
							disabled={actionLoading}
						>
							{actionLoading ? '...' : 'Keep'}
						</button>
						<button
							type="button"
							class="action-btn forget"
							onclick={handleForget}
							disabled={actionLoading}
						>
							{actionLoading ? '...' : 'Forget'}
						</button>
					</div>
				</div>
			{/if}
			<button type="button" class="surprise-btn" onclick={handleSurpriseMe}>
				Surprise me again
			</button>
		{:else}
			<div class="serendipity-empty">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
					<circle cx="12" cy="12" r="10"/>
					<path d="M12 6v6l4 2"/>
				</svg>
				<p>All caught up!</p>
				<span class="hint">Add more items to discover new connections.</span>
			</div>
		{/if}
	</div>
</div>

<style lang="sass">
	.serendipity-panel
		border-top: 1px solid var(--medium-00)
		background: var(--surface-20)

	.serendipity-header
		display: flex
		align-items: center
		gap: 6px
		padding: 10px 12px
		font-size: 12px
		font-weight: 600
		color: var(--fore-secondary)

		.badge
			margin-left: auto
			background: var(--accent-20)
			color: var(--accent)
			border-radius: 10px
			padding: 0 6px
			font-size: 10px
			font-weight: 500

	.serendipity-body
		padding: 0 8px 12px

	.serendipity-status
		padding: 16px 8px
		text-align: center
		font-size: 12px
		color: var(--fore-tertiary)

	.suggestion-card
		background: var(--surface-10)
		border: 1px solid var(--medium-10)
		border-radius: 8px
		padding: 12px

	.suggestion-type
		display: flex
		align-items: center
		gap: 4px
		margin-bottom: 6px

		.type-icon
			font-size: 12px

		.type-label
			font-size: 10px
			font-weight: 500
			color: var(--fore-tertiary)
			text-transform: capitalize

	.suggestion-title
		font-size: 13px
		font-weight: 600
		color: var(--fore-primary)
		margin-bottom: 4px
		line-height: 1.4

	.suggestion-desc
		font-size: 11px
		color: var(--fore-tertiary)
		margin-bottom: 6px
		line-height: 1.4

	.suggestion-date
		font-size: 10px
		color: var(--fore-quaternary)
		margin-bottom: 10px

	.suggestion-actions
		display: flex
		gap: 6px

		.action-btn
			flex: 1
			padding: 6px 12px
			border-radius: 6px
			font-size: 11px
			font-weight: 500
			cursor: pointer
			transition: all 0.12s ease
			border: none

			&.keep
				background: var(--accent-20)
				color: var(--accent)
				&:hover:not(:disabled)
					background: var(--accent-30)

			&.forget
				background: var(--medium-00)
				color: var(--fore-tertiary)
				&:hover:not(:disabled)
					background: var(--medium-10)

			&:disabled
				opacity: 0.6
				cursor: not-allowed

	.surprise-btn
		width: 100%
		margin-top: 8px
		padding: 6px
		border-radius: 6px
		font-size: 11px
		font-weight: 500
		background: var(--medium-00)
		color: var(--fore-secondary)
		border: none
		cursor: pointer
		transition: all 0.12s ease

		&:hover
			background: var(--medium-10)

	.serendipity-empty
		padding: 24px 12px
		text-align: center
		display: flex
		flex-direction: column
		align-items: center
		gap: 8px

		p
			font-size: 12px
			color: var(--fore-tertiary)
			margin: 0

		.hint
			font-size: 11px
			color: var(--fore-quaternary)
			font-style: italic
</style>
