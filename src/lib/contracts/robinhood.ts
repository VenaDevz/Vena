/** Robinhood Chain contract addresses + ABIs for VPICK mint / forge */

export const RH_CONTRACTS = {
  pickaxeNft: (process.env.NEXT_PUBLIC_PICKAXE_NFT ?? "") as `0x${string}`,
  forge: (process.env.NEXT_PUBLIC_FORGE ?? "") as `0x${string}`,
  venaToken: (process.env.NEXT_PUBLIC_VENA_TOKEN ?? "") as `0x${string}`,
  staking: (process.env.NEXT_PUBLIC_STAKING ?? "") as `0x${string}`,
} as const;

export function isPickaxeDeployed(): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(RH_CONTRACTS.pickaxeNft);
}

/** Mint (ETH) is live once Forge is wired to the NFT. No $VENA needed to mint. */
export function isForgeLive(): boolean {
  return isPickaxeDeployed() && /^0x[a-fA-F0-9]{40}$/.test(RH_CONTRACTS.forge);
}

/** Upgrades require $VENA — only enabled once the token address is set. */
export function isUpgradeLive(): boolean {
  return isForgeLive() && /^0x[a-fA-F0-9]{40}$/.test(RH_CONTRACTS.venaToken);
}

export const pickaxeNftAbi = [
  {
    name: "totalMinted",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "tierConfig",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tier", type: "uint8" }],
    outputs: [
      { name: "maxSupply", type: "uint256" },
      { name: "minted", type: "uint256" },
      { name: "miningPower", type: "uint256" },
      { name: "metadataURI", type: "string" },
    ],
  },
  {
    name: "tokenTier",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "tokensOfOwner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256[]" }],
  },
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
] as const;

export const forgeAbi = [
  {
    name: "mintSilver",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "upgrade",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "silverPriceWei",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "tierUpgradeVena",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tier", type: "uint8" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
] as const;

export const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export const TIER_INDEX = {
  Silver: 0,
  Gold: 1,
  Platinum: 2,
  Diamond: 3,
  Emerald: 4,
} as const;
