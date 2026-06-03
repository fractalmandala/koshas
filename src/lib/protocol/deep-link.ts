import { normalizeUrl } from '$lib/url/normalize';

export interface ProtocolCapture {
	url: string;
	normalizedUrl: string;
	title: string;
	selection: string;
}

export interface ProtocolSqlExecutor {
	select<T = unknown>(sql: string, params: unknown[]): Promise<T[]>;
	execute(sql: string, params: unknown[]): Promise<unknown>;
}

export interface PersistProtocolCaptureOptions {
	now?: string;
	createId?: () => string;
}

export interface PersistProtocolCaptureResult {
	itemId: string | null;
	inserted: boolean;
	merged: boolean;
	skipped?: boolean;
}

interface ExistingItemRow {
	id: string | null;
	tombstoned?: string | null;
}

const DEFAULT_NOW = () => new Date().toISOString();
const DEFAULT_ID = () => crypto.randomUUID();

export function parseKoshasAddUrl(input: string): ProtocolCapture | null {
	let url: URL;

	try {
		url = new URL(input);
	} catch {
		return null;
	}

	if (url.protocol !== 'koshas:' || url.hostname !== 'add') return null;

	const sourceUrl = url.searchParams.get('url')?.trim();
	if (!sourceUrl) return null;

	try {
		return {
			url: sourceUrl,
			normalizedUrl: normalizeUrl(sourceUrl),
			title: url.searchParams.get('title')?.trim() ?? '',
			selection: url.searchParams.get('selection')?.trim() ?? ''
		};
	} catch {
		return null;
	}
}

export async function persistProtocolCapture(
	executor: ProtocolSqlExecutor,
	capture: ProtocolCapture,
	options: PersistProtocolCaptureOptions = {}
): Promise<PersistProtocolCaptureResult> {
	const now = options.now ?? DEFAULT_NOW();
	const createId = options.createId ?? DEFAULT_ID;
	const existing = await findItemByNormalizedUrl(executor, capture.normalizedUrl);
	if (existing?.tombstoned) {
		return { itemId: null, inserted: false, merged: false, skipped: true };
	}
	const itemId = existing?.id ?? createId();

	if (existing?.id) {
		await updateExistingItem(executor, itemId, capture, now);
	} else {
		await insertItem(executor, itemId, capture, now);
	}

	await upsertExtensionSource(executor, itemId, capture, now);

	return {
		itemId,
		inserted: !existing,
		merged: Boolean(existing)
	};
}

async function findItemByNormalizedUrl(
	executor: ProtocolSqlExecutor,
	normalizedUrl: string
): Promise<ExistingItemRow | null> {
	const rows = await executor.select<ExistingItemRow>(
		`
			SELECT
				items.id,
				deleted_items.normalized_url AS tombstoned
			FROM (SELECT ? AS normalized_url) AS capture
			LEFT JOIN items ON items.normalized_url = capture.normalized_url
			LEFT JOIN deleted_items ON deleted_items.normalized_url = capture.normalized_url
			LIMIT 1
		`.trim(),
		[normalizedUrl]
	);
	return rows[0] ?? null;
}

async function insertItem(
	executor: ProtocolSqlExecutor,
	itemId: string,
	capture: ProtocolCapture,
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
				metadata,
				manually_added,
				created_at,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`.trim(),
		[
			itemId,
			'bookmark',
			capture.url,
			capture.normalizedUrl,
			capture.title,
			JSON.stringify({ selection: capture.selection }),
			true,
			now,
			now
		]
	);
}

async function updateExistingItem(
	executor: ProtocolSqlExecutor,
	itemId: string,
	capture: ProtocolCapture,
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
		[capture.url, capture.title, capture.title, now, itemId]
	);
}

async function upsertExtensionSource(
	executor: ProtocolSqlExecutor,
	itemId: string,
	capture: ProtocolCapture,
	now: string
): Promise<void> {
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
			`extension:${capture.normalizedUrl}`,
			itemId,
			'extension',
			'extension',
			capture.normalizedUrl,
			now,
			now,
			now,
			now
		]
	);
}
