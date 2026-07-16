"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { NoteToolbar } from "@/components/lists/NoteToolbar";
import { extractImageFromClipboard } from "@/lib/utils/clipboard";
import { isHtmlContent, plainTextToHtml } from "@/lib/utils/richtext";

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImagePaste: (file: File) => void;
  placeholder?: string;
}

export function NoteEditor({ content, onChange, onImagePaste, placeholder }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        link: false,
      }),
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: isHtmlContent(content) ? content : plainTextToHtml(content),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "note-content min-h-24 p-1 focus:outline-none" },
      handlePaste: (_view, event) => {
        const file = extractImageFromClipboard({ clipboardData: event.clipboardData });
        if (!file) return false;
        event.preventDefault();
        onImagePaste(file);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="rounded-md border">
      <NoteToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
