"use client";

import { useState } from "react";

export const DEFAULT_WIDTH = 256;
export const MIN_WIDTH = 200;
export const MAX_WIDTH = 400;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readInitialCollapsed(): boolean {
  if (typeof document === "undefined") return false;
  // The inline script in the document head already set this attribute
  // before paint (avoiding a flash) — this just reads it into React state.
  // Safe from hydration mismatches since nothing renders differently based
  // on this state; only CSS attribute-selector rules do.
  return document.documentElement.getAttribute("data-sidebar-collapsed") === "true";
}

function readInitialWidth(): number {
  if (typeof document === "undefined") return DEFAULT_WIDTH;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width");
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? clamp(parsed, MIN_WIDTH, MAX_WIDTH) : DEFAULT_WIDTH;
}

export function useSidebarPrefs() {
  const [collapsed, setCollapsedState] = useState<boolean>(readInitialCollapsed);
  const [width, setWidthState] = useState<number>(readInitialWidth);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsedState(next);
    document.documentElement.setAttribute("data-sidebar-collapsed", String(next));
    localStorage.setItem("sidebarCollapsed", String(next));
  }

  function setWidth(next: number) {
    const clamped = clamp(next, MIN_WIDTH, MAX_WIDTH);
    setWidthState(clamped);
    document.documentElement.style.setProperty("--sidebar-width", `${clamped}px`);
    localStorage.setItem("sidebarWidth", String(clamped));
  }

  return { collapsed, width, toggleCollapsed, setWidth };
}
