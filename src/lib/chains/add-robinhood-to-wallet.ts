import { robinhoodMainnet, robinhoodTestnet } from "./robinhood";
import { targetChainId } from "@/config/wagmi";

/** Add Robinhood Chain to MetaMask / Rabby if missing. */
export async function addRobinhoodChainToWallet(
  chainId: number = targetChainId
): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum?.request) {
    return false;
  }
  const chain =
    chainId === robinhoodTestnet.id ? robinhoodTestnet : robinhoodMainnet;
  const rpc = chain.rpcUrls.default.http[0];
  const explorer = chain.blockExplorers?.default?.url ?? "";

  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: `0x${chain.id.toString(16)}`,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [rpc],
          blockExplorerUrls: explorer ? [explorer] : [],
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export async function switchRobinhoodChain(
  chainId: number = targetChainId
): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum?.request) {
    return false;
  }
  const hex = `0x${chainId.toString(16)}`;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hex }],
    });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      return addRobinhoodChainToWallet(chainId);
    }
    return false;
  }
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isRabby?: boolean;
    };
  }
}
