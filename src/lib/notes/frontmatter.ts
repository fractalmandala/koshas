import * as yaml from 'js-yaml';

export interface Frontmatter {
	title?: string;
	created?: string;
	updated?: string;
	tags?: string[];
	type?: string;
	[key: string]: unknown;
}

/**
 * Parse YAML frontmatter from a markdown string.
 * Returns the frontmatter data and the content body.
 * The frontmatter block must be between `---` markers at the start of the file.
 */
export function parseFrontmatter(markdown: string): {
	frontmatter: Frontmatter;
	body: string;
	raw: string | null;
} {
	const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) {
		return { frontmatter: {}, body: markdown, raw: null };
	}

	let data: Frontmatter = {};
	try {
		const parsed = yaml.load(match[1]);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			data = parsed as Frontmatter;
		}
	} catch {
		// Malformed frontmatter — treat as body
		return { frontmatter: {}, body: markdown, raw: null };
	}

	const body = markdown.slice(match[0].length).trimStart();
	return { frontmatter: data, body, raw: match[1] };
}

/**
 * Serialize frontmatter data and merge with body into a markdown string.
 */
export function serializeFrontmatter(
	data: Frontmatter,
	body: string,
	existingRaw?: string | null
): string {
	// Clean the data: remove undefined values
	const clean: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (value !== undefined) {
			clean[key] = value;
		}
	}

	const yamlStr = yaml.dump(clean, {
		indent: 2,
		lineWidth: -1,
		quotingType: '"',
		forceQuotes: false,
		noRefs: true
	});

	return `---\n${yamlStr.trimEnd()}\n---\n\n${body.trimStart()}`;
}

/**
 * Update specific frontmatter fields in a markdown string.
 * Preserves existing fields and body content.
 */
export function updateFrontmatterFields(
	markdown: string,
	fields: Partial<Frontmatter>
): string {
	const { frontmatter, body, raw } = parseFrontmatter(markdown);
	const updated = { ...frontmatter, ...fields };
	return serializeFrontmatter(updated, body, raw);
}

/**
 * Get a specific frontmatter field value.
 */
export function getFrontmatterField(
	markdown: string,
	field: string
): unknown | undefined {
	const { frontmatter } = parseFrontmatter(markdown);
	return frontmatter[field];
}

/**
 * Update the `updated` field to the current timestamp.
 */
export function touchFrontmatter(markdown: string): string {
	return updateFrontmatterFields(markdown, { updated: new Date().toISOString() });
}
