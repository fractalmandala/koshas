import type Database from '@tauri-apps/plugin-sql';

import { classifyImportedItemGroups } from '$lib/groups/persistence';

export interface BrowserImportCandidate {
	sourceType: 'browser_history' | 'browser_bookmark';
	sourceUrl: string;
	normalizedUrl: string;
	title: string;
	sourceName: string;
	sourceId: string;
	lastSeenAt: number;
}

export interface DetectedBrowserSource {
	browserName: string;
	profileName: string;
	historyPath: string;
	bookmarksPath: string | null;
	exists: boolean;
	browserRunning: boolean;
}

export interface ImportBrowserHistoryRequest {
	importId: string;
	browserName: string;
	historyPath: string;
	bookmarksPath: string | null;
	currentYear: number;
}

export interface ImportBrowserHistoryResponse {
	importedCount: number;
	candidates: BrowserImportCandidate[];
}

export interface SqlExecutor {
	select<T = unknown>(sql: string, params: unknown[]): Promise<T[]>;
	execute(sql: string, params: unknown[]): Promise<void>;
}

export interface PersistBrowserImportOptions {
	now?: string;
	createId?: () => string;
}

export interface PersistBrowserImportResult {
	inserted: number;
	merged: number;
	sourcesUpserted: number;
}

export interface BrowserImportRuntime {
	invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
	getDatabase(): Promise<Database>;
	createId?: () => string;
	now?: () => string;
}

interface ExistingItemRow {
	id: string | null;
	tombstoned?: string | null;
}

const DEFAULT_NOW = () => new Date().toISOString();
const DEFAULT_ID = () => crypto.randomUUID();

export async function runBrowserImport(
	runtime: BrowserImportRuntime,
	source: DetectedBrowserSource,
	currentYear = new Date().getFullYear()
): Promise<PersistBrowserImportResult & { importedCount: number }> {
	const importId = runtime.createId?.() ?? DEFAULT_ID();
	const response = await runtime.invoke<ImportBrowserHistoryResponse>('import_browser_history', {
		request: {
			importId,
			browserName: source.browserName,
			historyPath: source.historyPath,
			bookmarksPath: source.bookmarksPath,
			currentYear
		} satisfies ImportBrowserHistoryRequest
	});
	const database = await runtime.getDatabase();
	const persisted = await persistBrowserImportCandidates(createTauriSqlExecutor(database), response.candidates, {
		createId: runtime.createId,
		now: runtime.now?.()
	});

	return {
		...persisted,
		importedCount: response.importedCount
	};
}

export function createTauriSqlExecutor(database: Database): SqlExecutor {
	return {
		select: <T>(sql: string, params: unknown[]) => database.select<T[]>(sql, params),
		execute: async (sql: string, params: unknown[]) => {
			await database.execute(sql, params);
		}
	};
}

export async function persistBrowserImportCandidates(
	executor: SqlExecutor,
	candidates: readonly BrowserImportCandidate[],
	options: PersistBrowserImportOptions = {}
): Promise<PersistBrowserImportResult> {
	const now = options.now ?? DEFAULT_NOW();
	const createId = options.createId ?? DEFAULT_ID;
	const uniqueCandidates = dedupeSourceCandidates(candidates);
	const itemIdsByNormalizedUrl = new Map<string, string>();
	const classifiedItemIds = new Set<string>();
	const result: PersistBrowserImportResult = { inserted: 0, merged: 0, sourcesUpserted: 0 };

	for (const candidate of uniqueCandidates) {
		const cachedItemId = itemIdsByNormalizedUrl.get(candidate.normalizedUrl);
		let itemId = cachedItemId;

		if (!itemId) {
			const existing = await findItemByNormalizedUrl(executor, candidate.normalizedUrl);
			if (existing?.tombstoned) continue;
			itemId = existing?.id ?? createId();
			itemIdsByNormalizedUrl.set(candidate.normalizedUrl, itemId);

			if (existing?.id) {
				await updateExistingItem(executor, itemId, candidate, now);
				result.merged += 1;
			} else {
				await insertItem(executor, itemId, candidate, now);
				result.inserted += 1;
			}
		}

		await upsertSource(executor, itemId, candidate, now);
		result.sourcesUpserted += 1;

		if (!classifiedItemIds.has(itemId)) {
			await classifyImportedItemGroups(
				executor,
				{
					id: itemId,
					url: candidate.sourceUrl,
					title: candidate.title,
					description: null
				},
				{ now }
			);
			classifiedItemIds.add(itemId);
		}
	}

	return result;
}

