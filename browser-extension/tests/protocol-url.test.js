import { describe, expect, it } from 'vitest';

import { buildKoshasAddUrl, buildPageCapture, buildSelectionCapture, buildImageCapture } from '../src/protocol-url.js';

describe('Koshas protocol URL helpers', () => {
	it('builds a koshas add URL with encoded page URL, title, and selection', () => {
		const url = buildKoshasAddUrl({
			url: 'https://example.com/path?a=1&b=two words',
			title: 'A title & more',
			selection: 'selected text\nline two'
		});

		expect(url).toBe(
			'koshas://add?url=https%3A%2F%2Fexample.com%2Fpath%3Fa%3D1%26b%3Dtwo%20words&title=A%20title%20%26%20more&selection=selected%20text%0Aline%20two'
		);
	});

	it('omits empty title and selection values while preserving the target URL', () => {
		const url = buildKoshasAddUrl({
			url: 'https://example.com/',
			title: '',
			selection: ''
		});

		expect(url).toBe('koshas://add?url=https%3A%2F%2Fexample.com%2F');
	});

	it('normalizes page, selection, and image context menu payloads into captures', () => {
		const tab = { url: 'https://page.test/article', title: 'Article title' };

		expect(buildPageCapture(tab)).toEqual({
			url: 'https://page.test/article',
			title: 'Article title',
			selection: ''
		});
		expect(buildSelectionCapture({ selectionText: 'highlighted' }, tab)).toEqual({
			url: 'https://page.test/article',
			title: 'Article title',
			selection: 'highlighted'
		});
		expect(buildImageCapture({ srcUrl: 'https://cdn.test/image.png' }, tab)).toEqual({
			url: 'https://cdn.test/image.png',
			title: 'Image from Article title',
			selection: 'Source page: https://page.test/article'
		});
	});
});
