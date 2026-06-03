const TRACKING_PARAMS = new Set(['fbclid', 'gclid']);

export function normalizeUrl(input: string): string {
	const url = parseUrl(input);
	url.hash = '';
	url.protocol = 'https:';
	url.hostname = url.hostname.toLowerCase();

	const youtube = normalizeYouTubeUrl(url);
	if (youtube) return youtube;

	const googleDrive = normalizeGoogleDriveUrl(url);
	if (googleDrive) return googleDrive;

	stripTrackingParams(url);
	stripTrailingSlash(url);

	return serializeUrl(url);
}

export function getDeduplicationKey(input: string): string {
	return normalizeUrl(input);
}

export interface UrlIdentity {
	sourceUrl: string;
	normalizedUrl: string;
	deduplicationKey: string;
}

export function buildUrlIdentity(input: string): UrlIdentity {
	const normalizedUrl = normalizeUrl(input);
	return {
		sourceUrl: input,
		normalizedUrl,
		deduplicationKey: normalizedUrl
	};
}

function parseUrl(input: string): URL {
	const trimmed = input.trim();
	const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

	try {
		const url = new URL(candidate);
		if (!url.hostname.includes('.')) {
			throw new Error('Invalid URL');
		}
		return url;
	} catch {
		throw new Error(`Invalid URL: ${input}`);
	}
}

function stripTrackingParams(url: URL): void {
	for (const key of [...url.searchParams.keys()]) {
		const normalizedKey = key.toLowerCase();
		if (normalizedKey.startsWith('utm_') || TRACKING_PARAMS.has(normalizedKey)) {
			url.searchParams.delete(key);
		}
	}
}

function stripTrailingSlash(url: URL): void {
	if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
		url.pathname = url.pathname.replace(/\/+$/, '');
	}
}

function serializeUrl(url: URL): string {
	url.search = url.searchParams.toString();
	const path = url.pathname === '/' ? '' : url.pathname;
	return `${url.origin}${path}${url.search}`;
}

function normalizeYouTubeUrl(url: URL): string | null {
	const host = url.hostname.replace(/^m\./, '').replace(/^www\./, '');
	if (host === 'youtu.be') {
		const videoId = firstPathSegment(url);
		return videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : 'https://www.youtube.com';
	}

	if (host !== 'youtube.com') return null;

	if (url.pathname === '/watch') {
		const videoId = url.searchParams.get('v');
		return videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : 'https://www.youtube.com/watch';
	}

	if (url.pathname.startsWith('/shorts/')) {
		const videoId = firstPathSegment(url, 1);
		return videoId ? `https://www.youtube.com/shorts/${encodeURIComponent(videoId)}` : 'https://www.youtube.com/shorts';
	}

	if (url.pathname === '/playlist') {
		const listId = url.searchParams.get('list');
		return listId ? `https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}` : 'https://www.youtube.com/playlist';
	}

	stripTrackingParams(url);
	stripTrailingSlash(url);
	url.hostname = 'www.youtube.com';
	return serializeUrl(url);
}

function normalizeGoogleDriveUrl(url: URL): string | null {
	const host = url.hostname.replace(/^www\./, '');
	if (host === 'drive.google.com') {
		const filePathMatch = url.pathname.match(/^\/file\/d\/([^/]+)/);
		const fileId = filePathMatch?.[1] ?? url.searchParams.get('id');
		return fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}` : null;
	}

	if (host === 'docs.google.com') {
		const docPathMatch = url.pathname.match(/^\/([^/]+)\/d\/([^/]+)/);
		if (!docPathMatch) return null;
		const [, docType, docId] = docPathMatch;
		return `https://docs.google.com/${docType}/d/${encodeURIComponent(docId)}`;
	}

	return null;
}

function firstPathSegment(url: URL, index = 0): string | null {
	return url.pathname.split('/').filter(Boolean)[index] ?? null;
}
