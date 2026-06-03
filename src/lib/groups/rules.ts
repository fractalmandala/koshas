export const MAX_RULES_PER_LIST = 100;
export const MAX_RULE_VALUE_LENGTH = 256;
export const MAX_FIELD_LENGTH = 8_192;

export type GroupRuleType = 'domain' | 'keyword' | 'substring';
export type GroupRuleTarget = 'url' | 'title' | 'description' | 'all';
export type AssignmentType = 'rule' | 'manualInclude' | 'manualExclude';
export type ManualAssignmentType = Extract<AssignmentType, 'manualInclude' | 'manualExclude'>;

export interface GroupRule {
	type: GroupRuleType;
	target: GroupRuleTarget;
	value: string;
}

export interface GroupDefinition {
	id: string;
	name: string;
	description?: string | null;
	whitelist: GroupRule[];
	blacklist: GroupRule[];
	preferredBrowser?: string | null;
	isBuiltIn?: boolean;
	isSpecial?: boolean;
	sortOrder?: number;
}

export interface GroupableItem {
	id: string;
	url?: string | null;
	title?: string | null;
	description?: string | null;
}

export type ManualAssignmentMap = Record<string, ManualAssignmentType | ManualAssignmentType[]>;

export interface GroupClassification {
	groupId: string;
	included: boolean;
	assignmentType: Exclude<AssignmentType, 'manualExclude'> | 'manualExclude' | null;
	matchedWhitelistRuleIndexes: number[];
	matchedBlacklistRuleIndexes: number[];
}

export interface GroupAssignment {
	groupId: string;
	assignmentType: Exclude<AssignmentType, 'manualExclude'>;
}

export interface GroupExclusion {
	groupId: string;
	assignmentType: 'manualExclude';
}

export interface GroupsClassification {
	assignments: GroupAssignment[];
	exclusions: GroupExclusion[];
	decisions: GroupClassification[];
}

export const BUILT_IN_GROUPS = {
	starred: {
		id: 'starred',
		name: 'Starred',
		description: 'Items explicitly marked by the user.',
		whitelist: [],
		blacklist: [],
		isBuiltIn: true,
		isSpecial: true,
		sortOrder: 0
	},
	other: {
		id: 'other',
		name: 'Other',
		description: 'Fallback for items that do not belong to any regular group.',
		whitelist: [],
		blacklist: [],
		isBuiltIn: true,
		isSpecial: true,
		sortOrder: 1_000
	}
} as const satisfies Record<string, GroupDefinition>;

export function matchesRule(rule: GroupRule, item: GroupableItem): boolean {
	const value = normalizeRuleValue(rule.value);
	if (!value) return false;

	switch (rule.type) {
		case 'domain':
			return matchesDomainRule(rule.target, value, item);
		case 'keyword':
			return getTargetValues(rule.target, item).some((field) => matchesKeyword(field, value));
		case 'substring':
			return getTargetValues(rule.target, item).some((field) => field.toLowerCase().includes(value));
	}
}

export function classifyItemForGroup(
	item: GroupableItem,
	group: GroupDefinition,
	manualAssignments: ManualAssignmentMap = {}
): GroupClassification {
	const matchedWhitelistRuleIndexes = matchingRuleIndexes(group.whitelist, item);
	const matchedBlacklistRuleIndexes = matchingRuleIndexes(group.blacklist, item);
	const manual = getManualAssignments(manualAssignments, group.id);

	if (manual.has('manualExclude')) {
		return {
			groupId: group.id,
			included: false,
			assignmentType: 'manualExclude',
			matchedWhitelistRuleIndexes,
			matchedBlacklistRuleIndexes
		};
	}

	if (manual.has('manualInclude')) {
		return {
			groupId: group.id,
			included: true,
			assignmentType: 'manualInclude',
			matchedWhitelistRuleIndexes,
			matchedBlacklistRuleIndexes
		};
	}

	if (isManualOnlyGroup(group) || matchedBlacklistRuleIndexes.length > 0) {
		return {
			groupId: group.id,
			included: false,
			assignmentType: null,
			matchedWhitelistRuleIndexes,
			matchedBlacklistRuleIndexes
		};
	}

	return {
		groupId: group.id,
		included: matchedWhitelistRuleIndexes.length > 0,
		assignmentType: matchedWhitelistRuleIndexes.length > 0 ? 'rule' : null,
		matchedWhitelistRuleIndexes,
		matchedBlacklistRuleIndexes
	};
}

