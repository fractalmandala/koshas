/**
 * CodeMirror 6 extension for [[wikilink]] syntax highlighting and autocomplete.
 */
import {
	StateField,
	StateEffect,
	type Extension,
	type Range
} from '@codemirror/state';
import {
	Decoration,
	type DecorationSet,
	EditorView,
	hoverTooltip
} from '@codemirror/view';
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { extractWikilinks } from '$lib/links/wikilink';

const WIKILINK_CLASS = 'cm-wikilink';

/**
 * Decoration for [[wikilink]] ranges.
 */
const wikilinkMark = Decoration.mark({ class: WIKILINK_CLASS });
const brokenWikilinkMark = Decoration.mark({ class: 'cm-wikilink-broken' });

/**
 * State effect to update the set of known wikilink targets (UUIDs or resolved titles).
 */
export const setWikilinkTargets = StateEffect.define<Set<string>>();

/**
 * State field that tracks which wikilink targets are known to exist.
 */
export const wikilinkTargetsField = StateField.define<Set<string>>({
	create: () => new Set<string>(),
	update: (targets, tr) => {
		for (const effect of tr.effects) {
			if (effect.is(setWikilinkTargets)) {
				return effect.value;
			}
		}
		return targets;
	}
});

/**
 * Build decorations for [[wikilink]] occurrences.
 */
function buildWikilinkDecorations(
	content: string,
	knownTargets: Set<string>
): Range<Decoration>[] {
	const decorations: Range<Decoration>[] = [];
	const matches = extractWikilinks(content);

	for (const match of matches) {
		const isBroken = !match.isUuid && !knownTargets.has(match.target);
		const deco = isBroken ? brokenWikilinkMark : wikilinkMark;
		decorations.push(deco.range(match.index, match.endIndex));
	}

	return decorations;
}

/**
 * State field that decorates [[wikilink]] occurrences.
 */
export const wikilinkDecorationsField = StateField.define<DecorationSet>({
	create(_state) {
		return Decoration.none;
	},
	update(decorations, tr) {
		if (!tr.docChanged && !tr.effects.some((e) => e.is(setWikilinkTargets))) return decorations;
		const targets = tr.state.field(wikilinkTargetsField, false) ?? new Set<string>();
		const deco = buildWikilinkDecorations(tr.state.doc.toString(), targets);
		return Decoration.set(deco, true);
	},
	provide: (field) => EditorView.decorations.from(field)
});

/**
 * Autocomplete source that triggers on [[ and searches known targets.
 */
function wikilinkAutocomplete(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/\[\[[^\]]*$/);
	if (!word) return null;

	const prefix = word.text;
	if (!prefix.startsWith('[[')) return null;

	const query = prefix.slice(2).toLowerCase();
	const options: Array<{ label: string; type: string; detail: string }> = [];

	// Items and notes injected via a global
	const w = typeof window !== 'undefined' ? window : null;
	const globalTargets = w ? (w as unknown as Record<string, unknown>).__koshasWikilinkTargets : null;
	const targets = globalTargets as Array<{ id: string; title: string; type: string }> | undefined;

	if (targets) {
		for (const target of targets) {
			const title = target.title || target.id;
			if (title.toLowerCase().includes(query) || target.id.toLowerCase().includes(query)) {
				options.push({
					label: title,
					type: target.type === 'note' ? 'keyword' : 'constant',
					detail: target.type
				});
			}
		}
	}

	return {
		from: word.from,
		options: options.slice(0, 20),
		filter: false
	};
}

/**
 * Create the full wikilink extension for CodeMirror.
 */
export function wikilinkExtension(): Extension[] {
	return [
		wikilinkTargetsField,
		wikilinkDecorationsField,
		autocompletion({
			override: [wikilinkAutocomplete],
			closeOnBlur: true,
			icons: false
		}),
		hoverTooltip((view, pos) => {
			const content = view.state.doc.toString();
			const matches = extractWikilinks(content);
			const match = matches.find((m) => pos >= m.index && pos <= m.endIndex);
			if (!match) return null;

			const targets =
				(view.state.field(wikilinkTargetsField, false) as Set<string> | undefined) ??
				new Set<string>();
			const exists = match.isUuid || targets.has(match.target);

			return {
				pos: match.index,
				end: match.endIndex,
				above: true,
				create: () => {
					const dom = document.createElement('div');
					dom.className = 'cm-wikilink-tooltip';
					dom.textContent = exists
						? `\uD83D\uDD17 ${match.displayText}`
						: `\u26A0 Broken link: ${match.displayText}`;
					return { dom };
				}
			};
		})
	];
}

/**
 * Initialize the global wikilink targets store from the database.
 * Called by the editor shell on mount.
 */
export function setWikilinkTargetsGlobal(
	targets: Array<{ id: string; title: string; type: string }>
): void {
	if (typeof window !== 'undefined') {
		(window as unknown as Record<string, unknown>).__koshasWikilinkTargets = targets;
	}
}
