const VENA_TOKEN =
  process.env.NEXT_PUBLIC_VENA_TOKEN ?? "0xFE96b62c837F85f453a9b42ad1304C10588181fA";

const POOL_ID =
  process.env.NEXT_PUBLIC_VENA_POOL_ID ??
  "0x69dcdab302d501d55863810b6039498b09308c8e81f698b58824eb08b5ac13b4";

/** When "1", Buy CTAs open Uniswap instead of on-site #swap (use after LP is live on Uniswap). */
export function preferUniswapForBuy(): boolean {
  return process.env.NEXT_PUBLIC_BUY_VIA_UNISWAP === "1";
}

/** Hero / header Buy link: site swap first, Uniswap when env flag is set. */
export function getBuyVenaHref(): string {
  if (preferUniswapForBuy()) return getUniswapBuyVenaUrl();
  return "#swap";
}

export function isBuyVenaExternal(): boolean {
  return preferUniswapForBuy();
}

/** ETH → VENA on Uniswap (Base). Works once routing allowlist is approved. */
export function getUniswapBuyVenaUrl(): string {
  const override = process.env.NEXT_PUBLIC_UNISWAP_BUY_URL;
  if (override) return override;

  const params = new URLSearchParams({
    chain: "base",
    inputCurrency: "NATIVE",
    outputCurrency: VENA_TOKEN,
  });
  return `https://app.uniswap.org/swap?${params.toString()}`;
}

/** Direct link to the ETH/VENA v4 pool page. */
export function getUniswapPoolUrl(): string {
  return `https://app.uniswap.org/explore/pools/base/${POOL_ID}`;
}
