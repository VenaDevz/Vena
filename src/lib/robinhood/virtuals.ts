/** Virtuals Protocol + Robinhood Chain DEX addresses (mainnet, chainId 4663). */

export const RH_VIRTUALS = {
  venaToken: "0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf",
  /** Virtuals bonding-curve asset token ($VIRTUAL on RH). */
  virtualToken: "0xc6911796042b15d7fa4f6cde69e245ddcd3d9c31",
  weth: "0x0bd7d308f8e1639fab988df18a8011f41eacad73",
  /** Virtuals FRouter — quotes bonding-curve buys/sells. */
  fRouter: "0xCa6395246B4382Ba70F886526dD9a9De984F6081",
  fFactory: "0xFC2E4Da3EdB2E18100473339c763705d263D20A9",
  /** VENA bonding-curve pair (pre-graduation). */
  venaBondingPair: "0x425ddd764672a3bbd3ac1f76a251a5c303bfd942",
  /** Uniswap V2-style router on Robinhood Chain. */
  uniswapRouter: "0x89e5db8b5aa49aa85ac63f691524311aeb649eba",
  uniswapFactory: "0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f",
  virtualWethPair: "0xd95e8e2Cd04c207625C6F23c974d365a5F3A91D3",
  /** VENA agent bonding proxy — direct `buy(VIRTUAL → VENA)`. */
  venaBondingProxy: "0xd4cCBFA37e2f35611b3042e4096Ad7a3459Bd007",
  /**
   * Multi-hop aggregator (ETH buys via relayer). Prefer bonding proxy for keeper:
   * ETH → VIRTUAL (Uniswap) → VENA (bonding proxy buy).
   */
  tradeAggregator: "0x8a19963649b2Fc3D50c951953F89BcbFbD5f0b51",
  agentUrl: "https://app.virtuals.io/virtuals/95873",
} as const;

/** Recommended treasury keeper thresholds. */
export const TREASURY_BUYBACK_DEFAULTS = {
  /** Always keep this much ETH in treasury for gas. */
  gasReserveEth: "0.01",
  /** Only swap when excess ETH is at least this much (avoids dust swaps). */
  minSwapEth: "0.02",
  /** Effective trigger: treasury balance >= 0.03 ETH. */
} as const;
