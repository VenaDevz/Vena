/** Shared site navigation — home anchors + app routes */

export type SiteNavLink =
  | { label: string; href: string; kind: "section" }
  | { label: string; href: string; kind: "route" }
  | { label: string; href: string; kind: "external" };

export const MAIN_NAV_LINKS: SiteNavLink[] = [
  { label: "Mint", href: "/mint", kind: "route" },
  { label: "Trade", href: "https://app.virtuals.io/virtuals/95873", kind: "external" },
  { label: "Protocol", href: "#protocol", kind: "section" },
  { label: "Forge", href: "#forge", kind: "section" },
  { label: "Tokenomics", href: "#tokenomics", kind: "section" },
  { label: "Miner", href: "/miner", kind: "route" },
];

export const FOOTER_NAV_LINKS: SiteNavLink[] = [
  { label: "How it works", href: "#how-it-works", kind: "section" },
  { label: "Mint", href: "/mint", kind: "route" },
  { label: "Tokenomics", href: "#tokenomics", kind: "section" },
  { label: "Miner Command", href: "/miner", kind: "route" },
];
