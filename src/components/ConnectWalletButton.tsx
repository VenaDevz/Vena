"use client";

import dynamic from "next/dynamic";
import { isWalletConfigured } from "@/config/wagmi";

function ConnectWalletPlaceholder({
  fullWidth = false,
  message,
}: {
  fullWidth?: boolean;
  message: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        window.alert(
          `${message}\n\n1. Proje klasöründe .env.local dosyasını açın\n2. Şunu ekleyin:\nNEXT_PUBLIC_REOWN_PROJECT_ID=sizin_id\n3. npm run dev ile sunucuyu yeniden başlatın\n\nÜcretsiz ID: https://dashboard.reown.com`
        )
      }
      className={`relative px-5 py-2.5 rounded-lg font-semibold text-sm tracking-wider border border-amber-500/40 text-amber-400 bg-amber-500/10 ${fullWidth ? "w-full" : ""}`}
      style={{ fontFamily: "var(--font-orbitron)" }}
    >
      Wallet Setup Required
    </button>
  );
}

const ConnectWalletButtonInner = dynamic(
  () => import("./ConnectWalletButtonInner"),
  {
    ssr: false,
    loading: () => (
      <div
        className="px-5 py-2.5 rounded-lg text-sm tracking-wider text-slate-500 border border-slate-700 animate-pulse"
        style={{ fontFamily: "var(--font-orbitron)" }}
      >
        Loading wallet...
      </div>
    ),
  }
);

interface ConnectWalletButtonProps {
  className?: string;
  fullWidth?: boolean;
}

export default function ConnectWalletButton(props: ConnectWalletButtonProps) {
  if (!isWalletConfigured) {
    return (
      <ConnectWalletPlaceholder
        fullWidth={props.fullWidth}
        message="Reown Project ID bulunamadı."
      />
    );
  }

  return <ConnectWalletButtonInner {...props} />;
}
