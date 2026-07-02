export const PICKAXE_NFT_ADDRESS = (process.env.NEXT_PUBLIC_PICKAXE_NFT ??
  "") as `0x${string}`;

export const VENA_MINING_ADDRESS = (process.env.NEXT_PUBLIC_VENA_MINING ??
  "") as `0x${string}`;

export const hasMiningContract = Boolean(
  PICKAXE_NFT_ADDRESS && VENA_MINING_ADDRESS
);

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
] as const;
