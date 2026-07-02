/** Shared site navigation — home anchors + app routes */

export type SiteNavLink =
  | { label: string; href: string; kind: "section" }
  | { label: string; href: string; kind: "route" };

export const MAIN_NAV_LINKS: SiteNavLink[] = [
  { label: "Mint", href: "/mint", kind: "route" },
  { label: "Protocol", href: "#protocol", kind: "section" },
  { label: "Swap", href: "#swap", kind: "section" },
  { label: "Stratum", href: "#stratum", kind: "section" },
  { label: "Forge", href: "#forge", kind: "section" },
  { label: "Mining", href: "#mining", kind: "section" },
  { label: "Fees", href: "#claim-fees", kind: "section" },
  { label: "Miner", href: "/miner", kind: "route" },
];

export const FOOTER_NAV_LINKS: SiteNavLink[] = [
  { label: "How it works", href: "#how-it-works", kind: "section" },
  { label: "Tokenomics", href: "#tokenomics", kind: "section" },
  { label: "Miner Command", href: "/miner", kind: "route" },
];
