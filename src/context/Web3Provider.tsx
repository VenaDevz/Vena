"use client";

import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppKitProvider } from "@reown/appkit/react";
import { type AppKitNetwork } from "@reown/appkit/networks";
import {
  cookieToInitialState,
  WagmiProvider,
  type Config,
} from "wagmi";
import {
  activeChain,
  isWalletConfigured,
  reownProjectId,
  wagmiAdapter,
  wagmiConfig,
  walletMetadata,
} from "@/config/wagmi";

const queryClient = new QueryClient();

const appKitOptions = {
  adapters: [wagmiAdapter],
  projectId: reownProjectId || "00000000000000000000000000000000",
  networks: [activeChain] as [AppKitNetwork, ...AppKitNetwork[]],
  defaultNetwork: activeChain,
  metadata: walletMetadata,
  themeMode: "dark" as const,
  themeVariables: {
    "--w3m-accent": "#00ff88",
    "--w3m-color-mix": "#00d4ff",
    "--w3m-color-mix-strength": 25,
    "--w3m-border-radius-master": "12px",
    "--w3m-font-family": "var(--font-geist-sans), system-ui, sans-serif",
  },
  enableEIP6963: true,
  enableCoinbase: true,
  enableInjected: true,
  features: {
    analytics: false,
    email: false as const,
    socials: false as const,
  },
};

interface Web3ProviderProps {
  children: ReactNode;
  cookies: string | null;
}

export default function Web3Provider({ children, cookies }: Web3ProviderProps) {
  const [client] = useState(() => queryClient);
  const initialState = cookieToInitialState(wagmiConfig as Config, cookies);

  const providers = (
    <WagmiProvider config={wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </WagmiProvider>
  );

  if (!isWalletConfigured) {
    return providers;
  }

  return <AppKitProvider {...appKitOptions}>{providers}</AppKitProvider>;
}
