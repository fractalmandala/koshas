<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor, type Content } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	// @ts-ignore - Version mismatch between @tiptap sub-packages
	const starterKit: any = StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } });
	import TaskList from '@tiptap/extension-task-list';
	import TaskItem from '@tiptap/extension-task-item';
	import Link from '@tiptap/extension-link';
	import ImageExtension from '@tiptap/extension-image';
	import Placeholder from '@tiptap/extension-placeholder';
	import Underline from '@tiptap/extension-underline';
	import TextAlign from '@tiptap/extension-text-align';
	import { Table } from '@tiptap/extension-table';
	import TableRow from '@tiptap/extension-table-row';
	import TableCell from '@tiptap/extension-table-cell';
	import TableHeader from '@tiptap/extension-table-header';
	import { WikilinkExtension } from '$lib/editor/tiptap-wikilink';

	let {
		value = '',
		onChange = (_html: string) => {},
		placeholder = 'Start writing…',
		readonly = false
	}: {
		value?: string;
		onChange?: (html: string) => void;
		placeholder?: string;
		readonly?: boolean;
	} = $props();

	let editorEl = $state<HTMLDivElement | null>(null);
	let editor: Editor | null = null;

	let prevValue = $state(value);

	onMount(() => {
		editor = new Editor({
			element: editorEl!,
			content: value as Content,
			editable: !readonly,
			extensions: [
				starterKit,
				Underline,
				TaskList,
				TaskItem.configure({ nested: true }),
				Link.configure({
					openOnClick: true,
					HTMLAttributes: { class: 'tiptap-link' }
				}),
				ImageExtension.configure({ inline: false }),
				Placeholder.configure({ placeholder }),
				TextAlign.configure({ types: ['heading', 'paragraph'] }),
				Table.configure({ resizable: true }),
				TableRow,
				TableCell,
				TableHeader,
				WikilinkExtension.configure({
					onNavigate: (target: string, displayText: string) => {
						console.log('[Wikilink] Navigate to:', target, displayText);
					}
				})
			],
			onUpdate: ({ editor: ed }) => {
				onChange(ed.getHTML());
			}
		});

		return () => {
			editor?.destroy();
		};
	});

	$effect(() => {
		if (value !== prevValue && editor && !editor.isDestroyed) {
			prevValue = value;
			if (editor.getHTML() !== value) {
				editor.commands.setContent(value as Content);
			}
		}
	});

	function execCmd(cmd: string) {
		if (!editor) return;
		const chain = editor.chain().focus();
		switch (cmd) {
			case 'bold': chain.toggleBold().run(); break;
			case 'italic': chain.toggleItalic().run(); break;
			case 'strike': chain.toggleStrike().run(); break;
			case 'underline': chain.toggleUnderline().run(); break;
			case 'h1': chain.toggleHeading({ level: 1 }).run(); break;
			case 'h2': chain.toggleHeading({ level: 2 }).run(); break;
			case 'h3': chain.toggleHeading({ level: 3 }).run(); break;
			case 'bullet': chain.toggleBulletList().run(); break;
			case 'ordered': chain.toggleOrderedList().run(); break;
			case 'task': chain.toggleTaskList().run(); break;
			case 'blockquote': chain.toggleBlockquote().run(); break;
			case 'code': chain.toggleCodeBlock().run(); break;
			case 'link': {
				const url = prompt('URL:') || '';
				if (url) chain.setLink({ href: url }).run();
				break;
			}
			case 'undo': chain.undo().run(); break;
			case 'redo': chain.redo().run(); break;
		}
	}
</script>

