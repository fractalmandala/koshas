function cleanString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function appendParam(parts, name, value) {
	const cleaned = cleanString(value);

	if (cleaned.length > 0) {
		parts.push(`${name}=${encodeURIComponent(cleaned)}`);
	}
}

export function buildKoshasAddUrl(capture) {
	const parts = [];

	appendParam(parts, 'url', capture?.url);
	appendParam(parts, 'title', capture?.title);
	appendParam(parts, 'selection', capture?.selection);

	return `koshas://add?${parts.join('&')}`;
}

export function buildPageCapture(tab) {
	return {
		url: cleanString(tab?.url),
		title: cleanString(tab?.title),
		selection: ''
	};
}

export function buildSelectionCapture(info, tab) {
	return {
		...buildPageCapture(tab),
		selection: cleanString(info?.selectionText)
	};
}

export function buildImageCapture(info, tab) {
	const page = buildPageCapture(tab);
	const title = page.title ? `Image from ${page.title}` : 'Image from browser';

	return {
		url: cleanString(info?.srcUrl),
		title,
		selection: page.url ? `Source page: ${page.url}` : ''
	};
}
