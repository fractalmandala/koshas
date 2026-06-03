import type Database from '@tauri-apps/plugin-sql';
import type { NotebookPersistenceExecutor } from './persistence';

export function createNotebookDbExecutor(db: Database): NotebookPersistenceExecutor {
	return {
		async select<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
			return db.select<T[]>(sql, params);
		},
		async execute(sql: string, params?: unknown[]): Promise<unknown> {
			return db.execute(sql, params);
		}
	};
}
