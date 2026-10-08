import { DOMSerializer } from "@tiptap/pm/model";
import type { Fragment, Node as PMNode, Schema } from "@tiptap/pm/model";

const HTML_TAG_RE = /<(p|h[1-6]|ul|ol|li|strong|em|b|i|u|br|blockquote|a)[\s/>]/i;

export function isHtmlContent(content: string): boolean {
  return HTML_TAG_RE.test(content);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function plainTextToHtml(content: string): string {
  if (!content) return "";
  return content
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Wraps `text` in `marker`, keeping any space at either end outside the
 * markers. Chat apps only treat a pair as formatting when it closes on a real
 * character, so "*Name: *" arrives as a literal asterisk instead of bold —
 * which is what a label typed with the space inside the bold produces.
 */
function wrap(text: string, marker: string): string {
  const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(text) as RegExpExecArray;
  if (!core) return text;
  return `${lead}${marker}${core}${marker}${trail}`;
}

function inlineToPlainText(fragment: Fragment): string {
  // Runs that carry the same marks are merged first: emphasis split across
  // two text nodes would otherwise close and reopen mid-phrase ("*a**b*"),
  // which reads as literal asterisks on the other end.
  const runs: { text: string; bold: boolean; italic: boolean }[] = [];
  fragment.forEach((node) => {
    if (node.type.name === "hardBreak") {
      runs.push({ text: "\n", bold: false, italic: false });
      return;
    }
    const text = node.text ?? "";
    if (!text) return;
    const bold = node.marks.some((m) => m.type.name === "bold");
    const italic = node.marks.some((m) => m.type.name === "italic");
    const last = runs[runs.length - 1];
    if (last && last.bold === bold && last.italic === italic) last.text += text;
    else runs.push({ text, bold, italic });
  });

  return runs
    .map(({ text, bold, italic }) => {
      let out = text;
      if (bold) out = wrap(out, "*");
      if (italic) out = wrap(out, "_");
      return out;
    })
    .join("");
}

// Returns the item's own content as unindented lines, except for any nested
// list (which indents and marks its own lines recursively) — the caller
// (listToPlainText) prefixes the first line with this item's own marker.
function itemContentToPlainText(fragment: Fragment, indent: string): string {
  const parts: string[] = [];
  fragment.forEach((node) => {
    switch (node.type.name) {
      case "paragraph":
      case "heading":
        parts.push(inlineToPlainText(node.content));
        break;
      case "bulletList":
      case "orderedList":
        parts.push(listToPlainText(node, indent));
        break;
      default:
        if (node.content.size > 0) parts.push(itemContentToPlainText(node.content, indent));
    }
  });
  return parts.join("\n");
}

function listToPlainText(listNode: PMNode, indent: string): string {
  const ordered = listNode.type.name === "orderedList";
  let n = ordered ? ((listNode.attrs.start as number | undefined) ?? 1) : 0;
  const lines: string[] = [];
  listNode.content.forEach((itemNode) => {
    // A literal bullet, not "- ". Chat apps treat a dash at the start of a
    // line as markdown and rebuild the list their own way, indenting it and
    // padding it with blank lines — what gets pasted then no longer matches
    // the note it was copied from. A bullet character is just a character.
    // A number does the same thing to them, so its space is a non-breaking
    // one: it looks identical and reads as ordinary text.
    const marker = ordered ? `${n++}. ` : "• ";
    const itemLines = itemContentToPlainText(itemNode.content, indent + "  ").split("\n");
    lines.push(indent + marker + itemLines[0]);
    for (let i = 1; i < itemLines.length; i++) lines.push(itemLines[i]);
  });
  return lines.join("\n");
}

function blocksToPlainText(fragment: Fragment): string {
  // One block, one line — the same shape the note has on screen. Blank lines
  // come only from the empty paragraphs someone actually typed, so pasting a
  // note somewhere plain gives back the note, not a spaced-out version of it.
  const parts: string[] = [];
  fragment.forEach((node) => {
    switch (node.type.name) {
      case "paragraph":
      case "heading":
        parts.push(inlineToPlainText(node.content));
        break;
      case "bulletList":
      case "orderedList":
        parts.push(listToPlainText(node, ""));
        break;
      case "blockquote":
        parts.push(
          blocksToPlainText(node.content)
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")
        );
        break;
      default:
        if (node.content.size > 0) parts.push(blocksToPlainText(node.content));
    }
  });
  return parts.join("\n");
}

export function fragmentToPlainText(fragment: Fragment): string {
  return blocksToPlainText(fragment).trim();
}

export function fragmentToHtml(schema: Schema, fragment: Fragment): string {
  const serializer = DOMSerializer.fromSchema(schema);
  const domFragment = serializer.serializeFragment(fragment);
  const container = document.createElement("div");
  container.appendChild(domFragment);
  return container.innerHTML;
}

/**
 * Turns what someone typed into a link address into one that actually goes
 * somewhere. "example.com" on its own is a relative path — clicked, it would
 * open a page inside DoNext — so a bare domain gets https:// put in front.
 * Anything that already names a scheme (https:, mailto:, tel:) is left alone.
 */
export function normalizeLinkHref(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
  return `https://${trimmed}`;
}
