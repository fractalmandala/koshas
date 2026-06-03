import { describe, expect, it } from 'vitest';

import {
	ENRICHMENT_JOB_TYPES,
	createEnrichmentQueue,
	type EnrichmentExecutor,
	type EnrichmentHandlers
} from './pipeline';

class RecordingExecutor implements EnrichmentExecutor {
	executed: Array<{ sql: string; params: unknown[] }> = [];

	async execute(sql: string, params: unknown[]): Promise<void> {
		this.executed.push({ sql, params });
	}
}

describe('createEnrichmentQueue', () => {
	it('dispatches default stub handlers and marks the item done', async () => {
		const executor = new RecordingExecutor();
		const queue = createEnrichmentQueue(executor, { now: () => '2026-06-03T00:00:00.000Z' });

		for (const jobType of ENRICHMENT_JOB_TYPES) {
			queue.enqueue({ itemId: 'item-1', type: jobType });
		}

		const result = await queue.drain();

		expect(result).toEqual({ processed: 5, failed: 0 });
		expect(executor.executed[0].params).toEqual(['enriching', '2026-06-03T00:00:00.000Z', 'item-1']);
		expect(executor.executed.at(-1)?.params).toEqual(['done', '2026-06-03T00:00:00.000Z', 'item-1']);
	});

	it('allows handlers to write only their own fields', async () => {
		const executor = new RecordingExecutor();
		const handlers: EnrichmentHandlers = {
			summarize: async () => ({
				summary: 'AI summary',
				ocrText: 'not allowed from summary handler',
				aiTags: ['not-allowed']
			})
		};
		const queue = createEnrichmentQueue(executor, {
			handlers,
			now: () => '2026-06-03T00:00:00.000Z'
		});

		queue.enqueue({ itemId: 'item-1', type: 'summarize' });

		await queue.drain();

		const fieldWrite = executor.executed.find((entry) => entry.sql.includes('summary = ?'));
		expect(fieldWrite?.sql).toContain('summary = ?');
		expect(fieldWrite?.sql).not.toContain('ocr_text = ?');
		expect(fieldWrite?.sql).not.toContain('ai_tags = ?');
		expect(fieldWrite?.params).toEqual(['AI summary', '2026-06-03T00:00:00.000Z', 'item-1']);
	});

	it('marks failed jobs without deleting or hiding the item and can retry independently', async () => {
		const executor = new RecordingExecutor();
		let attempts = 0;
		const queue = createEnrichmentQueue(executor, {
			handlers: {
				ocr: async () => {
					attempts += 1;
					if (attempts === 1) throw new Error('OCR unavailable');
					return { ocrText: 'Recovered OCR text' };
				}
			},
			now: () => '2026-06-03T00:00:00.000Z'
		});

		queue.enqueue({ itemId: 'item-1', type: 'ocr' });
		const first = await queue.drain();
		queue.enqueue({ itemId: 'item-1', type: 'ocr' });
		const second = await queue.drain();

		expect(first).toEqual({ processed: 0, failed: 1 });
		expect(second).toEqual({ processed: 1, failed: 0 });
		expect(executor.executed.some((entry) => entry.params.includes('failed'))).toBe(true);
		expect(executor.executed.some((entry) => entry.sql.includes('DELETE FROM items'))).toBe(false);
		expect(executor.executed.some((entry) => entry.sql.includes('ocr_text = ?'))).toBe(true);
	});
});
