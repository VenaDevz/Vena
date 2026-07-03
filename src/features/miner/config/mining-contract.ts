import { RH_CONTRACTS } from "@/lib/contracts/robinhood";

export const PICKAXE_NFT_ADDRESS = RH_CONTRACTS.pickaxeNft;

/** Set NEXT_PUBLIC_STAKING_LIVE=true on Vercel when announcing staking. */
export const STAKING_LIVE = process.env.NEXT_PUBLIC_STAKING_LIVE === "true";

export const VENA_MINING_ADDRESS = RH_CONTRACTS.staking;

/** Pool reads work when addresses are set (even before public launch). */
export const isMiningDeployed = Boolean(
  PICKAXE_NFT_ADDRESS && VENA_MINING_ADDRESS
);

/** Stake / unstake / claim — gated until launch announcement. */
export const hasMiningContract = isMiningDeployed && STAKING_LIVE;

export const pickaxeNftAbi = [
  {
    name: "setApprovalForAll",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "isApprovedForAll",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

/** VenaMining / VenaMiningV2 — Robinhood Chain staking pool. */
export const venaMiningAbi = [
  {
    name: "getUserInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "power", type: "uint256" },
      { name: "stakedIds", type: "uint256[]" },
      { name: "pending", type: "uint256" },
    ],
  },
  {
    name: "pendingRewards",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "stakedTokenIds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256[]" }],
  },
  {
    name: "stakeNFT",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "unstakeNFT",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claimRewards",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "isActive",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    name: "started",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    name: "poolBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "rewardPerSecond",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalPower",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "fundRewards",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "syncPower",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "stratumBps",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "stakedAt",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const LOADOUT_LIVE = process.env.NEXT_PUBLIC_LOADOUT_LIVE === "true";

export const VENA_LOADOUT_ADDRESS = RH_CONTRACTS.loadout;

export const venaLoadoutAbi = [
  {
    name: "powerMultiplierBps",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "level",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "levelUpgradesEnabled",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    name: "accessoryShopEnabled",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    name: "upgradeLevel",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "buyAccessory",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    name: "setAccessoryEquipped",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "equipped", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "ownsAccessory",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "isEquipped",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;
