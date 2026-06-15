/** Fixed header is h-20 (80px) — leave room when scrolling to anchors */
import type { MouseEvent } from "react";

const HEADER_OFFSET_PX = 88;

export function scrollToSection(sectionId: string, offset = HEADER_OFFSET_PX) {
  const el = document.getElementById(sectionId);
  if (!el) return false;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  return true;
}

export function handleSectionLink(
  e: MouseEvent<HTMLAnchorElement>,
  sectionId: string
) {
  e.preventDefault();
  scrollToSection(sectionId);
  if (typeof window !== "undefined" && window.history?.replaceState) {
    window.history.replaceState(null, "", `#${sectionId}`);
  }
}
