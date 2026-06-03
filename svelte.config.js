import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// adapter-static is required for Tauri
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // static-adapter fallback
			precompress: false,
			strict: true
		})
	}
};

export default config;
