export const ENRICHMENT_JOB_TYPES = ['ocr', 'autoTag', 'summarize', 'embed', 'extractColors'] as const;

export type EnrichmentJobType = (typeof ENRICHMENT_JOB_TYPES)[number];
export type EnrichmentStatus = 'pending' | 'enriching' | 'done' | 'failed';

export interface EnrichmentJob {
	itemId: string;
	type: EnrichmentJobType;
}

export interface EnrichmentExecutor {
	execute(sql: string, params: unknown[]): Promise<unknown>;
}

export interface EnrichmentPatch {
	aiTags?: string[];
	colors?: string[];
	ocrText?: string;
	summary?: string;
	embedding?: Uint8Array;
}

export type EnrichmentHandler = (job: EnrichmentJob) => Promise<EnrichmentPatch | void>;

export type EnrichmentHandlers = Partial<Record<EnrichmentJobType, EnrichmentHandler>>;

export interface EnrichmentQueueOptions {
	handlers?: EnrichmentHandlers;
	now?: () => string;
}

export interface EnrichmentDrainResult {
	processed: number;
	failed: number;
}

interface AllowedField {
	key: keyof EnrichmentPatch;
	column: string;
	serialize?: (value: unknown) => unknown;
}

const DEFAULT_NOW = () => new Date().toISOString();

const DEFAULT_HANDLERS: Record<EnrichmentJobType, EnrichmentHandler> = {
	ocr: async () => ({}),
	autoTag: async () => ({}),
	summarize: async () => ({}),
	embed: async () => ({}),
	extractColors: async () => ({})
};

const ALLOWED_FIELDS: Record<EnrichmentJobType, AllowedField[]> = {
	ocr: [{ key: 'ocrText', column: 'ocr_text' }],
	autoTag: [{ key: 'aiTags', column: 'ai_tags', serialize: JSON.stringify }],
	summarize: [{ key: 'summary', column: 'summary' }],
	embed: [{ key: 'embedding', column: 'embedding' }],
	extractColors: [{ key: 'colors', column: 'colors', serialize: JSON.stringify }]
};

export function createEnrichmentQueue(executor: EnrichmentExecutor, options: EnrichmentQueueOptions = {}) {
	const jobs: EnrichmentJob[] = [];
	const handlers = { ...DEFAULT_HANDLERS, ...options.handlers };
	const now = options.now ?? DEFAULT_NOW;

	return {
		enqueue(job: EnrichmentJob): void {
			jobs.push(job);
		},

		async drain(): Promise<EnrichmentDrainResult> {
			const result: EnrichmentDrainResult = { processed: 0, failed: 0 };

			while (jobs.length > 0) {
				const job = jobs.shift();
				if (!job) continue;

				await updateStatus(executor, job.itemId, 'enriching', now());

				try {
					const patch = (await handlers[job.type](job)) ?? {};
					await applyPatch(executor, job, patch, now());
					await updateStatus(executor, job.itemId, 'done', now());
					result.processed += 1;
				} catch {
					await updateStatus(executor, job.itemId, 'failed', now());
					result.failed += 1;
				}
			}

			return result;
		}
	};
}

async function updateStatus(
	executor: EnrichmentExecutor,
	itemId: string,
	status: EnrichmentStatus,
	now: string
): Promise<void> {
	await executor.execute('UPDATE items SET enrichment_status = ?, updated_at = ? WHERE id = ?', [
		status,
		now,
		itemId
	]);
}

async function applyPatch(
	executor: EnrichmentExecutor,
	job: EnrichmentJob,
	patch: EnrichmentPatch,
	now: string
): Promise<void> {
	const fields = ALLOWED_FIELDS[job.type].filter((field) => patch[field.key] !== undefined);
	if (fields.length === 0) return;

	const assignments = fields.map((field) => `${field.column} = ?`);
	const values = fields.map((field) => {
		const value = patch[field.key];
		return field.serialize ? field.serialize(value) : value;
	});

	await executor.execute(`UPDATE items SET ${assignments.join(', ')}, updated_at = ? WHERE id = ?`, [
		...values,
		now,
		job.itemId
	]);
}
