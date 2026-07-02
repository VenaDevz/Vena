import { PROJECT } from "./project";
import { robinhoodMainnet } from "./chains/robinhood";

const VENA_TOKEN =
  process.env.NEXT_PUBLIC_VENA_TOKEN ?? "";

/** Virtuals agent page for $VENA (trade happens here). */
const VIRTUALS_AGENT_URL = process.env.NEXT_PUBLIC_VIRTUALS_AGENT_URL ?? "";

/** Fallback Virtuals base — link to the token by address if no agent URL is set. */
function virtualsFallbackUrl(): string {
  if (VENA_TOKEN) {
    return `https://app.virtuals.io/geneses/${VENA_TOKEN}`;
  }
  return "https://app.virtuals.io";
}

/** Where the "Buy / Trade VENA" CTA points — always Virtuals now. */
export function getBuyVenaHref(): string {
  return VIRTUALS_AGENT_URL || virtualsFallbackUrl();
}

/** Buy CTAs always open Virtuals (external). */
export function isBuyVenaExternal(): boolean {
  return true;
}

/** Trade $VENA on Virtuals Protocol. */
export function getVirtualsTradeUrl(): string {
  return VIRTUALS_AGENT_URL || virtualsFallbackUrl();
}

/** Block explorer token page for $VENA. */
export function getVenaTokenExplorerUrl(): string {
  if (!VENA_TOKEN) {
    return PROJECT.chainId === robinhoodMainnet.id ||
      PROJECT.chainId === 46630
      ? "https://robinhoodchain.blockscout.com"
      : "https://basescan.org";
  }
  if (
    PROJECT.chainId === robinhoodMainnet.id ||
    PROJECT.chainId === 46630
  ) {
    const base =
      PROJECT.chainId === 46630
        ? "https://explorer.testnet.chain.robinhood.com"
        : "https://robinhoodchain.blockscout.com";
    return `${base}/token/${VENA_TOKEN}`;
  }
  return `https://basescan.org/token/${VENA_TOKEN}`;
}
