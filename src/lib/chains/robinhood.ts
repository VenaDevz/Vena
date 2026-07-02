import { defineChain } from "viem";

const mainnetRpc =
  process.env.NEXT_PUBLIC_RH_RPC ?? "https://rpc.mainnet.chain.robinhood.com";
const testnetRpc =
  process.env.NEXT_PUBLIC_RH_TESTNET_RPC ??
  "https://rpc.testnet.chain.robinhood.com";

/** Robinhood Chain mainnet — chainId 4663 */
export const robinhoodMainnet = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: {
    default: { http: [mainnetRpc] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});

/** Robinhood Chain testnet — chainId 46630 */
export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: {
    default: { http: [testnetRpc] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
});

export function robinhoodChainById(chainId: number) {
  return chainId === robinhoodTestnet.id ? robinhoodTestnet : robinhoodMainnet;
}
