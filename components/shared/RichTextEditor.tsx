"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import type { EditorView } from "@tiptap/pm/view";
import { RichTextToolbar } from "@/components/shared/RichTextToolbar";
import { extractImageFromClipboard } from "@/lib/utils/clipboard";
import { fragmentToHtml, fragmentToPlainText, isHtmlContent, plainTextToHtml } from "@/lib/utils/richtext";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImagePaste?: (file: File) => void;
  placeholder?: string;
}

// Browsers auto-generate a plain-text clipboard flavor from the copied HTML,
// but that conversion drops list markers and adds stray blank lines — which
// is all a plain-text-only paste target (WhatsApp, a bare textarea) ever
// sees. We write our own well-formatted text/plain instead, and re-write
// text/html manually too since preventDefault() suppresses the browser's
// automatic clipboard population entirely.
function handleCopyOrCut(view: EditorView, event: Event, isCut: boolean): boolean {
  const clipboardEvent = event as ClipboardEvent;
  const { state } = view;
  if (state.selection.empty || !clipboardEvent.clipboardData) return false;

  const slice = state.selection.content();
  clipboardEvent.clipboardData.setData("text/plain", fragmentToPlainText(slice.content));
  clipboardEvent.clipboardData.setData("text/html", fragmentToHtml(state.schema, slice.content));
  clipboardEvent.preventDefault();

  if (isCut) {
    view.dispatch(state.tr.deleteSelection());
  }
  return true;
}

export function RichTextEditor({ content, onChange, onImagePaste, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: isHtmlContent(content) ? content : plainTextToHtml(content),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "rich-text-content min-h-24 p-1 focus:outline-none" },
      handlePaste: (_view, event) => {
        if (!onImagePaste) return false;
        const file = extractImageFromClipboard({ clipboardData: event.clipboardData });
        if (!file) return false;
        event.preventDefault();
        onImagePaste(file);
        return true;
      },
      handleDOMEvents: {
        copy: (view, event) => handleCopyOrCut(view, event, false),
        cut: (view, event) => handleCopyOrCut(view, event, true),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="rounded-md border">
      <RichTextToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
