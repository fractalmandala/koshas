/**
 * Shared wikilink parsing module.
 * Used by CodeMirror (source mode), TipTap (WYSIWYG mode),
 * and save-time converter (T-030).
 *
 * Wikilink format: [[target]] or [[target|display text]]
 * - target can be a UUID (for items/notes) or a title to resolve
 * - optional |pipe| provides display text separate from target
 */

export interface WikilinkMatch {
	/** The full matched text, e.g. "[[item-uuid]]" or "[[Title|Display]]" */
	raw: string;
	/** The resolved target — either a UUID or a title string */
	target: string;
	/** Display text if pipe syntax used, otherwise same as target */
	displayText: string;
	/** Start index in the source string */
	index: number;
	/** End index (exclusive) */
	endIndex: number;
	/** Whether the target looks like a UUID */
	isUuid: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Regex to match [[wikilinks]].
 * Supports: [[uuid]], [[Title]], [[target|Display Text]]
 */
const WIKILINK_RE = /\[\[([^\]]+?(?:\|[^\]]+?)?)\]\]/g;

/**
 * Extract all wikilink matches from a content string.
 */
export function extractWikilinks(content: string): WikilinkMatch[] {
	const matches: WikilinkMatch[] = [];
	let match: RegExpExecArray | null;

	WIKILINK_RE.lastIndex = 0;

	while ((match = WIKILINK_RE.exec(content)) !== null) {
		const raw = match[0];
		const inner = match[1];
		const index = match.index;
		const endIndex = index + raw.length;

		// Split on pipe for display text
		const pipeIndex = inner.indexOf('|');
		let target: string;
		let displayText: string;

		if (pipeIndex >= 0) {
			target = inner.slice(0, pipeIndex);
			displayText = inner.slice(pipeIndex + 1);
		} else {
			target = inner;
			displayText = inner;
		}

		matches.push({
			raw,
			target: target.trim(),
			displayText: displayText.trim(),
			index,
			endIndex,
			isUuid: UUID_RE.test(target.trim())
		});
	}

	return matches;
}

/**
 * Check if a string looks like a UUID.
 */
export function isUuid(str: string): boolean {
	return UUID_RE.test(str);
}

/**
 * Convert [[wikilink]] syntax to koshas://item/{uuid} markdown link format.
 * If the wikilink has display text via pipe, use that as link text.
 * Otherwise use the target as link text.
 */
export function wikilinkToMarkdownLink(raw: string, uuid?: string | null): string {
	const parsed = extractWikilinks(raw);
	if (parsed.length === 0) return raw;

	const match = parsed[0];
	const resolvedUuid = uuid || match.target;
	const text = match.displayText;
	return `[${text}](koshas://item/${resolvedUuid})`;
}

/**
 * Convert a koshas://item/{uuid} markdown link to [[wikilink]] display format.
 * If title is provided, use it as display text.
 * Format: [[uuid]] or [[title]] or [[uuid|title]]
 */
export function markdownLinkToWikilink(
	href: string,
	text: string,
	resolvedTitle?: string | null
): string {
	if (!href.startsWith('koshas://item/')) return `[[${text}]]`;

	const uuid = href.replace('koshas://item/', '');
	if (resolvedTitle && resolvedTitle !== text) {
		return `[[${uuid}|${resolvedTitle}]]`;
	}
	return `[[${uuid}]]`;
}

/**
 * Replace all wikilinks in content with koshas://item/{uuid} links.
 * Uses the provided resolver to look up UUIDs by title.
 */
export async function replaceWikilinksWithProtocol(
	content: string,
	resolveTarget: (target: string) => Promise<string | null>
): Promise<{ content: string; resolved: Array<{ raw: string; uuid: string }> }> {
	const matches = extractWikilinks(content);
	const resolved: Array<{ raw: string; uuid: string }> = [];
	let result = content;

	// Process in reverse order to preserve indices
	for (let i = matches.length - 1; i >= 0; i--) {
		const match = matches[i];
		const uuid = match.isUuid ? match.target : await resolveTarget(match.target);

		if (uuid) {
			resolved.push({ raw: match.raw, uuid });
			const replacement = wikilinkToMarkdownLink(match.raw, uuid);
			result = result.slice(0, match.index) + replacement + result.slice(match.endIndex);
		}
		// If unresolvable, leave the wikilink as-is
	}

	return { content: result, resolved };
}

/**
 * Replace koshas://item/{uuid} links back to [[wikilink]] format.
 */
export function replaceProtocolWithWikilinks(
	content: string,
	resolveTitle?: (uuid: string) => string | null
): string {
	const PROTOCOL_RE = /\[([^\]]*?)\]\(koshas:\/\/item\/([^)]+)\)/g;
	return content.replace(PROTOCOL_RE, (_match, _text: string, uuid: string) => {
		const resolved = resolveTitle?.(uuid);
		const title = resolved ?? null;
		if (title && title !== uuid) {
			return `[[${uuid}|${title}]]`;
		}
		return `[[${uuid}]]`;
	});
}

/**
 * Build a display string for a wikilink match.
 * Shows resolved title when available, falls back to UUID or target.
 */
export function formatWikilinkDisplay(
	match: WikilinkMatch,
	resolvedTitle?: string | null
): string {
	if (resolvedTitle) return resolvedTitle;
	if (match.isUuid) return `Item ${match.target.slice(0, 8)}…`;
	return match.displayText;
}
