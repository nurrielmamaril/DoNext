"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { RichTextToolbar } from "@/components/shared/RichTextToolbar";
import { extractImageFromClipboard } from "@/lib/utils/clipboard";
import { isHtmlContent, plainTextToHtml } from "@/lib/utils/richtext";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImagePaste?: (file: File) => void;
  placeholder?: string;
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