export function classifyItemForGroups(
	item: GroupableItem,
	groups: GroupDefinition[],
	manualAssignments: ManualAssignmentMap = {}
): GroupsClassification {
	const decisions = groups.map((group) => classifyItemForGroup(item, group, manualAssignments));
	const assignments = decisions
		.filter((decision) => decision.included && decision.assignmentType !== 'manualExclude')
		.map((decision) => ({
			groupId: decision.groupId,
			assignmentType: decision.assignmentType as Exclude<AssignmentType, 'manualExclude'>
		}));

	const exclusions = decisions
		.filter((decision) => decision.assignmentType === 'manualExclude')
		.map((decision) => ({
			groupId: decision.groupId,
			assignmentType: 'manualExclude' as const
		}));

	const hasRegularAssignment = assignments.some((assignment) => {
		const group = groups.find((candidate) => candidate.id === assignment.groupId);
		return group && !isSpecialGroup(group);
	});
	const otherGroup = groups.find((group) => group.id === BUILT_IN_GROUPS.other.id);

	if (!hasRegularAssignment && otherGroup && !getManualAssignments(manualAssignments, otherGroup.id).has('manualExclude')) {
		const hasOtherAssignment = assignments.some((assignment) => assignment.groupId === otherGroup.id);
		if (!hasOtherAssignment) {
			assignments.push({ groupId: otherGroup.id, assignmentType: 'rule' });
		}
	}

	return { assignments, exclusions, decisions };
}

function matchingRuleIndexes(rules: GroupRule[], item: GroupableItem): number[] {
	return boundedRules(rules).flatMap((rule, index) => (matchesRule(rule, item) ? [index] : []));
}

function boundedRules(rules: GroupRule[]): GroupRule[] {
	return rules.slice(0, MAX_RULES_PER_LIST);
}

function normalizeRuleValue(value: string): string {
	return value.trim().toLowerCase().slice(0, MAX_RULE_VALUE_LENGTH);
}

function matchesDomainRule(target: GroupRuleTarget, domain: string, item: GroupableItem): boolean {
	if (target !== 'url' && target !== 'all') return false;

	const host = getHostname(item.url);
	return host === domain || host.endsWith(`.${domain}`);
}

function getHostname(input: string | null | undefined): string {
	if (!input) return '';

	try {
		return new URL(input).hostname.toLowerCase().replace(/^www\./, '');
	} catch {
		return '';
	}
}

function matchesKeyword(field: string, keyword: string): boolean {
	const escaped = escapeRegExp(keyword);
	return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}([^\\p{L}\\p{N}_]|$)`, 'iu').test(field);
}

function getTargetValues(target: GroupRuleTarget, item: GroupableItem): string[] {
	const fields = {
		url: boundedField(item.url),
		title: boundedField(item.title),
		description: boundedField(item.description)
	};

	if (target === 'all') return [fields.url, fields.title, fields.description];
	return [fields[target]];
}

function boundedField(value: string | null | undefined): string {
	return (value ?? '').slice(0, MAX_FIELD_LENGTH);
}

function getManualAssignments(assignments: ManualAssignmentMap, groupId: string): Set<ManualAssignmentType> {
	const value = assignments[groupId];
	return new Set(Array.isArray(value) ? value : value ? [value] : []);
}

function isSpecialGroup(group: GroupDefinition): boolean {
	return group.isSpecial === true;
}

function isManualOnlyGroup(group: GroupDefinition): boolean {
	return group.id === BUILT_IN_GROUPS.starred.id;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
