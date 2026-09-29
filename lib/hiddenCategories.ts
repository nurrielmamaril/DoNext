"use client";

/**
 * Which clients are kept out of the sidebar, for sharing a screen with one of
 * them while the others stay private.
 *
 * Held outside React because the hiding has to be in place before the first
 * paint — an inline script in app/layout.tsx writes the same <style> element
 * this module maintains. A list that renders and then disappears has already
 * shown the name to the room.
 */
const KEY = "hiddenCategories";
const STYLE_ID = "hidden-categories";
const EMPTY = "[]";

const listeners = new Set<() => void>();

/** Ids come from the database, but this builds a CSS selector — be sure. */
function safeId(id: string) {
  return /^[A-Za-z0-9_-]+$/.test(id);
}

export function hiddenCss(ids: string[]) {
  return ids
    .filter(safeId)
    .map((id) => `[data-list-id="${id}"]{display:none}`)
    .join("");
}

function applyStyle(ids: string[]) {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = hiddenCss(ids);
}

/** The raw stored string, so the snapshot is referentially stable between reads. */
export function getHiddenRaw() {
  if (typeof window === "undefined") return EMPTY;
  try {
    return localStorage.getItem(KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

export function getServerHiddenRaw() {
  return EMPTY;
}

export function subscribeHidden(cb: () => void) {
  listeners.add(cb);
  // Another tab changing the set should not leave this one out of step.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      applyStyle(parseHidden(getHiddenRaw()));
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function parseHidden(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function hideCategory(id: string) {
  const current = parseHidden(getHiddenRaw());
  if (current.includes(id)) return;
  const next = [...current, id];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Blocked storage: it still applies for this visit, just does not persist.
  }
  applyStyle(next);
  listeners.forEach((cb) => cb());
}

export function showAllCategories() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // As above.
  }
  applyStyle([]);
  listeners.forEach((cb) => cb());
}

