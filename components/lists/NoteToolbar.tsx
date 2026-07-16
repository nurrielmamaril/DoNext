"use client";

import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface NoteToolbarProps {
  editor: Editor | null;
}

const FONT_SIZES = [
  { value: "none", label: "Normal" },
  { value: "12px", label: "Small" },
  { value: "18px", label: "Large" },
  { value: "24px", label: "Huge" },
];

function ToolbarDivider() {
  return <div className="mx-0.5 h-4 w-px bg-border" />;
}

export function NoteToolbar({ editor }: NoteToolbarProps) {
  const savedSelection = useRef<{ from: number; to: number } | null>(null);
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      if (!e) return null;
      return {
        isBold: e.isActive("bold"),
        isItalic: e.isActive("italic"),
        isUnderline: e.isActive("underline"),
        isH1: e.isActive("heading", { level: 1 }),
        isH2: e.isActive("heading", { level: 2 }),
        isBulletList: e.isActive("bulletList"),
        isOrderedList: e.isActive("orderedList"),
        align: e.isActive({ textAlign: "center" })
          ? "center"
          : e.isActive({ textAlign: "right" })
            ? "right"
            : e.isActive({ textAlign: "justify" })
              ? "justify"
              : "left",
        fontSize: (e.getAttributes("textStyle").fontSize as string | undefined) ?? "none",
      };
    },
  });

  if (!editor) return null;

  const active = state ?? {
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isH1: false,
    isH2: false,
    isBulletList: false,
    isOrderedList: false,
    align: "left" as const,
    fontSize: "none",
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-1 py-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Bold"
        className={cn(active.isBold && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Italic"
        className={cn(active.isItalic && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Underline"
        className={cn(active.isUnderline && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="size-3.5" />
      </Button>

      <ToolbarDivider />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Header"
        className={cn(active.isH1 && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Subtitle"
        className={cn(active.isH2 && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-3.5" />
      </Button>

      <ToolbarDivider />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Bullet list"
        className={cn(active.isBulletList && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Ordered list"
        className={cn(active.isOrderedList && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-3.5" />
      </Button>

      <ToolbarDivider />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Align left"
        className={cn(active.align === "left" && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Align center"
        className={cn(active.align === "center" && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Align right"
        className={cn(active.align === "right" && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Justify"
        className={cn(active.align === "justify" && "bg-muted text-foreground")}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="size-3.5" />
      </Button>

      <ToolbarDivider />

      <Select
        items={Object.fromEntries(FONT_SIZES.map((s) => [s.value, s.label]))}
        value={active.fontSize}
        onValueChange={(value) => {
          const chain = editor.chain().focus();
          if (savedSelection.current) {
            chain.setTextSelection(savedSelection.current);
          }
          if (!value || value === "none") {
            chain.unsetFontSize().run();
          } else {
            chain.setFontSize(value).run();
          }
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-6 w-[92px] text-xs"
          onPointerDown={() => {
            const { from, to } = editor.state.selection;
            savedSelection.current = { from, to };
          }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
