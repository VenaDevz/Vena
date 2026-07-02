import { cookieStorage, createStorage } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base } from "@reown/appkit/networks";
import { PROJECT } from "@/lib/project";
import {
  robinhoodChainById,
  robinhoodMainnet,
} from "@/lib/chains/robinhood";

/** Free Project ID: https://dashboard.reown.com */
export const reownProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";

export const isWalletConfigured = Boolean(reownProjectId);

const isRobinhood =
  PROJECT.chainId === robinhoodMainnet.id || PROJECT.chainId === 46630;

export const activeChain = isRobinhood
  ? robinhoodChainById(PROJECT.chainId)
  : base;

export const networks = [activeChain] as const;

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId: reownProjectId || "00000000000000000000000000000000",
  networks: [...networks],
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const targetChainId = PROJECT.chainId;

/** @deprecated use targetChainId */
export const baseChainId = targetChainId;

export const walletMetadata = {
  name: PROJECT.name,
  description: `Stake Pickaxe NFTs. Mine $VENA on ${PROJECT.network}.`,
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  icons: ["/favicon.ico"],
};
