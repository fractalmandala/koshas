<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { EditorState } from '@codemirror/state';
	import { markdown } from '@codemirror/lang-markdown';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { keymap } from '@codemirror/view';
	import { defaultKeymap, indentWithTab } from '@codemirror/commands';
	import { wikilinkExtension } from '$lib/editor/cm-wikilink';

	let {
		value = '',
		onChange = (_val: string) => {},
		readonly = false,
		autofocus = false
	}: {
		value?: string;
		onChange?: (val: string) => void;
		readonly?: boolean;
		autofocus?: boolean;
	} = $props();

	let editorEl = $state<HTMLDivElement | null>(null);
	let view: EditorView | null = null;

	onMount(() => {
		if (!editorEl) return;

		const startState = EditorState.create({
			doc: value,
			extensions: [
				basicSetup,
				markdown(),
				oneDark,
				keymap.of([...defaultKeymap, indentWithTab]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						onChange(update.state.doc.toString());
					}
				}),
				EditorView.editable.of(!readonly),
				...wikilinkExtension()
			]
		});

		view = new EditorView({
			state: startState,
			parent: editorEl
		});

		if (autofocus) view.focus();

		return () => {
			view?.destroy();
		};
	});

	// Sync value from parent when it changes externally
	let prevValue = $state(value);
	$effect(() => {
		if (value !== prevValue && view) {
			prevValue = value;
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: value
				}
			});
		}
	});
</script>

<div class="cm-editor-wrapper" bind:this={editorEl}></div>

<style lang="sass">
	.cm-editor-wrapper
		height: 100%
		overflow: auto
		border-radius: 8px
		font-size: 14px
		line-height: 1.6

		:global(.cm-editor)
			height: 100%

		:global(.cm-scroller)
			overflow: auto

		:global(.cm-content)
			padding: 16px 20px
			font-family: 'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace

		:global(.cm-gutters)
			display: none

		:global(.cm-wikilink)
			background: rgba(99, 102, 241, 0.12)
			border-radius: 3px
			padding: 1px 2px
			color: var(--theme-main, #6366f1)
			cursor: pointer
			border-bottom: 1px dashed var(--theme-main, #6366f1)

		:global(.cm-wikilink-broken)
			background: rgba(239, 68, 68, 0.1)
			border-radius: 3px
			padding: 1px 2px
			color: #ef4444
			cursor: help
			border-bottom: 1px dashed #ef4444

		:global(.cm-wikilink-tooltip)
			padding: 4px 8px
			font-size: 12px
			border-radius: 4px
			background: #1e1e2e
			color: #cdd6f4
			border: 1px solid #45475a
</style>
