/**
 * VENA Command Base — Commander Trade Post.
 *
 * A simulated player-to-player resource market inspired by Kintara's
 * marketplace, adapted to VenaLand's idle economy. Other commanders across the
 * VenaLand network post orders to buy your surplus raw resources (for Crystal)
 * or to sell resources they've over-produced. Every filled trade takes a small
 * network fee that flows to the VENA treasury — the same buyback loop that
 * funds staking and the Crystal → USDC pool.
 *
 * Orders are generated deterministically from a rotating seed so the book feels
 * alive without needing a backend. Only the economic result (your Crystal +
 * resources) is persisted; the open book regenerates per session.
 */

export type TradeResource = "ore" | "iron" | "gold";

/**
 * Side is from the PLAYER's perspective:
 * - "sell": another commander buys your resource → you receive Crystal (−fee).
 * - "buy":  another commander sells a resource → you pay Crystal for it.
 */
export type TradeSide = "sell" | "buy";

export type TradeOrder = {
  id: string;
  side: TradeSide;
  resource: TradeResource;
  amount: number;
  /** Crystal per unit for this order. */
  unitPrice: number;
  trader: string;
};

/** Network fee to the VENA treasury on every fill (5%). */
export const TRADE_FEE_BPS = 500;

/** Number of open orders shown in the book at once. */
export const TRADE_BOOK_SIZE = 6;

/** Base Crystal value per resource unit (mid-price the book jitters around). */
const BASE_PRICE: Record<TradeResource, number> = {
  ore: 0.2,
  iron: 0.7,
  gold: 2.0,
};

/** Typical order size range per resource. */
const AMOUNT_RANGE: Record<TradeResource, [number, number]> = {
  ore: [80, 480],
  iron: [30, 180],
  gold: [8, 48],
};

const RESOURCES: TradeResource[] = ["ore", "iron", "gold"];

const TRADER_HANDLES = [
  "0xF3a2…b891",
  "0x7c01…2d9a",
  "0xAb34…f521",
  "0x9a7b…c341",
  "CmdrNova",
  "IronbaneOps",
  "0x3f5e…a89d",
  "DeepVeinDAO",
  "0x8b2c…4e7f",
  "AuroraRig",
  "0xc78f…3a6b",
  "StratumSix",
];

/** Deterministic PRNG (mulberry32) so a seed always yields the same order. */
function rng(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

/** Build one deterministic order from a seed (optionally force the side). */
export function generateOrder(seed: number, forcedSide?: TradeSide): TradeOrder {
  const resource = pick(RESOURCES, rng(seed));
  const side: TradeSide = forcedSide ?? (rng(seed * 7 + 13) > 0.5 ? "sell" : "buy");

  const [min, max] = AMOUNT_RANGE[resource];
  const amount = Math.round(min + rng(seed * 3 + 5) * (max - min));

  // Jitter ±18% around the base price. Commanders buying your goods pay a hair
  // less; commanders selling to you charge a hair more — a realistic spread.
  const jitter = 0.82 + rng(seed * 11 + 2) * 0.36;
  const spread = side === "sell" ? 0.97 : 1.05;
  const unitPrice = Number((BASE_PRICE[resource] * jitter * spread).toFixed(3));

  const trader = pick(TRADER_HANDLES, rng(seed * 5 + 9));

  return { id: `o${seed}`, side, resource, amount, unitPrice, trader };
}

/** Gross Crystal value of an order (before fee). */
export function orderGrossCrystal(order: TradeOrder): number {
  return order.amount * order.unitPrice;
}

/** Crystal fee taken to the treasury for an order. */
export function orderFeeCrystal(order: TradeOrder): number {
  return orderGrossCrystal(order) * (TRADE_FEE_BPS / 10_000);
}

/**
 * Net Crystal effect for the player.
 * - "sell": +gross −fee (you receive Crystal, fee skimmed).
 * - "buy":  −gross −fee (you pay Crystal plus the network fee).
 */
export function orderNetCrystal(order: TradeOrder): number {
  const gross = orderGrossCrystal(order);
  const fee = orderFeeCrystal(order);
  return order.side === "sell" ? gross - fee : -(gross + fee);
}

export function formatCrystalAmount(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}K`;
  if (abs >= 10) return String(Math.round(n));
  return n.toFixed(1);
}
