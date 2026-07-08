/** Shared site navigation — clean routes (no hash anchors). */

export type SiteNavLink =
  | { label: string; href: string; kind: "route" }
  | { label: string; href: string; kind: "external" };

export const MAIN_NAV_LINKS: SiteNavLink[] = [
  { label: "Mint", href: "/mint", kind: "route" },
  { label: "Command Base", href: "/farm", kind: "route" },
  { label: "Trade", href: "https://app.virtuals.io/virtuals/95873", kind: "external" },
  { label: "Protocol", href: "/", kind: "route" },
  { label: "Forge", href: "/forge", kind: "route" },
  { label: "Tokenomics", href: "/tokenomics", kind: "route" },
  { label: "Miner", href: "/miner", kind: "route" },
];

export const FOOTER_NAV_LINKS: SiteNavLink[] = [
  { label: "How it works", href: "/how-it-works", kind: "route" },
  { label: "Mint", href: "/mint", kind: "route" },
  { label: "Tokenomics", href: "/tokenomics", kind: "route" },
  { label: "Command Base", href: "/farm", kind: "route" },
  { label: "Miner Command", href: "/miner", kind: "route" },
];
