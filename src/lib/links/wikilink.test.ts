import { describe, expect, it } from 'vitest';
import {
	extractWikilinks,
	isUuid,
	wikilinkToMarkdownLink,
	markdownLinkToWikilink,
	replaceWikilinksWithProtocol,
	replaceProtocolWithWikilinks,
	formatWikilinkDisplay
} from './wikilink';

const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('extractWikilinks', () => {
	it('should extract a simple [[uuid]]', () => {
		const result = extractWikilinks('Hello [[abc-123]] world');
		expect(result).toHaveLength(1);
		expect(result[0].raw).toBe('[[abc-123]]');
		expect(result[0].target).toBe('abc-123');
		expect(result[0].index).toBe(6);
	});

	it('should extract [[Title]] style', () => {
		const result = extractWikilinks('Check [[My Note]] here');
		expect(result).toHaveLength(1);
		expect(result[0].raw).toBe('[[My Note]]');
		expect(result[0].target).toBe('My Note');
		expect(result[0].displayText).toBe('My Note');
		expect(result[0].isUuid).toBe(false);
	});

	it('should extract [[uuid|Display Text]]', () => {
		const result = extractWikilinks(`See [[${TEST_UUID}|My Article]] for details`);
		expect(result).toHaveLength(1);
		expect(result[0].raw).toBe(`[[${TEST_UUID}|My Article]]`);
		expect(result[0].target).toBe(TEST_UUID);
		expect(result[0].displayText).toBe('My Article');
		expect(result[0].isUuid).toBe(true);
	});

	it('should extract multiple wikilinks', () => {
		const result = extractWikilinks('[[a]] and [[b|c]] and [[d]]');
		expect(result).toHaveLength(3);
		expect(result[0].target).toBe('a');
		expect(result[1].target).toBe('b');
		expect(result[1].displayText).toBe('c');
		expect(result[2].target).toBe('d');
	});

	it('should handle real UUIDs', () => {
		const uuid = '550e8400-e29b-41d4-a716-446655440000';
		const result = extractWikilinks(`Link [[${uuid}]] here`);
		expect(result[0].isUuid).toBe(true);
		expect(result[0].target).toBe(uuid);
	});

	it('should handle empty content', () => {
		expect(extractWikilinks('')).toHaveLength(0);
	});

	it('should handle content with no wikilinks', () => {
		expect(extractWikilinks('Just plain text')).toHaveLength(0);
	});

	it('should handle [[ target with spaces ]] trimmed', () => {
		const result = extractWikilinks('[[  spaced target  ]]');
		expect(result[0].target).toBe('spaced target');
	});

	it('should handle pipe with spaces', () => {
		const result = extractWikilinks('[[uuid | Display]]');
		expect(result[0].target).toBe('uuid');
		expect(result[0].displayText).toBe('Display');
	});

	it('should preserve correct indices', () => {
		const content = 'before [[link]] after';
		const result = extractWikilinks(content);
		expect(result[0].index).toBe(7);
		expect(result[0].endIndex).toBe(15);
		expect(content.slice(result[0].index, result[0].endIndex)).toBe('[[link]]');
	});
});

describe('isUuid', () => {
	it('should return true for valid UUIDs', () => {
		expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
	});

	it('should return false for non-UUID strings', () => {
		expect(isUuid('My Note Title')).toBe(false);
		expect(isUuid('not-a-uuid')).toBe(false);
		expect(isUuid('')).toBe(false);
	});
});

describe('wikilinkToMarkdownLink', () => {
	it('should convert [[uuid]] to markdown link', () => {
		const result = wikilinkToMarkdownLink('[[abc-123]]', 'abc-123');
		expect(result).toBe('[abc-123](koshas://item/abc-123)');
	});

	it('should convert [[title|Display]] to markdown link with display text', () => {
		const result = wikilinkToMarkdownLink('[[abc-123|My Note]]', 'abc-123');
		expect(result).toBe('[My Note](koshas://item/abc-123)');
	});

	it('should use target as text when no uuid provided', () => {
		const result = wikilinkToMarkdownLink('[[My Note]]');
		expect(result).toBe('[My Note](koshas://item/My Note)');
	});

	it('should return raw text if not a wikilink', () => {
		const result = wikilinkToMarkdownLink('not a wikilink');
		expect(result).toBe('not a wikilink');
	});
});

