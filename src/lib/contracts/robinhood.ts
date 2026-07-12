/** Robinhood Chain contract addresses + ABIs for VPICK mint / forge */

/** Mainnet deployments — used when env vars are unset (e.g. Vercel misconfig). */
export const RH_MAINNET_CONTRACTS = {
  pickaxeNft: "0xe250751a2514e0d1267AcBEBF43787aF579b6F4c",
  forge: "0x99A1ac88eeB9eFFF12Be0607F4089c40F6765823",
  venaToken: "0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf",
  staking: "0x1dDA64bd76165400Ad929D4d94E0D8285288D37B",
  loadout: "0x29865b0A6a9fA520b9d5DE47434c76936D032bcb",
} as const;

const RH_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 4663);

function resolveRhAddress(
  envVal: string | undefined,
  mainnetFallback: `0x${string}`
): `0x${string}` {
  if (envVal && /^0x[a-fA-F0-9]{40}$/.test(envVal)) {
    return envVal as `0x${string}`;
  }
  return RH_CHAIN_ID === 4663 ? mainnetFallback : ("" as `0x${string}`);
}

export const RH_CONTRACTS = {
  pickaxeNft: resolveRhAddress(
    process.env.NEXT_PUBLIC_PICKAXE_NFT,
    RH_MAINNET_CONTRACTS.pickaxeNft
  ),
  forge: resolveRhAddress(
    process.env.NEXT_PUBLIC_FORGE,
    RH_MAINNET_CONTRACTS.forge
  ),
  venaToken: resolveRhAddress(
    process.env.NEXT_PUBLIC_VENA_TOKEN,
    RH_MAINNET_CONTRACTS.venaToken
  ),
  staking: resolveRhAddress(
    process.env.NEXT_PUBLIC_STAKING,
    RH_MAINNET_CONTRACTS.staking
  ),
  loadout: resolveRhAddress(
    process.env.NEXT_PUBLIC_LOADOUT,
    RH_MAINNET_CONTRACTS.loadout
  ),
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

export const forgeAbi = [
  {
    name: "mintSilver",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "forge",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "inputTier", type: "uint8" },
      { name: "tokenIds", type: "uint256[]" },
    ],
    outputs: [],
  },
  {
    name: "getRecipe",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tier", type: "uint8" }],
    outputs: [
      { name: "inputCount", type: "uint256" },
      { name: "outputTier", type: "uint8" },
    ],
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
