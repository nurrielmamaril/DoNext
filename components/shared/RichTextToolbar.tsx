"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  RemoveFormatting,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RichTextToolbarProps {
  editor: Editor | null;
}

const FONT_SIZES = [
  { value: "none", label: "Default" },
  ...[6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map((n) => ({
    value: `${n}px`,
    label: String(n),
  })),
];

const TEXT_COLORS = [
  "#000000",
  "#5c5c5c",
  "#b91c1c",
  "#c2410c",
  "#a16207",
  "#15803d",
  "#0f766e",
  "#1d4ed8",
  "#6d28d9",
  "#be185d",
];

const HIGHLIGHT_COLORS = [
  "#fef08a",
  "#fed7aa",
  "#bbf7d0",
  "#bfdbfe",
  "#e9d5ff",
  "#fbcfe8",
  "#fecaca",
  "#e5e7eb",
];

function ToolbarDivider() {
  return <div className="mx-0.5 h-4 w-px bg-border" />;
}

interface LinkPopoverProps {
  editor: Editor;
  isLink: boolean;
  linkHref: string;
  hasSelection: boolean;
}

function LinkPopover({ editor, isLink, linkHref, hasSelection }: LinkPopoverProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const savedSelection = useRef<{ from: number; to: number } | null>(null);
  const disabled = !hasSelection && !isLink;

  function handleOpenChange(next: boolean) {
    if (next) setUrl(linkHref);
    setOpen(next);
  }

  function applyLink() {
    const trimmed = url.trim();
    if (!trimmed) return;
    const chain = editor.chain().focus();
    if (savedSelection.current) chain.setTextSelection(savedSelection.current);
    chain.extendMarkRange("link").setLink({ href: trimmed }).run();
    setOpen(false);
  }

  function removeLink() {
    const chain = editor.chain().focus();
    if (savedSelection.current) chain.setTextSelection(savedSelection.current);
    chain.extendMarkRange("link").unsetLink().run();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Link"
            disabled={disabled}
            className={cn(isLink && "bg-muted text-foreground")}
            onPointerDown={() => {
              const { from, to } = editor.state.selection;
              savedSelection.current = { from, to };
            }}
          />
        }
      >
        <LinkIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <Input
          autoFocus
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyLink();
            }
          }}
        />
        <div className="flex justify-end gap-1.5">
          {isLink && (
            <Button type="button" variant="outline" size="sm" onClick={removeLink}>
              Remove link
            </Button>
          )}
          <Button type="button" size="sm" onClick={applyLink} disabled={!url.trim()}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ColorPopoverProps {
  editor: Editor;
  icon: ReactNode;
  label: string;
  activeColor: string | undefined;
  presets: string[];
  onApply: (color: string) => void;
  onClear: () => void;
}

function ColorPopover({ editor, icon, label, activeColor, presets, onApply, onClear }: ColorPopoverProps) {
  const [open, setOpen] = useState(false);
  const savedSelection = useRef<{ from: number; to: number } | null>(null);

  function withSavedSelection(fn: (color: string) => void) {
    return (color: string) => {
      if (savedSelection.current) {
        editor.chain().focus().setTextSelection(savedSelection.current).run();
      }
      fn(color);
      setOpen(false);
    };
  }

  function handleClear() {
    if (savedSelection.current) {
      editor.chain().focus().setTextSelection(savedSelection.current).run();
    }
    onClear();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            className={cn(activeColor && "bg-muted text-foreground")}
            onPointerDown={() => {
              const { from, to } = editor.state.selection;
              savedSelection.current = { from, to };
            }}
          />
        }
      >
        <span className="relative flex items-center justify-center">
          {icon}
          <span
            className="absolute -bottom-0.5 h-0.5 w-3.5 rounded-full"
            style={{ backgroundColor: activeColor ?? "transparent" }}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        <div className="grid grid-cols-5 gap-1.5">
          {presets.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              className={cn(
                "size-6 rounded-full border",
                activeColor === color && "ring-2 ring-ring ring-offset-1"
              )}
              style={{ backgroundColor: color }}
              onClick={() => withSavedSelection(onApply)(color)}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Custom
            <input
              type="color"
              className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
              value={activeColor ?? "#000000"}
              onChange={(e) => withSavedSelection(onApply)(e.target.value)}
            />
          </label>
          <Button type="button" variant="outline" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function RichTextToolbar({ editor }: RichTextToolbarProps) {
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
        isLink: e.isActive("link"),
        linkHref: (e.getAttributes("link").href as string | undefined) ?? "",
        hasSelection: !e.state.selection.empty,
        textColor: e.getAttributes("textStyle").color as string | undefined,
        highlightColor: e.getAttributes("highlight").color as string | undefined,
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
    isLink: false,
    linkHref: "",
    hasSelection: false,
    textColor: undefined as string | undefined,
    highlightColor: undefined as string | undefined,
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

      <ColorPopover
        editor={editor}
        icon={<Baseline className="size-3.5" />}
        label="Text color"
        activeColor={active.textColor}
        presets={TEXT_COLORS}
        onApply={(color) => editor.chain().focus().setColor(color).run()}
        onClear={() => editor.chain().focus().unsetColor().run()}
      />
      <ColorPopover
        editor={editor}
        icon={<Highlighter className="size-3.5" />}
        label="Highlight color"
        activeColor={active.highlightColor}
        presets={HIGHLIGHT_COLORS}
        onApply={(color) => editor.chain().focus().setHighlight({ color }).run()}
        onClear={() => editor.chain().focus().unsetHighlight().run()}
      />

      <ToolbarDivider />

      <LinkPopover editor={editor} isLink={active.isLink} linkHref={active.linkHref} hasSelection={active.hasSelection} />

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

      <ToolbarDivider />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Remove formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run()}
      >
        <RemoveFormatting className="size-3.5" />
      </Button>
    </div>
  );
}
