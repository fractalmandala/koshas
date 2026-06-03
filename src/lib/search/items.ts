export interface ItemFtsSearchOptions {
	query: string;
	limit?: number;
	offset?: number;
}

export interface ItemSearchRow {
	id: string;
	item_type: string;
	source_url: string | null;
	normalized_url: string | null;
	title: string;
	description: string | null;
	body_text: string | null;
	ocr_text: string | null;
	summary: string | null;
	thumbnail: string | null;
	file_path: string | null;
	seen_at: string | null;
	updated_at: string;
	rank: number;
}

export interface ItemSearchResult {
	id: string;
	itemType: string;
	sourceUrl: string | null;
	normalizedUrl: string | null;
	title: string;
	description: string | null;
	bodyText: string | null;
	ocrText: string | null;
	summary: string | null;
	thumbnail: string | null;
	filePath: string | null;
	seenAt: string | null;
	updatedAt: string;
	rank: number;
}

export interface SearchQuery {
	sql: string;
	params: unknown[];
}

export interface SearchExecutor {
	select<T = unknown>(sql: string, params: unknown[]): Promise<T[]>;
}

export interface ItemSearchServiceDependencies {
	getDatabase(): Promise<SearchExecutor>;
}

export interface ItemSearchService {
	search(options: ItemFtsSearchOptions): Promise<ItemSearchResult[]>;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function buildItemFtsSearchQuery(options: ItemFtsSearchOptions): SearchQuery {
	const query = options.query.trim();

	if (query.length === 0) {
		throw new Error('Search query cannot be blank');
	}

	const limit = boundLimit(options.limit);
	const offset = Math.max(0, Math.trunc(options.offset ?? 0));

	return {
		sql: `
			SELECT
				items.id,
				items.item_type,
				items.source_url,
				items.normalized_url,
				items.title,
				items.description,
				items.body_text,
				items.ocr_text,
				items.summary,
				items.thumbnail,
				items.file_path,
				items.seen_at,
				items.updated_at,
				bm25(items_fts, 10.0, 5.0, 1.0, 1.0, 3.0) AS rank
			FROM items_fts
			JOIN items ON items.rowid = items_fts.rowid
			WHERE items_fts MATCH ?
			ORDER BY rank ASC, seen_at DESC, updated_at DESC
			LIMIT ? OFFSET ?
		`.trim(),
		params: [query, limit, offset]
	};
}

export function mapItemSearchRows(rows: readonly ItemSearchRow[]): ItemSearchResult[] {
	return rows.map((row) => ({
		id: row.id,
		itemType: row.item_type,
		sourceUrl: row.source_url,
		normalizedUrl: row.normalized_url,
		title: row.title,
		description: row.description,
		bodyText: row.body_text,
		ocrText: row.ocr_text,
		summary: row.summary,
		thumbnail: row.thumbnail,
		filePath: row.file_path,
		seenAt: row.seen_at,
		updatedAt: row.updated_at,
		rank: row.rank
	}));
}

export async function searchItems(
	executor: SearchExecutor,
	options: ItemFtsSearchOptions
): Promise<ItemSearchResult[]> {
	const query = buildItemFtsSearchQuery(options);
	const rows = await executor.select<ItemSearchRow>(query.sql, query.params);

	return mapItemSearchRows(rows);
}

export function createItemSearchService(dependencies: ItemSearchServiceDependencies): ItemSearchService {
	return {
		async search(options: ItemFtsSearchOptions): Promise<ItemSearchResult[]> {
			const database = await dependencies.getDatabase();
			return searchItems(database, options);
		}
	};
}

function boundLimit(limit: number | undefined): number {
	if (limit === undefined) {
		return DEFAULT_LIMIT;
	}

	return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit)));
}