<div class="tiptap-wrapper" class:readonly>
	<div class="tiptap-toolbar">
		<button type="button" onclick={() => execCmd('undo')} title="Undo" aria-label="Undo">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
		</button>
		<button type="button" onclick={() => execCmd('redo')} title="Redo" aria-label="Redo">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
		</button>
		<span class="sep"></span>
		<button type="button" onclick={() => execCmd('bold')} title="Bold"><strong>B</strong></button>
		<button type="button" onclick={() => execCmd('italic')} title="Italic"><em>I</em></button>
		<button type="button" onclick={() => execCmd('underline')} title="Underline"><u>U</u></button>
		<button type="button" onclick={() => execCmd('strike')} title="Strikethrough"><s>S</s></button>
		<span class="sep"></span>
		<button type="button" onclick={() => execCmd('h1')} title="Heading 1">H1</button>
		<button type="button" onclick={() => execCmd('h2')} title="Heading 2">H2</button>
		<button type="button" onclick={() => execCmd('h3')} title="Heading 3">H3</button>
		<span class="sep"></span>
		<button type="button" onclick={() => execCmd('bullet')} title="Bullet list">•</button>
		<button type="button" onclick={() => execCmd('ordered')} title="Ordered list">1.</button>
		<button type="button" onclick={() => execCmd('task')} title="Task list">☑</button>
		<span class="sep"></span>
		<button type="button" onclick={() => execCmd('blockquote')} title="Blockquote">"</button>
		<button type="button" onclick={() => execCmd('code')} title="Code block">&lt;/&gt;</button>
	</div>
	<div class="tiptap-content" bind:this={editorEl}></div>
</div>

<style lang="sass">
	.tiptap-wrapper
		display: flex
		flex-direction: column
		height: 100%
		border-radius: 8px
		overflow: hidden
		background: var(--surface-00)

		&.readonly
			.tiptap-toolbar
				display: none

	.tiptap-toolbar
		display: flex
		gap: 2px
		padding: 6px 8px
		border-bottom: 1px solid var(--medium-00)
		flex-wrap: wrap
		background: var(--surface-20)

		button
			display: grid
			place-items: center
			width: 30px
			height: 26px
			border-radius: 4px
			font-size: 12px
			color: var(--fore-secondary)
			transition: all 0.1s var(--ease)

			&:hover
				background: var(--medium-00)
				color: var(--fore-primary)

		.sep
			width: 1px
			background: var(--medium-10)
			margin: 0 4px

	.tiptap-content
		flex: 1
		overflow: auto
		padding: 16px 20px
		font-size: 14px
		line-height: 1.7
		outline: none

	:global(.tiptap-content .tiptap)
		outline: none
		min-height: 100%

		& p
			margin-bottom: 8px

		& h1, & h2, & h3, & h4, & h5, & h6
			margin: 16px 0 8px
			font-weight: 600

		& h1
			font-size: 24px

		& h2
			font-size: 20px

		& h3
			font-size: 17px

		& ul, & ol
			padding-left: 24px
			margin-bottom: 8px

		& li
			margin-bottom: 4px

		& blockquote
			border-left: 3px solid var(--theme-main)
			padding-left: 12px
			color: var(--fore-secondary)
			margin: 8px 0

		& pre
			background: #1e1e2e
			border-radius: 6px
			padding: 12px
			overflow-x: auto
			margin: 8px 0

			& code
				color: #cdd6f4
				font-size: 13px
				font-family: 'Cascadia Code', 'JetBrains Mono', monospace

		& code
			background: var(--medium-00)
			padding: 2px 4px
			border-radius: 3px
			font-size: 0.9em

		& img
			max-width: 100%
			border-radius: 6px
			margin: 8px 0

		& a
			color: var(--theme-main)
			text-decoration: underline

		& ul[data-type="taskList"]
			list-style: none
			padding-left: 0

			& li
				display: flex
				gap: 8px
				align-items: flex-start

				& label
					margin-top: 3px

		& table
			border-collapse: collapse
			width: 100%
			margin: 8px 0

			& th, & td
				border: 1px solid var(--medium-10)
				padding: 8px 12px
				text-align: left

			& th
				background: var(--medium-00)
				font-weight: 600

	:global(.tiptap-content .tiptap p.is-editor-empty:first-child::before)
		color: var(--fore-tertiary)
		content: attr(data-placeholder)
		float: left
		height: 0
		pointer-events: none

	:global(.tiptap-wikilink)
		background: rgba(99, 102, 241, 0.1)
		border-radius: 3px
		padding: 1px 3px
		color: var(--theme-main, #6366f1)
		cursor: pointer
		border-bottom: 1px dashed var(--theme-main, #6366f1)
		font-size: 0.95em

		&:hover
			background: rgba(99, 102, 241, 0.2)

	:global(.tiptap-wikilink-broken)
		background: rgba(239, 68, 68, 0.08)
		border-radius: 3px
		padding: 1px 3px
		color: #ef4444
		cursor: help
		border-bottom: 1px dashed #ef4444
		font-size: 0.95em
</style>
