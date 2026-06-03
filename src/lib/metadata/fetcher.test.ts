import { describe, expect, it } from 'vitest';

import {
	applyMetadataToItem,
	enrichItemMetadata,
	fetchPageMetadata,
	startMetadataEnrichment,
	type MetadataFetchItem,
	type PageMetadata
} from './fetcher';

const html = `
	<html>
		<head>
			<meta property="og:title" content="Open Graph Title" />
			<meta name="twitter:title" content="Twitter Title" />
			<meta property="og:description" content="Open Graph Description" />
			<meta name="twitter:description" content="Twitter Description" />
			<meta property="og:image" content="/image.png" />
			<title>Document Title</title>
		</head>
		<body>
			<article><h1>Readable</h1><p>Article body text.</p></article>
		</body>
	</html>
`;

describe('fetchPageMetadata', () => {
	it('uses Open Graph metadata before Twitter and document fallbacks', async () => {
		const metadata = await fetchPageMetadata('https://example.com/page', {
			fetchHtml: async () => html,
			extractReadableText: async () => 'Article body text.'
		});

		expect(metadata).toEqual({
			title: 'Open Graph Title',
			description: 'Open Graph Description',
			image: 'https://example.com/image.png',
			bodyText: 'Article body text.',
			error: null
		});
	});

	it('falls back to Twitter metadata and title when Open Graph is absent', async () => {
		const metadata = await fetchPageMetadata('https://example.com/page', {
			fetchHtml: async () => `
				<meta name="twitter:title" content="Twitter Title" />
				<meta name="twitter:description" content="Twitter Description" />
				<title>Document Title</title>
			`,
			extractReadableText: async () => null
		});

		expect(metadata.title).toBe('Twitter Title');
		expect(metadata.description).toBe('Twitter Description');
		expect(metadata.bodyText).toBeNull();
	});

	it('reports timeout and network errors without throwing', async () => {
		const metadata = await fetchPageMetadata('https://example.com/page', {
			timeoutMs: 1,
			fetchHtml: async (_url, { signal }) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				if (signal.aborted) throw new DOMException('aborted', 'AbortError');
				return html;
			},
			extractReadableText: async () => null
		});

		expect(metadata.error).toContain('timed out');
		expect(metadata.title).toBeNull();
	});
});

describe('applyMetadataToItem', () => {
	const item: MetadataFetchItem = {
		id: 'item-1',
		title: 'User title',
		description: 'User description',
		thumbnail: 'user.png',
		bodyText: null,
		titleUserEdited: true,
		descriptionUserEdited: true,
		thumbnailUserEdited: true
	};

	const metadata: PageMetadata = {
		title: 'Fetched title',
		description: 'Fetched description',
		image: 'fetched.png',
		bodyText: 'Fetched body',
		error: null
	};

	it('respects field-level user edit locks', () => {
		expect(applyMetadataToItem(item, metadata)).toEqual({
			...item,
			bodyText: 'Fetched body'
		});
	});

	it('fills unlocked empty fields from metadata', () => {
		expect(
			applyMetadataToItem(
				{
					...item,
					title: '',
					description: null,
					thumbnail: null,
					titleUserEdited: false,
					descriptionUserEdited: false,
					thumbnailUserEdited: false
				},
				metadata
			)
		).toMatchObject({
			title: 'Fetched title',
			description: 'Fetched description',
			thumbnail: 'fetched.png',
			bodyText: 'Fetched body'
		});
	});
});

describe('enrichItemMetadata', () => {
	it('fetches, respects locks, and persists merged metadata for one explicit item', async () => {
		const executed: Array<{ sql: string; params: unknown[] }> = [];
		const result = await enrichItemMetadata(
			{
				select: async <T>() =>
					[
						{
							id: 'item-1',
							source_url: 'https://example.com',
							title: '',
							description: null,
							thumbnail: null,
							body_text: null,
							title_user_edited: 0,
							description_user_edited: 0,
							thumbnail_user_edited: 0
						}
					] as T[],
				execute: async (sql, params) => {
					executed.push({ sql, params });
				}
			},
			'item-1',
			{
				fetchHtml: async () => html,
				extractReadableText: async () => 'Article body text.'
			}
		);

		expect(result.error).toBeNull();
		expect(executed[0].sql).toContain('UPDATE items');
		expect(executed[0].params).toContain('Open Graph Title');
		expect(executed[0].params).toContain('Open Graph Description');
		expect(executed[0].params).toContain('https://example.com/image.png');
		expect(executed[0].params).toContain('Article body text.');
	});

	it('does not retry automatically after a failed fetch', async () => {
		let fetchCount = 0;
		const result = await enrichItemMetadata(
			{
				select: async <T>() =>
					[
						{
							id: 'item-1',
							source_url: 'https://example.com',
							title: '',
							description: null,
							thumbnail: null,
							body_text: null,
							title_user_edited: 0,
							description_user_edited: 0,
							thumbnail_user_edited: 0
						}
					] as T[],
				execute: async () => {}
			},
			'item-1',
			{
				fetchHtml: async () => {
					fetchCount += 1;
					throw new Error('DNS failed');
				},
				extractReadableText: async () => null
			}
		);

		expect(fetchCount).toBe(1);
		expect(result.error).toBe('DNS failed');
	});
});

describe('startMetadataEnrichment', () => {
	it('starts enrichment without requiring callers to await completion', async () => {
		const completed: string[] = [];
		const task = startMetadataEnrichment('item-1', async (itemId) => {
			completed.push(itemId);
		});

		expect(completed).toEqual([]);
		await task;
		expect(completed).toEqual(['item-1']);
	});

	it('captures failures without throwing to the caller', async () => {
		const task = startMetadataEnrichment('item-1', async () => {
			throw new Error('fetch failed');
		});

		await expect(task).resolves.toEqual({ itemId: 'item-1', error: 'fetch failed' });
	});
});
