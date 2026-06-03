export interface PageMetadata {
	title: string | null;
	description: string | null;
	image: string | null;
	bodyText: string | null;
	error: string | null;
}

export interface FetchHtmlOptions {
	signal: AbortSignal;
}

export interface MetadataFetchOptions {
	timeoutMs?: number;
	fetchHtml?: (url: string, options: FetchHtmlOptions) => Promise<string>;
	extractReadableText?: (html: string, url: string) => Promise<string | null>;
}

export interface MetadataFetchItem {
	id: string;
	title: string;
	description: string | null;
	thumbnail: string | null;
	bodyText: string | null;
	titleUserEdited: boolean;
	descriptionUserEdited: boolean;
	thumbnailUserEdited: boolean;
}

export interface MetadataSqlExecutor {
	select<T = unknown>(sql: string, params: unknown[]): Promise<T[]>;
	execute(sql: string, params: unknown[]): Promise<void>;
}

export interface MetadataEnrichmentTaskResult {
	itemId: string;
	error: string | null;
}

interface MetadataItemRow {
	id: string;
	source_url: string | null;
	title: string;
	description: string | null;
	thumbnail: string | null;
	body_text: string | null;
	title_user_edited: number;
	description_user_edited: number;
	thumbnail_user_edited: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchPageMetadata(
	url: string,
	options: MetadataFetchOptions = {}
): Promise<PageMetadata> {
	const controller = new AbortController();
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const html = await (options.fetchHtml ?? defaultFetchHtml)(url, { signal: controller.signal });
		const metadata = parseMetadata(html, url);
		const bodyText = await (options.extractReadableText ?? extractReadableText)(html, url);

		return {
			...metadata,
			bodyText,
			error: null
		};
	} catch (error) {
		return emptyMetadata(formatFetchError(error, timeoutMs));
	} finally {
		clearTimeout(timeout);
	}
}

export function applyMetadataToItem<T extends MetadataFetchItem>(
	item: T,
	metadata: PageMetadata
): T {
	return {
		...item,
		title: item.titleUserEdited || !metadata.title ? item.title : metadata.title,
		description:
			item.descriptionUserEdited || !metadata.description ? item.description : metadata.description,
		thumbnail: item.thumbnailUserEdited || !metadata.image ? item.thumbnail : metadata.image,
		bodyText: item.bodyText ?? metadata.bodyText
	};
}

export async function enrichItemMetadata(
	executor: MetadataSqlExecutor,
	itemId: string,
	options: MetadataFetchOptions = {}
): Promise<PageMetadata> {
	const item = await findMetadataItem(executor, itemId);
	if (!item.source_url) {
		return emptyMetadata('Item has no source URL');
	}

	const metadata = await fetchPageMetadata(item.source_url, options);
	if (metadata.error) {
		return metadata;
	}

	const merged = applyMetadataToItem(
		{
			id: item.id,
			title: item.title,
			description: item.description,
			thumbnail: item.thumbnail,
			bodyText: item.body_text,
			titleUserEdited: item.title_user_edited === 1,
			descriptionUserEdited: item.description_user_edited === 1,
			thumbnailUserEdited: item.thumbnail_user_edited === 1
		},
		metadata
	);

	await executor.execute(
		`
			UPDATE items
			SET
				title = ?,
				description = ?,
				thumbnail = ?,
				body_text = ?,
				updated_at = ?
			WHERE id = ?
		`.trim(),
		[
			merged.title,
			merged.description,
			merged.thumbnail,
			merged.bodyText,
			new Date().toISOString(),
			itemId
		]
	);

	return metadata;
}

export function startMetadataEnrichment(
	itemId: string,
	enrich: (itemId: string) => Promise<unknown>
): Promise<MetadataEnrichmentTaskResult> {
	return Promise.resolve()
		.then(() => enrich(itemId))
		.then(() => ({ itemId, error: null }))
		.catch((error: unknown) => ({
			itemId,
			error: error instanceof Error ? error.message : String(error)
		}));
}

