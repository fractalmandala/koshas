// Browser-compatible Database wrapper using sql.js WASM.
// Only imported in browser mode — never in Tauri.

// Robust in-memory storage that persists to localStorage for the demo
class MockSqlDatabase {
	private storage: Record<string, any[]> = {
		items: [],
		sources: [],
		link_references: [],
		notebooks: [],
		notebook_folders: [],
		notes: [],
		deleted_items: []
	};

	constructor() {
		this.loadFromLocalStorage();
		console.log('[BrowserDB] Initialized robust mock storage (WASM-free)');
	}

	private loadFromLocalStorage() {
		try {
			const saved = localStorage.getItem('koshas:mock_db');
			if (saved) {
				const parsed = JSON.parse(saved);
				this.storage = { ...this.storage, ...parsed };
			}
		} catch (e) {
			console.warn('[MockDB] Failed to load from localStorage', e);
		}
	}

	private saveToLocalStorage() {
		try {
			localStorage.setItem('koshas:mock_db', JSON.stringify(this.storage));
		} catch (e) {
			console.warn('[MockDB] Failed to save to localStorage', e);
		}
	}

	async execute(sql: string, params?: any[]) {
		console.log('[MockDB] execute:', sql, params);
		const normalizedSql = sql.toLowerCase().replace(/\s+/g, ' ');
		
		if (normalizedSql.includes('delete from')) {
			const tableName = normalizedSql.split(' ')[2]?.replace(/[()]/g, '');
			if (this.storage[tableName]) {
				this.storage[tableName] = [];
				this.saveToLocalStorage();
			}
			return { rowsAffected: 1 };
		}

		if (normalizedSql.includes('insert into') || normalizedSql.includes('insert or ignore into')) {
			const parts = normalizedSql.split(' ');
			const intoIndex = parts.indexOf('into');
			if (intoIndex !== -1 && intoIndex + 1 < parts.length) {
				const tableName = parts[intoIndex + 1].replace(/[()]/g, '');
				if (this.storage[tableName]) {
					const colMatch = sql.match(/\((.*?)\)\s+VALUES/i);
					const row: Record<string, any> = {};
					
					if (colMatch && params) {
						const columns = colMatch[1].split(',').map(c => c.trim().replace(/["`]/g, ''));
						columns.forEach((col, i) => {
							row[col] = params[i];
						});
					} else if (params) {
						params.forEach((val, i) => { row[i] = val; });
					}
					
					// Basic dedupe for notebooks/folders/notes
					if (tableName === 'notebooks' || tableName === 'notes' || tableName === 'items') {
						const id = row.id || row[0];
						this.storage[tableName] = this.storage[tableName].filter(r => (r.id || r[0]) !== id);
					}

					this.storage[tableName].push(row);
					this.saveToLocalStorage();
				}
			}
		}
		return { rowsAffected: 1 };
	}

	async select<T = any[]>(sql: string, params?: any[]): Promise<T> {
		console.log('[MockDB] select:', sql, params);
		const normalizedSql = sql.toLowerCase();

		if (normalizedSql.includes('from notebooks')) {
			return this.storage.notebooks.map(row => ({
				id: row.id || row[0],
				name: row.name || row[1],
				default_save_location: row.default_save_location || row[2],
				sort_order: row.sort_order || row[3] || 0,
				created_at: row.created_at || row[4] || new Date().toISOString(),
				updated_at: row.updated_at || row[5] || new Date().toISOString()
			})) as unknown as T;
		}

		if (normalizedSql.includes('from items')) {
			const items = this.storage.items.map(row => ({
				id: row.id || row[0],
				item_type: row.item_type || row[1],
				source_url: row.source_url || row[2],
				normalized_url: row.normalized_url || row[3],
				title: row.title || row.name || row[4] || 'Untitled Item',
				description: row.description || row[5],
				body_text: row.body_text || row[6],
				thumbnail: row.thumbnail || row[7],
				enrichment_status: row.enrichment_status || row[8],
				created_at: row.created_at || row[9],
				updated_at: row.updated_at || row[9],
				file_path: row.file_path || row[10] || null
			}));

			if (normalizedSql.includes('where id = ?')) {
				return items.filter(i => i.id === params?.[0]) as unknown as T;
			}
			return items as unknown as T;
		}

		if (normalizedSql.includes('from notes')) {
			const noteRows = this.storage.notes.map(row => ({
				id: row.id || row[0],
				item_id: row.item_id || row[1],
				file_path: row.file_path || row[2],
				notebook_id: row.notebook_id || row[3],
				created_at: row.created_at || row[4],
				updated_at: row.updated_at || row[4],
				file_modified_at: row.file_modified_at || row[5]
			}));
			
			const notebookId = params?.[0];
			let filtered = noteRows;
			if (notebookId && normalizedSql.includes('where n.notebook_id = ?')) {
				filtered = noteRows.filter(n => n.notebook_id === notebookId);
			}

			if (normalizedSql.includes('join items')) {
				return filtered.map(n => {
					const item = this.storage.items.find(i => (i.id || i[0]) === n.item_id);
					return {
						...n,
						title: item ? (item.title || item.name || 'Untitled Note') : 'Untitled Note',
						body_text: item ? (item.body_text || '') : ''
					};
				}) as unknown as T;
			}
			return filtered as unknown as T;
		}

		return [] as unknown as T;
	}

	async close() { return true; }
}

export class BrowserDatabase {
	readonly path = ':memory:';
	private db: MockSqlDatabase;

	private constructor() {
		this.db = new MockSqlDatabase();
	}

	static async load(_url: string, _options?: unknown): Promise<BrowserDatabase> {
		return new BrowserDatabase();
	}

	async execute(sql: string, params?: any[]) {
		return this.db.execute(sql, params);
	}

	async select<T = any[]>(sql: string, params?: any[]): Promise<T> {
		return this.db.select<T>(sql, params);
	}

	async close() {
		return this.db.close();
	}
}