describe('markdownLinkToWikilink', () => {
	it('should convert koshas://item/ link to [[uuid]]', () => {
		const result = markdownLinkToWikilink('koshas://item/abc-123', 'text');
		expect(result).toBe('[[abc-123]]');
	});

	it('should include title when different from link text', () => {
		const result = markdownLinkToWikilink('koshas://item/abc-123', 'old', 'My Article');
		expect(result).toBe('[[abc-123|My Article]]');
	});

	it('should not include title when same as text', () => {
		const result = markdownLinkToWikilink('koshas://item/abc-123', 'My Article', 'My Article');
		expect(result).toBe('[[abc-123]]');
	});

	it('should handle non-koshas links', () => {
		const result = markdownLinkToWikilink('https://example.com', 'Example');
		expect(result).toBe('[[Example]]');
	});
});

describe('replaceWikilinksWithProtocol', () => {
	it('should replace wikilinks with koshas:// links', async () => {
		const content = 'See [[abc-123]] and [[My Note]]';
		const resolver = async (target: string) => {
			if (target === 'My Note') return TEST_UUID;
			return target;
		};

		const result = await replaceWikilinksWithProtocol(content, resolver);

		expect(result.content).toContain('koshas://item/abc-123');
		expect(result.content).toContain(`koshas://item/${TEST_UUID}`);
		expect(result.resolved).toHaveLength(2);
	});

	it('should leave unresolvable wikilinks as-is', async () => {
		const content = 'Check [[Missing]]';
		const resolver = async () => null;

		const result = await replaceWikilinksWithProtocol(content, resolver);

		expect(result.content).toBe('Check [[Missing]]');
		expect(result.resolved).toHaveLength(0);
	});

	it('should use UUID directly without resolver', async () => {
		const content = `Link [[${TEST_UUID}]]`;
		const resolver = async () => { throw new Error('should not be called'); };

		const result = await replaceWikilinksWithProtocol(content, resolver);

		expect(result.content).toContain(`koshas://item/${TEST_UUID}`);
	});
});

describe('replaceProtocolWithWikilinks', () => {
	it('should convert koshas:// links back to [[wikilinks]]', () => {
		const content = `See [text](koshas://item/${TEST_UUID}) and [Note](koshas://item/${TEST_UUID})`;
		const result = replaceProtocolWithWikilinks(content);
		expect(result).toBe(`See [[${TEST_UUID}]] and [[${TEST_UUID}]]`);
	});

	it('should use resolved titles when available', () => {
		const content = `See [text](koshas://item/${TEST_UUID})`;
		const resolver = (uuid: string) => uuid === TEST_UUID ? 'My Article' : null;
		const result = replaceProtocolWithWikilinks(content, resolver);
		expect(result).toBe(`See [[${TEST_UUID}|My Article]]`);
	});
});

describe('formatWikilinkDisplay', () => {
	it('should show resolved title when available', () => {
		const match = extractWikilinks(`[[${TEST_UUID}]]`)[0];
		expect(formatWikilinkDisplay(match, 'My Article')).toBe('My Article');
	});

	it('should truncate UUID when no title', () => {
		const match = extractWikilinks(`[[${TEST_UUID}]]`)[0];
		expect(formatWikilinkDisplay(match)).toBe(`Item ${TEST_UUID.slice(0, 8)}…`);
	});

	it('should show display text for non-UUID targets', () => {
		const match = extractWikilinks('[[My Note Title]]')[0];
		expect(formatWikilinkDisplay(match)).toBe('My Note Title');
	});
});
