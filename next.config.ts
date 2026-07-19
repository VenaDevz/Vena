import type { NextConfig } from "next";

const emptyModule = "./src/lib/wagmi/empty-module.js";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    qualities: [75, 95],
  },
  async redirects() {
    return [
      { source: "/robot-os", destination: "/miner", permanent: true },
      { source: "/robot-os/:path*", destination: "/miner", permanent: true },
    ];
  },
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