function dedupeSourceCandidates(candidates: readonly BrowserImportCandidate[]): BrowserImportCandidate[] {
	const seen = new Set<string>();
	const unique: BrowserImportCandidate[] = [];

	for (const candidate of candidates) {
		const identity = `${candidate.sourceType}:${candidate.sourceName}:${candidate.sourceId}`;
		if (seen.has(identity)) continue;
		seen.add(identity);
		unique.push(candidate);
	}

	return unique;
}

async function findItemByNormalizedUrl(
	executor: SqlExecutor,
	normalizedUrl: string
): Promise<ExistingItemRow | null> {
	const rows = await executor.select<ExistingItemRow>(
		`
			SELECT
				items.id,
				deleted_items.normalized_url AS tombstoned
			FROM (SELECT ? AS normalized_url) AS candidate
			LEFT JOIN items ON items.normalized_url = candidate.normalized_url
			LEFT JOIN deleted_items ON deleted_items.normalized_url = candidate.normalized_url
			LIMIT 1
		`.trim(),
		[normalizedUrl]
	);
	return rows[0] ?? null;
}

async function insertItem(
	executor: SqlExecutor,
	itemId: string,
	candidate: BrowserImportCandidate,
	now: string
): Promise<void> {
	await executor.execute(
		`
			INSERT INTO items (
				id,
				item_type,
				source_url,
				normalized_url,
				title,
				manually_added,
				created_at,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`.trim(),
		[
			itemId,
			'bookmark',
			candidate.sourceUrl,
			candidate.normalizedUrl,
			candidate.title,
			false,
			now,
			now
		]
	);
}

async function updateExistingItem(
	executor: SqlExecutor,
	itemId: string,
	candidate: BrowserImportCandidate,
	now: string
): Promise<void> {
	await executor.execute(
		`
			UPDATE items
			SET
				source_url = COALESCE(source_url, ?),
				title = CASE
					WHEN title_user_edited = 0 AND ? != '' THEN ?
					ELSE title
				END,
				updated_at = ?
			WHERE id = ?
		`.trim(),
		[candidate.sourceUrl, candidate.title, candidate.title, now, itemId]
	);
}

async function upsertSource(
	executor: SqlExecutor,
	itemId: string,
	candidate: BrowserImportCandidate,
	now: string
): Promise<void> {
	const seenAt = chromeMicrosToIso(candidate.lastSeenAt) ?? now;
	await executor.execute(
		`
			INSERT INTO sources (
				id,
				item_id,
				source_type,
				source_name,
				source_id,
				first_seen_at,
				last_seen_at,
				created_at,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(source_type, source_name, source_id)
			DO UPDATE SET
				item_id = excluded.item_id,
				last_seen_at = excluded.last_seen_at,
				updated_at = excluded.updated_at
		`.trim(),
		[
			`${candidate.sourceType}:${candidate.sourceName}:${candidate.sourceId}`,
			itemId,
			candidate.sourceType,
			candidate.sourceName,
			candidate.sourceId,
			seenAt,
			seenAt,
			now,
			now
		]
	);
}

function chromeMicrosToIso(value: number): string | null {
	if (value <= 0) return null;
	const unixMillis = Math.trunc((value - 11_644_473_600_000_000) / 1_000);
	return new Date(unixMillis).toISOString();
}
