import type { NextConfig } from "next";

const emptyModule = "./src/lib/wagmi/empty-module.js";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      accounts: emptyModule,
      "@coinbase/wallet-sdk": emptyModule,
      "@gemini-wallet/core": emptyModule,
      "@metamask/sdk": emptyModule,
      "@safe-global/safe-apps-sdk": emptyModule,
      "@safe-global/safe-apps-provider": emptyModule,
      "@base-org/account": emptyModule,
      porto: emptyModule,
      "porto/internal": emptyModule,
    },
  },
};

export default nextConfig;
