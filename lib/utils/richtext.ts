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

function inlineToPlainText(fragment: Fragment): string {
  let out = "";
  fragment.forEach((node) => {
    if (node.type.name === "hardBreak") {
      out += "\n";
      return;
    }
    let text = node.text ?? "";
    if (!text) return;
    const isBold = node.marks.some((m) => m.type.name === "bold");
    const isItalic = node.marks.some((m) => m.type.name === "italic");
    if (isBold) text = `*${text}*`;
    if (isItalic) text = `_${text}_`;
    out += text;
  });
  return out;
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
    const marker = ordered ? `${n++}. ` : "- ";
    const itemLines = itemContentToPlainText(itemNode.content, indent + "  ").split("\n");
    lines.push(indent + marker + itemLines[0]);
    for (let i = 1; i < itemLines.length; i++) lines.push(itemLines[i]);
  });
  return lines.join("\n");
}

function blocksToPlainText(fragment: Fragment): string {
  const parts: string[] = [];
  fragment.forEach((node) => {
    switch (node.type.name) {
      case "paragraph":
      case "heading": {
        // Empty paragraphs are usually just spacer lines a user added by
        // pressing Enter between sections — skip them so they don't stack
        // an extra blank-line gap on top of the separator already added
        // below, which would triple the visual gap instead of doubling it.
        const text = inlineToPlainText(node.content);
        if (text.trim()) parts.push(text);
        break;
      }
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
  return parts.join("\n\n");
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
