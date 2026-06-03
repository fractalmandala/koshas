import { describe, expect, it } from 'vitest';

import { buildUrlIdentity, getDeduplicationKey, normalizeUrl } from './normalize';

describe('normalizeUrl', () => {
	const cases: Array<[input: string, expected: string]> = [
		['http://example.com', 'https://example.com'],
		['https://example.com/', 'https://example.com'],
		['https://example.com/path/', 'https://example.com/path'],
		['https://example.com/path/?', 'https://example.com/path'],
		['https://example.com/path#section', 'https://example.com/path'],
		['https://example.com/path?a=1&utm_source=newsletter&b=2', 'https://example.com/path?a=1&b=2'],
		['https://example.com/path?utm_medium=email&utm_campaign=spring', 'https://example.com/path'],
		['https://example.com/path?fbclid=abc&gclid=def&keep=true', 'https://example.com/path?keep=true'],
		['HTTPS://Example.COM/Some/Path/', 'https://example.com/Some/Path'],
		['https://www.example.com/', 'https://www.example.com'],
		['https://example.com/a%20space?name=A%20B', 'https://example.com/a%20space?name=A+B'],
		['https://youtu.be/abc123?t=30&utm_source=x', 'https://www.youtube.com/watch?v=abc123'],
		['https://www.youtube.com/watch?v=abc123&t=30', 'https://www.youtube.com/watch?v=abc123'],
		['https://youtube.com/watch?t=30&v=abc123', 'https://www.youtube.com/watch?v=abc123'],
		['https://m.youtube.com/watch?v=abc123&feature=youtu.be', 'https://www.youtube.com/watch?v=abc123'],
		['https://www.youtube.com/shorts/short123?si=share', 'https://www.youtube.com/shorts/short123'],
		['https://youtube.com/playlist?list=PL123&utm_campaign=x', 'https://www.youtube.com/playlist?list=PL123'],
		['https://drive.google.com/file/d/FILE_ID/view?usp=sharing', 'https://drive.google.com/file/d/FILE_ID'],
		['https://drive.google.com/open?id=FILE_ID&utm_source=x', 'https://drive.google.com/file/d/FILE_ID'],
		['https://docs.google.com/document/d/DOC_ID/edit#heading=h.1', 'https://docs.google.com/document/d/DOC_ID'],
		['example.com/path/?utm_source=x#frag', 'https://example.com/path']
	];

	it.each(cases)('normalizes %s', (input, expected) => {
		expect(normalizeUrl(input)).toBe(expected);
	});

	it('throws a clear error for invalid URLs', () => {
		expect(() => normalizeUrl('not a url with spaces')).toThrow('Invalid URL');
	});
});

describe('getDeduplicationKey', () => {
	it('returns the normalized URL for URL-based items', () => {
		expect(getDeduplicationKey('http://example.com/?utm_source=x#section')).toBe('https://example.com');
	});
});

describe('buildUrlIdentity', () => {
	it('keeps the original URL alongside the normalized dedupe key', () => {
		expect(buildUrlIdentity('http://example.com/path/?utm_source=x#section')).toEqual({
			sourceUrl: 'http://example.com/path/?utm_source=x#section',
			normalizedUrl: 'https://example.com/path',
			deduplicationKey: 'https://example.com/path'
		});
	});
});
