import { describe, expect, it } from 'vitest';

import {
	BUILT_IN_GROUPS,
	classifyItemForGroup,
	classifyItemForGroups,
	matchesRule,
	type GroupDefinition,
	type GroupRule,
	type GroupableItem
} from './rules';

const article: GroupableItem = {
	id: 'item-1',
	url: 'https://developer.apple.com/documentation/swiftui/view',
	title: 'SwiftUI View documentation',
	description: 'Reference material for macOS interface development.'
};

describe('matchesRule', () => {
	it('matches domain rules against exact and subdomain URL hosts only', () => {
		const rule: GroupRule = { type: 'domain', target: 'url', value: 'apple.com' };

		expect(matchesRule(rule, article)).toBe(true);
		expect(matchesRule(rule, { ...article, url: 'https://example.com/apple.com/path' })).toBe(false);
	});

	it('matches keyword rules as whole words across selected text fields', () => {
		expect(matchesRule({ type: 'keyword', target: 'title', value: 'view' }, article)).toBe(true);
		expect(matchesRule({ type: 'keyword', target: 'title', value: 'swift' }, article)).toBe(false);
		expect(matchesRule({ type: 'keyword', target: 'all', value: 'macOS' }, article)).toBe(true);
	});

	it('matches substring rules case-insensitively against URL, title, and description', () => {
		expect(matchesRule({ type: 'substring', target: 'url', value: '/documentation/' }, article)).toBe(true);
		expect(matchesRule({ type: 'substring', target: 'description', value: 'INTERFACE' }, article)).toBe(true);
		expect(matchesRule({ type: 'substring', target: 'title', value: 'browser import' }, article)).toBe(false);
	});
});

describe('classifyItemForGroup', () => {
	const docsGroup: GroupDefinition = {
		id: 'group-docs',
		name: 'Docs',
		whitelist: [{ type: 'domain', target: 'url', value: 'apple.com' }],
		blacklist: [{ type: 'keyword', target: 'all', value: 'deprecated' }]
	};

	it('includes an item when a whitelist rule matches and no blacklist rule matches', () => {
		expect(classifyItemForGroup(article, docsGroup)).toEqual({
			groupId: 'group-docs',
			included: true,
			assignmentType: 'rule',
			matchedWhitelistRuleIndexes: [0],
			matchedBlacklistRuleIndexes: []
		});
	});

	it('lets blacklist rules block whitelist matches', () => {
		expect(classifyItemForGroup({ ...article, title: 'Deprecated SwiftUI View' }, docsGroup)).toMatchObject({
			groupId: 'group-docs',
			included: false,
			assignmentType: null,
			matchedWhitelistRuleIndexes: [0],
			matchedBlacklistRuleIndexes: [0]
		});
	});

	it('gives manual exclude precedence over manual include and rules', () => {
		expect(
			classifyItemForGroup(article, docsGroup, {
				'group-docs': ['manualInclude', 'manualExclude']
			})
		).toMatchObject({
			included: false,
			assignmentType: 'manualExclude'
		});
	});

	it('gives manual include precedence over blacklist and rules', () => {
		expect(
			classifyItemForGroup({ ...article, title: 'Deprecated SwiftUI View' }, docsGroup, {
				'group-docs': ['manualInclude']
			})
		).toMatchObject({
			included: true,
			assignmentType: 'manualInclude'
		});
	});
});

describe('classifyItemForGroups', () => {
	const groups: GroupDefinition[] = [
		{
			id: 'group-docs',
			name: 'Docs',
			whitelist: [{ type: 'domain', target: 'url', value: 'apple.com' }],
			blacklist: []
		},
		{
			id: 'group-browser',
			name: 'Browser Import',
			whitelist: [{ type: 'substring', target: 'description', value: 'browser import' }],
			blacklist: []
		}
	];

	it('returns rule assignments for matching groups and preserves manual exclusions on reclassification', () => {
		const result = classifyItemForGroups(article, groups, {
			'group-docs': ['manualExclude']
		});

		expect(result.assignments).toEqual([]);
		expect(result.exclusions).toEqual([{ groupId: 'group-docs', assignmentType: 'manualExclude' }]);
	});

	it('adds Other as a fallback when no regular group includes the item', () => {
		const result = classifyItemForGroups(
			{ ...article, url: 'https://example.com/post', title: 'Unsorted', description: '' },
			[...groups, BUILT_IN_GROUPS.other]
		);

		expect(result.assignments).toEqual([{ groupId: BUILT_IN_GROUPS.other.id, assignmentType: 'rule' }]);
	});

	it('treats Starred as manual only and does not use it as an automatic fallback', () => {
		const result = classifyItemForGroups(article, [BUILT_IN_GROUPS.starred]);

		expect(result.assignments).toEqual([]);
		expect(BUILT_IN_GROUPS.starred).toMatchObject({
			id: 'starred',
			name: 'Starred',
			isBuiltIn: true,
			isSpecial: true
		});
		expect(BUILT_IN_GROUPS.other).toMatchObject({
			id: 'other',
			name: 'Other',
			isBuiltIn: true,
			isSpecial: true
		});
	});
});
