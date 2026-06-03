// Browser-safe wrappers for Tauri APIs.
// These provide fallbacks when running in `npm run dev` without Tauri.

import { browser } from '$app/environment';

type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

let cachedInvoke: InvokeFn | null = null;

/** Get the Tauri invoke function, or a no-op stub in browser mode. */
export async function getInvoke(): Promise<InvokeFn> {
	if (!browser) {
		// SSR — should never happen, but handle gracefully
		return async () => { throw new Error('Not available in SSR'); };
	}

	if (cachedInvoke) return cachedInvoke;

	try {
		const core = await import('@tauri-apps/api/core').catch(() => null);
		if (core && typeof core.invoke === 'function') {
			cachedInvoke = core.invoke as InvokeFn;
			return cachedInvoke;
		}
		throw new Error('Tauri API not available');
	} catch {
		// In browser dev mode, provide a stub
		cachedInvoke = async (cmd: string, _args?: Record<string, unknown>) => {
			console.warn(`[BrowserStub] invoke('${cmd}') — no Tauri backend.`);
			// File operations return empty/mock data
			if (cmd === 'read_file') return '';
			if (cmd === 'collect_markdown_files') return [];
			if (cmd === 'scan_notebook_directory') return [];
			throw new Error(`Tauri command '${cmd}' not available in browser mode`);
		};
		return cachedInvoke;
	}
}

type UnlistenFn = () => void;
type ListenFn = (event: string, handler: (payload: unknown) => void) => Promise<UnlistenFn>;

let cachedListen: ListenFn | null = null;

/** Get the Tauri event listen function, or a stub in browser mode. */
export async function getListen(): Promise<ListenFn> {
	if (!browser) return async () => () => {};

	if (cachedListen) return cachedListen;

	try {
		const event = await import('@tauri-apps/api/event').catch(() => null);
		if (event && typeof event.listen === 'function') {
			cachedListen = event.listen as unknown as ListenFn;
			return cachedListen;
		}
		throw new Error('Tauri event API not available');
	} catch {
		cachedListen = async (_event: string, _handler: (payload: unknown) => void) => {
			return () => {}; // no-op unlisten
		};
		return cachedListen;
	}
}
