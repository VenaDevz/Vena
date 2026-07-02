import { PROJECT } from "./project";
import { robinhoodMainnet } from "./chains/robinhood";

const VENA_TOKEN = process.env.NEXT_PUBLIC_VENA_TOKEN ?? "";

/** Live Virtuals agent page — override via NEXT_PUBLIC_VIRTUALS_AGENT_URL */
export const VIRTUALS_AGENT_URL_DEFAULT =
  "https://app.virtuals.io/virtuals/95873";

const VIRTUALS_AGENT_URL =
  process.env.NEXT_PUBLIC_VIRTUALS_AGENT_URL ?? VIRTUALS_AGENT_URL_DEFAULT;

/** Where the "Buy / Trade VENA" CTA points. */
export function getBuyVenaHref(): string {
  return VIRTUALS_AGENT_URL;
}

export function isBuyVenaExternal(): boolean {
  return true;
}

export function getVirtualsTradeUrl(): string {
  return VIRTUALS_AGENT_URL;
}

/** Block explorer token page for $VENA. */
export function getVenaTokenExplorerUrl(): string {
  if (!VENA_TOKEN) {
    return PROJECT.chainId === robinhoodMainnet.id ||
      PROJECT.chainId === 46630
      ? "https://robinhoodchain.blockscout.com"
      : "https://robinhoodchain.blockscout.com";
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
  return `https://robinhoodchain.blockscout.com/token/${VENA_TOKEN}`;
}
