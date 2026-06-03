/**
 * TipTap extension for [[wikilink]] rendering.
 * Renders wikilinks as clickable, styled inline elements.
 *
 * In the TipTap WYSIWYG editor, [[wikilinks]] are displayed as styled spans
 * that look like links. Clicking navigates to the target item/note.
 */
import { Node, mergeAttributes } from '@tiptap/core';

export interface WikilinkOptions {
	/**
	 * Called when a wikilink is clicked.
	 * Receives the target (UUID or title) and the display text.
	 */
	onNavigate?: (target: string, displayText: string) => void;
	/**
	 * Set of known targets (UUIDs or titles) for broken-link detection.
	 */
	knownTargets?: Set<string>;
}

/**
 * TipTap node extension for [[wikilink]] inline elements.
 * Stores the target and displayText as attributes, renders as a styled span.
 */
export const WikilinkExtension = Node.create<WikilinkOptions>({
	name: 'wikilink',

	group: 'inline',

	inline: true,

	selectable: true,

	atom: true,

	addOptions() {
		return {
			onNavigate: undefined,
			knownTargets: new Set()
		};
	},

	addAttributes() {
		return {
			target: {
				default: null
			},
			displayText: {
				default: ''
			},
			isBroken: {
				default: false
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-wikilink]',
				getAttrs: (el) => {
					if (typeof el === 'string') return {};
					const element = el as HTMLElement;
					const target = element.getAttribute('data-wikilink-target') || '';
					const displayText = element.getAttribute('data-wikilink-display') || target;
					const knownTargets = this.options.knownTargets;
					const isBroken = !knownTargets?.has(target) && !/^[0-9a-f-]+$/i.test(target);
					return { target, displayText, isBroken };
				}
			},
			// Also parse [[wikilink]] text that may be in the content
			{
				// This is a fallback for when content contains raw [[wikilink]] syntax
				tag: 'span[data-wikilink-raw]'
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		const target = node.attrs.target as string;
		const displayText = node.attrs.displayText as string;
		const isBroken = node.attrs.isBroken as boolean;

		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				'data-wikilink': '',
				'data-wikilink-target': target,
				'data-wikilink-display': displayText,
				class: isBroken ? 'tiptap-wikilink-broken' : 'tiptap-wikilink',
				title: isBroken ? `Broken link: ${displayText}` : `Open ${displayText}`
			}),
			displayText || target
		];
	},

	addNodeView() {
		return ({ node, editor, getPos }) => {
			const dom = document.createElement('span');
			const target = node.attrs.target as string;
			const displayText = node.attrs.displayText as string;
			const isBroken = node.attrs.isBroken as boolean;

			dom.setAttribute('data-wikilink', '');
			dom.setAttribute('data-wikilink-target', target);
			dom.setAttribute('data-wikilink-display', displayText);
			dom.className = isBroken ? 'tiptap-wikilink-broken' : 'tiptap-wikilink';
			dom.title = isBroken ? `Broken link: ${displayText}` : `Open ${displayText}`;
			dom.textContent = displayText || target;
			dom.contentEditable = 'false';

			dom.addEventListener('click', (e) => {
				e.stopPropagation();
				if (editor.isEditable) {
					// In edit mode, select the node
					const pos = typeof getPos === 'function' ? getPos() ?? 0 : 0;
					editor.commands.setNodeSelection(pos);
				} else {
					// In readonly mode, navigate
					this.options.onNavigate?.(target, displayText);
				}
			});

			return { dom };
		};
	},

	addKeyboardShortcuts() {
		return {
			'Mod-Enter': () => {
				const { selection } = this.editor.state;
				const node = selection.$head.parent;
				if (node.type.name === this.name) {
					const attrs = node.attrs as { target: string; displayText: string };
					this.options.onNavigate?.(attrs.target, attrs.displayText);
					return true;
				}
				return false;
			}
		};
	}
});
