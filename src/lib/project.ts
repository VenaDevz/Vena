/** VENA protocol — shared constants (UI + future contract integration) */

import { TOKENOMICS } from "./tokenomics";

export const PROJECT = {
  name: "VENA",
  taglineShort: "Mining Protocol",
  tokenSymbol: "VENA",
  tokenDisplay: "$VENA",
  network: process.env.NEXT_PUBLIC_NETWORK ?? "Robinhood Chain",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 4663),
  /** Hero headline — two lines */
  heroLine1: "MINT. UPGRADE.",
  heroLine2: "STAKE & EARN",
  subtitle: "Robinhood Chain / Mining Protocol",
  maxSupply: TOKENOMICS.maxTokenSupply,
  maxNfts: TOKENOMICS.maxNftSupply,
  timeBonusName: "Stratum",
  logoPath: "/logo.jpg",
  bannerPath: "/banner.jpg",
  social: {
    xHandle: "@VenaOnBase",
    xUrl: "https://x.com/VenaOnBase",
  },
  routes: {
    home: "/",
    mint: "/mint",
    miner: "/miner",
  },
  /** Virtuals Protocol agent page — set via NEXT_PUBLIC_VIRTUALS_AGENT_URL */
  launchpad: "Virtuals Protocol",
} as const;

export const PHASES = {
  preMining: "Pre-Mining",
  live: "Live",
} as const;