async function findMetadataItem(
	executor: MetadataSqlExecutor,
	itemId: string
): Promise<MetadataItemRow> {
	const rows = await executor.select<MetadataItemRow>(
		`
			SELECT
				id,
				source_url,
				title,
				description,
				thumbnail,
				body_text,
				title_user_edited,
				description_user_edited,
				thumbnail_user_edited
			FROM items
			WHERE id = ?
			LIMIT 1
		`.trim(),
		[itemId]
	);
	const item = rows[0];
	if (!item) {
		throw new Error(`Item not found: ${itemId}`);
	}
	return item;
}

function parseMetadata(html: string, pageUrl: string): Omit<PageMetadata, 'bodyText' | 'error'> {
	const title =
		getMetaContent(html, 'property', 'og:title') ??
		getMetaContent(html, 'name', 'twitter:title') ??
		getTitle(html);
	const description =
		getMetaContent(html, 'property', 'og:description') ??
		getMetaContent(html, 'name', 'twitter:description') ??
		getMetaContent(html, 'name', 'description');
	const image =
		getMetaContent(html, 'property', 'og:image') ??
		getMetaContent(html, 'name', 'twitter:image');

	return {
		title,
		description,
		image: image ? resolveUrl(image, pageUrl) : null
	};
}

async function defaultFetchHtml(url: string, { signal }: FetchHtmlOptions): Promise<string> {
	const response = await fetch(url, { signal });
	if (!response.ok) {
		throw new Error(`Metadata fetch failed with HTTP ${response.status}`);
	}
	return response.text();
}

async function extractReadableText(html: string, _url: string): Promise<string | null> {
	if (typeof DOMParser !== 'undefined') {
		try {
			const { Readability } = await import('@mozilla/readability');
			const document = new DOMParser().parseFromString(html, 'text/html');
			const article = new Readability(document).parse();
			if (article?.textContent) {
				return normalizeWhitespace(article.textContent);
			}
		} catch {
			// Fall back to simple extraction; metadata fetch should not fail because readability failed.
		}
	}

	const article = extractTagText(html, 'article') ?? extractTagText(html, 'main') ?? extractTagText(html, 'body');
	return article ? normalizeWhitespace(article) : null;
}

function getMetaContent(html: string, key: 'name' | 'property', value: string): string | null {
	const pattern = new RegExp(`<meta\\s+[^>]*${key}=["']${escapeRegExp(value)}["'][^>]*>`, 'i');
	const match = html.match(pattern);
	if (!match) return null;
	return getAttribute(match[0], 'content');
}

function getTitle(html: string): string | null {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	return match ? decodeHtml(normalizeWhitespace(stripTags(match[1] ?? ''))) : null;
}

function getAttribute(tag: string, attribute: string): string | null {
	const pattern = new RegExp(`${attribute}=["']([^"']*)["']`, 'i');
	const match = tag.match(pattern);
	return match ? decodeHtml(match[1] ?? '') : null;
}

function extractTagText(html: string, tagName: string): string | null {
	const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
	const match = html.match(pattern);
	return match ? stripTags(match[1] ?? '') : null;
}

function stripTags(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ');
}

function normalizeWhitespace(value: string): string {
	return decodeHtml(value).replace(/\s+/g, ' ').trim();
}

function decodeHtml(value: string): string {
	return value
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function resolveUrl(value: string, pageUrl: string): string {
	return new URL(value, pageUrl).toString();
}

function emptyMetadata(error: string): PageMetadata {
	return {
		title: null,
		description: null,
		image: null,
		bodyText: null,
		error
	};
}

function formatFetchError(error: unknown, timeoutMs: number): string {
	if (error instanceof DOMException && error.name === 'AbortError') {
		return `Metadata fetch timed out after ${timeoutMs}ms`;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
