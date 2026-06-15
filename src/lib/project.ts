/** VENA protocol — shared constants (UI + future contract integration) */

import { TOKENOMICS } from "./tokenomics";

export const PROJECT = {
  name: "VENA",
  taglineShort: "Mining Protocol",
  tokenSymbol: "VENA",
  tokenDisplay: "$VENA",
  network: "Base",
  chainId: 8453,
  /** Hero headline — two lines */
  heroLine1: "STAKE DEPTH",
  heroLine2: "COMPOUND YIELD",
  subtitle: "Base / Uniswap V4 / Live Hook Pool",
  maxSupply: TOKENOMICS.maxTokenSupply,
  maxNfts: TOKENOMICS.maxNftSupply,
  timeBonusName: "Stratum",
  logoPath: "/logo.jpg",
  bannerPath: "/banner.jpg",
  social: {
    xHandle: "@VenaOnBase",
    xUrl: "https://x.com/VenaOnBase",
  },
} as const;

export const PHASES = {
  preMining: "Pre-Mining",
  live: "Live",
} as const;
