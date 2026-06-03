import type { DatabaseLike } from '$lib/db';
import { writeFile } from '$lib/notes/sync';

export async function seedDemoData(db: DatabaseLike) {
	console.log('[Demo] Seeding demo data started...');

	try {
		// 1. Clear existing demo data
		const tables = ['items', 'sources', 'link_references', 'notebooks', 'notebook_folders', 'notes'];
		for (const table of tables) {
			try {
				await db.execute(`DELETE FROM ${table}`);
			} catch (e) {
				console.warn(`[Demo] Could not clear table ${table}:`, e);
			}
		}
		console.log('[Demo] Tables cleared');

		// 2. Create Items (Collect Sheath)
		const items = [
			{
				id: crypto.randomUUID(),
				item_type: 'bookmark',
				source_url: 'https://svelte.dev',
				normalized_url: 'svelte.dev',
				title: 'Svelte • Cybernetically enhanced web apps',
				description: 'Svelte is a radical new approach to building user interfaces.',
				enrichment_status: 'done',
				created_at: new Date().toISOString()
			},
			{
				id: crypto.randomUUID(),
				item_type: 'article',
				source_url: 'https://tauri.app',
				normalized_url: 'tauri.app',
				title: 'Tauri • Build smaller, faster, and more secure desktop applications',
				description: 'Tauri is a framework for building tiny, blazing fast binaries for all major desktop platforms.',
				body_text: 'Tauri is a framework for building tiny, blazing fast binaries for all major desktop platforms. Developers can write their user interface with any frontend framework that compiles to HTML, JS and CSS.',
				enrichment_status: 'done',
				created_at: new Date().toISOString()
			},
			{
				id: crypto.randomUUID(),
				item_type: 'image',
				source_url: 'https://github.com/sveltejs.png',
				normalized_url: 'github.com/sveltejs.png',
				title: 'Svelte Logo',
				description: 'The logo of the Svelte framework.',
				thumbnail: 'https://github.com/sveltejs.png',
				enrichment_status: 'done',
				created_at: new Date().toISOString()
			}
		];

		for (const item of items) {
			await db.execute(
				`INSERT INTO items (id, item_type, source_url, normalized_url, title, description, body_text, thumbnail, enrichment_status, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[item.id, item.item_type, item.source_url, item.normalized_url, item.title, item.description, item.body_text || null, item.thumbnail || null, item.enrichment_status, item.created_at, item.created_at]
			);
		}
		console.log('[Demo] Items created');

		// 3. Create Notebook (Notes Sheath)
		const notebookId = crypto.randomUUID();
		const demoPath = '/tmp/koshas-demo-notes'; 
		
		await db.execute(
			`INSERT INTO notebooks (id, name, default_save_location, created_at)
			 VALUES (?, ?, ?, ?)`,
			[notebookId, 'Demo Notebook', demoPath, new Date().toISOString()]
		);

		await db.execute(
			`INSERT INTO notebook_folders (id, notebook_id, folder_path)
			 VALUES (?, ?, ?)`,
			[crypto.randomUUID(), notebookId, demoPath]
		);
		console.log('[Demo] Notebook created');

		// 4. Create Notes
		const notes = [
			{
				id: crypto.randomUUID(),
				item_id: crypto.randomUUID(),
				title: 'Welcome to Koshas',
				body: '# Welcome to Koshas\n\nThis is a demo note. You can edit it in **WYSIWYG**, **Source**, or **Preview** mode.\n\nTry using [[wikilinks]] to connect to other items!',
				path: `${demoPath}/welcome.md`
			},
			{
				id: crypto.randomUUID(),
				item_id: crypto.randomUUID(),
				title: 'Project Roadmap',
				body: '# Project Roadmap\n\n- [x] M1: Collect Sheath\n- [x] M2: Notes Sheath\n- [x] M3: Graph Sheath\n- [ ] M4: Polish & Release\n\nCheck out the [[Svelte]] bookmark!',
				path: `${demoPath}/roadmap.md`
			}
		];

		const now = new Date().toISOString();
		for (const note of notes) {
			try {
				await writeFile(note.path, note.body);
			} catch (e) {
				console.warn(`[Demo] Could not write file ${note.path}:`, e);
			}

			await db.execute(
				`INSERT INTO items (id, item_type, title, body_text, file_path, enrichment_status, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[note.item_id, 'note', note.title, note.body, note.path, 'done', now, now]
			);

			await db.execute(
				`INSERT INTO notes (id, item_id, file_path, notebook_id, created_at, updated_at, file_modified_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[note.id, note.item_id, note.path, notebookId, now, now, now]
			);
		}
		console.log('[Demo] Notes created');

		// 5. Create Link References (Graph Sheath)
		const roadmapNote = notes[1];
		const svelteItem = items[0];
		await db.execute(
			`INSERT INTO link_references (id, source_item_id, target_item_id, reference_type)
			 VALUES (?, ?, ?, ?)`,
			[crypto.randomUUID(), roadmapNote.item_id, svelteItem.id, 'wikilink']
		);

		await db.execute(
			`INSERT INTO link_references (id, source_item_id, target_item_id, reference_type)
			 VALUES (?, ?, ?, ?)`,
			[crypto.randomUUID(), notes[0].item_id, roadmapNote.item_id, 'wikilink']
		);
		console.log('[Demo] Links created');

		// 6. Set active notebook in localStorage
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('koshas:activeNotebookId', notebookId);
		}

		console.log('[Demo] Seeding complete.');
	} catch (error) {
		console.error('[Demo] Seeding failed globally:', error);
		throw error;
	}
}
