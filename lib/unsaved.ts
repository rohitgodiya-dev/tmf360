"use client";
// Unsaved-changes guard (Part 22, IDX-08). Forms register while they hold unsaved edits; the browser warns before
// the page is closed or reloaded, and the platform shell asks before switching panels (hasUnsavedChanges()).
import { useEffect } from "react";

const dirty = new Set<string>();
const listeners = new Set<() => void>();

export function hasUnsavedChanges(): boolean {
  return dirty.size > 0;
}
/** Forget every registered form (after the user chose to discard). */
export function discardUnsavedChanges() {
  dirty.clear();
  listeners.forEach((l) => l());
}
/** Called when a discard happens, so forms can reset their drafts. */
export function onDiscard(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function beforeUnload(e: BeforeUnloadEvent) {
  if (!dirty.size) return;
  e.preventDefault();
  e.returnValue = "";
}

/** Registers `key` as having unsaved edits while `isDirty` is true. */
export function useUnsavedChanges(key: string, isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) { dirty.delete(key); return; }
    dirty.add(key);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      dirty.delete(key);
      if (!dirty.size) window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [key, isDirty]);
}
