"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { getMarkRange, posToDOMRect } from "@tiptap/core";
import { Check, Copy, ExternalLink, Pencil, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeLinkHref } from "@/lib/utils/richtext";

/** The full extent of the link the cursor is in, or null if it is not in one. */
function linkRange(editor: Editor) {
  const { state } = editor;
  const type = state.schema.marks.link;
  if (!type) return null;
  return getMarkRange(state.selection.$from, type) ?? null;
}

/**
 * The card that appears when the cursor lands in a link: open it, copy it,
 * change its text or address, or take the link off — without going back up
 * to the toolbar. Mounted inside the editor, so it stays within whatever
 * dialog or card the editor lives in; appending it to the page body instead
 * would count as a click outside the task dialog and close it.
 */
export function LinkBubbleMenu({ editor }: { editor: Editor }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [href, setHref] = useState("");
  const [copied, setCopied] = useState(false);
  // shouldShow runs inside the editor plugin, outside React's render, so it
  // reads this ref rather than the state above (which it would see stale).
  const editingRef = useRef(false);
  const savedRange = useRef<{ from: number; to: number } | null>(null);

  const link = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e.isActive("link")) return { active: false, href: "", text: "" };
      const range = linkRange(e);
      return {
        active: true,
        href: (e.getAttributes("link").href as string | undefined) ?? "",
        text: range ? e.state.doc.textBetween(range.from, range.to) : "",
      };
    },
  });

  function setEditingMode(next: boolean) {
    editingRef.current = next;
    setEditing(next);
  }

  // Moving the cursor out of the link abandons an edit in progress.
  useEffect(() => {
    const onSelection = () => {
      if (editingRef.current && !editor.isActive("link")) setEditingMode(false);
    };
    editor.on("selectionUpdate", onSelection);
    return () => {
      editor.off("selectionUpdate", onSelection);
    };
  }, [editor]);

  function startEditing() {
    savedRange.current = linkRange(editor);
    setText(link.text);
    setHref(link.href);
    setEditingMode(true);
  }

  function save() {
    const nextHref = normalizeLinkHref(href);
    const range = savedRange.current ?? linkRange(editor);
    if (!nextHref || !range) return;
    const nextText = text.trim() || nextHref;
    editor
      .chain()
      .focus()
      .setTextSelection(range)
      .insertContent({ type: "text", text: nextText, marks: [{ type: "link", attrs: { href: nextHref } }] })
      .run();
    setEditingMode(false);
  }

  function remove() {
    const range = linkRange(editor);
    const chain = editor.chain().focus();
    if (range) chain.setTextSelection(range);
    chain.unsetLink().run();
    setEditingMode(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="linkBubbleMenu"
      shouldShow={({ editor: e }) => e.isEditable && (editingRef.current || e.isActive("link"))}
      // Anchor to the whole link rather than the caret, so the card lines up
      // with the link wherever inside it you clicked.
      getReferencedVirtualElement={() => {
        const range = savedRange.current && editingRef.current ? savedRange.current : linkRange(editor);
        if (!range) return null;
        return { getBoundingClientRect: () => posToDOMRect(editor.view, range.from, range.to) };
      }}
      // Beside the link rather than above or below it. Notes are often a list
      // of links, and a card over the line above or below covers the
      // neighbouring item — clicking it then lands on the card (and its Open
      // link) instead. The space to the right of a list item is usually empty,
      // and the card is kept one text line tall and centred on the link so it
      // does not spill onto the items either side.
      options={{
        placement: "right",
        offset: 8,
        flip: { fallbackPlacements: ["left", "bottom-start", "top-start"] },
        shift: { padding: 8 },
      }}
      className="z-50"
    >
      <div
        className="flex max-w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 rounded-lg border bg-popover p-0.5 text-popover-foreground shadow-md"
        // Keep clicks on the card from reaching the editor and moving the cursor.
        onMouseDown={(e) => {
          if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
        }}
      >
        {editing ? (
          // Not a <form>: this editor also sits inside the task dialog, which is
          // one, and a nested form's submit would carry up and save the task.
          <div
            className="flex w-72 max-w-full flex-col gap-1.5 p-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                save();
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setEditingMode(false);
                editor.commands.focus();
              }
            }}
          >
            <label className="text-xs text-muted-foreground" htmlFor="link-bubble-text">
              Text
            </label>
            <Input id="link-bubble-text" value={text} onChange={(e) => setText(e.target.value)} />
            <label className="text-xs text-muted-foreground" htmlFor="link-bubble-href">
              Link
            </label>
            <Input
              id="link-bubble-href"
              autoFocus
              placeholder="https://example.com"
              value={href}
              onChange={(e) => setHref(e.target.value)}
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingMode(false);
                  editor.commands.focus();
                }}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={!href.trim()} onClick={save}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-0.5">
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={link.href}
              className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-sm text-primary hover:bg-muted"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              {/* Capped so the card fits beside a link even in the narrow task dialog;
                  the full address is in the tooltip and the Edit form. */}
              <span className="max-w-[9rem] truncate underline underline-offset-2">{link.href}</span>
            </a>
            <div className="mx-0.5 h-4 w-px shrink-0 bg-border" />
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Copy link" title="Copy link" onClick={copy}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Edit link" title="Edit link" onClick={startEditing}>
              <Pencil className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove link" title="Remove link" onClick={remove}>
              <Unlink className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}
