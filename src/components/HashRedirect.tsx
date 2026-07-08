"use client";

import { useEffect } from "react";

const HASH_TO_PATH: Record<string, string> = {
  protocol: "/",
  forge: "/forge",
  tokenomics: "/tokenomics",
  "how-it-works": "/how-it-works",
  fees: "/how-it-works",
  stratum: "/tokenomics",
};

/** Legacy `/#section` bookmarks → clean routes. */
export default function HashRedirect() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const path = HASH_TO_PATH[hash];
    if (path) window.location.replace(path);
  }, []);

  return null;
}
