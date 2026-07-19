"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Image from "next/image";

const CHEST_CONTRACT_ADDRESS = "0xb12c93b2e308ae4d6c1713c97b60f9a0389f3b94";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

const chestAbi = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)"
];

/* ─── Animation keyframes ─── */
const animStyles = `
@keyframes float-idle {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
@keyframes shake-intense {
  0%   { transform: translate(0, 0)   rotate(0deg); }
  10%  { transform: translate(-4px, -2px) rotate(-2deg); }
  20%  { transform: translate(4px, 1px) rotate(2deg); }
  30%  { transform: translate(-3px, 3px) rotate(-1deg); }
  40%  { transform: translate(5px, -1px) rotate(1deg); }
  50%  { transform: translate(-2px, 2px) rotate(-2deg); }
  60%  { transform: translate(3px, -3px) rotate(2deg); }
  70%  { transform: translate(-5px, 1px) rotate(-1deg); }
  80%  { transform: translate(4px, 2px) rotate(1deg); }
  90%  { transform: translate(-3px, -2px) rotate(-2deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
@keyframes white-flash {
  0%   { opacity: 0; }
  30%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes nft-fly-in {
  0%   { transform: scale(0.5) translateY(60px); opacity: 0; filter: blur(10px) brightness(2); }
  60%  { transform: scale(1.10) translateY(-5px); opacity: 1; filter: blur(0) brightness(1.2); }
  80%  { transform: scale(0.98) translateY(2px); opacity: 1; filter: blur(0) brightness(1.05); }
  100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0) brightness(1); }
}
@keyframes chest-open-zoom {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.3); opacity: 1; }
}
@keyframes chest-fade-after-open {
  0%   { opacity: 1; transform: scale(1.3); }
  100% { opacity: 0; transform: scale(1.5) translateY(-40px); filter: blur(10px) brightness(2); }
}
@keyframes particle-rise {
  0%   { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-200px) scale(0.3); opacity: 0; }
}
@keyframes ring-expand {
  0%   { transform: scale(0.5); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 20px rgba(168,85,247,0.6)); }
  50%      { filter: drop-shadow(0 0 60px rgba(168,85,247,1)) drop-shadow(0 0 100px rgba(168,85,247,0.5)); }
}
@keyframes rarity-text-in {
  0%   { transform: scale(0.5) translateY(20px); opacity: 0; letter-spacing: 0.5em; }
  60%  { transform: scale(1.1) translateY(-5px); opacity: 1; letter-spacing: 0.3em; }
  100% { transform: scale(1) translateY(0); opacity: 1; letter-spacing: 0.2em; }
}
`;

/* ─── Animation State Machine ─── */
type AnimPhase =
  | "idle"
  | "confirming"   // Waiting for wallet signature
  | "charging"     // Chest glowing & shaking (energy building)
  | "opening"      // Chest opens (swap to opened image)
  | "flash"        // White flash burst
  | "revealing"    // NFT flies in from the light
  | "error";

export default function VenaLandChestOpener() {
  const [account, setAccount] = useState<string>("");
  const [standardCount, setStandardCount] = useState(0);
  const [premiumCount, setPremiumCount] = useState(0);
  const [recoverTxHash, setRecoverTxHash] = useState("");
  const [showRecover, setShowRecover] = useState(false);
  const [phase, setPhase] = useState<AnimPhase>("idle");
  const [selectedChest, setSelectedChest] = useState<0 | 1>(0);
  const [revealedLand, setRevealedLand] = useState<{ name: string; tx: string; size: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  /* ─── Wallet helpers ─── */
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum.request({ method: "eth_accounts" }).then((accts: string[]) => {
        if (accts.length > 0) { setAccount(accts[0]); fetchBalances(accts[0]); }
      });
    }
  }, []);

  const connectWallet = async () => {
    if (!(window as any).ethereum) return alert("Metamask not found!");
    const accts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
    setAccount(accts[0]); fetchBalances(accts[0]);
  };

  const fetchBalances = async (addr: string) => {
    try {
      const p = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com");
      const c = new ethers.Contract(CHEST_CONTRACT_ADDRESS, chestAbi, p);
      setStandardCount(Number(await c.balanceOf(addr, 0)));
      setPremiumCount(Number(await c.balanceOf(addr, 1)));
    } catch (e) { console.error(e); }
  };

  /* ─── Image map for each phase ─── */
  const getImg = useCallback((chestId: 0 | 1, p: AnimPhase) => {
    const isPremium = chestId === 1;
    if (p === "charging") return isPremium ? "/venapremiumchest-glow-nobg.png" : "/venachest-glow-nobg.png";
    if (p === "opening" || p === "flash") return isPremium ? "/venapremiumchest-open-nobg.png" : "/venachest-open-nobg.png";
    return isPremium ? "/venapremiumchest-nobg.png" : "/venachest-nobg.png";
  }, []);

  /* ─── Real open flow ─── */
  const openChest = async (chestId: 0 | 1) => {
    if (!account) return;
    if (chestId === 0 && standardCount === 0) return;
    if (chestId === 1 && premiumCount === 0) return;

    setSelectedChest(chestId);
    setPhase("confirming");
    setRevealedLand(null);
    setErrorMsg("");

    try {
      try {
        await (window as any).ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x1237" }] });
      } catch (sw: any) { if (sw.code === 4902) throw new Error("Add Robinhood Network to wallet first."); }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CHEST_CONTRACT_ADDRESS, chestAbi, signer);
      const tx = await contract.safeTransferFrom(account, DEAD_ADDRESS, chestId, 1, "0x");

      setPhase("charging");
      const receipt = await tx.wait();

      setPhase("opening");
      await new Promise(r => setTimeout(r, 1800));

      setPhase("flash");
      const res = await fetch("/api/chest/open", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: receipt.hash, walletAddress: account }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Mint failed");

      const landMap: Record<number, string> = { 2: "2x2 VenaLand Base", 3: "3x3 VenaLand Base", 4: "4x4 VenaLand Base", 5: "5x5 VenaLand Base" };
      await new Promise(r => setTimeout(r, 800));
      setRevealedLand({ name: landMap[data.landSizeId], tx: data.mintTxHash, size: data.landSizeId });
      setPhase("revealing");
      fetchBalances(account);
    } catch (err: any) {
      console.error(err);
      setPhase("error");
      setErrorMsg(err.code === "ACTION_REJECTED" ? "Transaction cancelled." : (err.message || "Error"));
      setTimeout(() => setPhase("idle"), 3000);
    }
  };

  const openChestWithHash = async (txHash: string) => {
    if (!account || !txHash) return;
    setPhase("charging");
    setErrorMsg("");
    try {
      setPhase("opening");
      await new Promise(r => setTimeout(r, 1000));
      setPhase("flash");
      const res = await fetch("/api/chest/open", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, walletAddress: account }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Mint failed");

      const landMap: Record<number, string> = { 2: "2x2 VenaLand Base", 3: "3x3 VenaLand Base", 4: "4x4 VenaLand Base", 5: "5x5 VenaLand Base" };
      await new Promise(r => setTimeout(r, 800));
      setRevealedLand({ name: landMap[data.landSizeId], tx: data.mintTxHash, size: data.landSizeId });
      setPhase("revealing");
      setShowRecover(false);
      fetchBalances(account);
    } catch (err: any) {
      console.error(err);
      setPhase("error");
      setErrorMsg(err.message || "Recovery failed.");
      setTimeout(() => setPhase("idle"), 5000);
    }
  };

  const isAnimating = phase !== "idle" && phase !== "error";

  /* ─── Particles (purple sparkles during charging/opening) ─── */
  const particles = Array.from({ length: 12 }, (_, i) => (
    <div key={i} className="absolute rounded-full bg-purple-400"
      style={{
        width: 4 + Math.random() * 6, height: 4 + Math.random() * 6,
        left: `${20 + Math.random() * 60}%`, bottom: `${30 + Math.random() * 30}%`,
        animation: `particle-rise ${1.5 + Math.random() * 2}s ease-out infinite`,
        animationDelay: `${Math.random() * 1.5}s`, opacity: 0.8,
      }}
    />
  ));

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-white relative">
      <style>{animStyles}</style>

      {/* ══════ IDLE DASHBOARD ══════ */}
      <div className={`w-full max-w-4xl transition-all duration-700 ${isAnimating ? "opacity-0 pointer-events-none scale-95 blur-sm" : "opacity-100"}`}>
        <h1 className="text-5xl font-black mb-12 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          VenaLand Unboxing
        </h1>

        {!account ? (
          <div className="flex justify-center">
            <button onClick={connectWallet}
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-2xl font-bold text-2xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:scale-105">
              Connect Wallet to Begin
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Standard Card */}
            <div className="bg-black/40 p-8 rounded-3xl border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] flex flex-col items-center hover:border-blue-500/60 transition-all hover:-translate-y-2 group">
              <div className="w-48 h-48 relative mb-6" style={{ animation: "float-idle 3s ease-in-out infinite" }}>
                <Image src="/venachest-nobg.png" alt="Standard Chest" fill className="object-contain" />
              </div>
              <h3 className="text-3xl font-bold text-gray-100 mb-2">Standard Chest</h3>
              <p className="text-xl text-gray-400 mb-6">Owns: <span className="text-blue-400 font-black text-2xl">{standardCount}</span></p>
              <button onClick={() => openChest(0)} disabled={standardCount === 0}
                className="w-full py-4 bg-blue-600/80 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-xl tracking-widest transition-all">
                UNBOX
              </button>
            </div>

            {/* Premium Card */}
            <div className="bg-black/40 p-8 rounded-3xl border border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.2)] flex flex-col items-center hover:border-purple-500/70 transition-all hover:-translate-y-2 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none" />
              <div className="w-48 h-48 relative mb-6" style={{ animation: "float-idle 3s ease-in-out infinite 0.5s" }}>
                <Image src="/venapremiumchest-nobg.png" alt="Premium Chest" fill className="object-contain" />
              </div>
              <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 mb-2">Premium Chest</h3>
              <p className="text-xl text-gray-400 mb-6">Owns: <span className="text-purple-400 font-black text-2xl">{premiumCount}</span></p>
              <button onClick={() => openChest(1)} disabled={premiumCount === 0}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-xl tracking-widest transition-all shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                UNBOX PREMIUM
              </button>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col items-center">
            <button onClick={() => setShowRecover(!showRecover)} className="text-sm text-gray-400 hover:text-white underline transition-colors">
              Did your chest burn but you got an error? Recover here.
            </button>
            {showRecover && (
              <div className="mt-4 flex items-center gap-2 w-full max-w-md">
                <input 
                  type="text" 
                  value={recoverTxHash} 
                  onChange={(e) => setRecoverTxHash(e.target.value)}
                  placeholder="Paste Transaction Hash (0x...)" 
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <button onClick={() => openChestWithHash(recoverTxHash)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-all">
                  Recover
                </button>
              </div>
            )}
          </div>
          </>
        )}

        {account && (
          <div className="mt-12 flex justify-center">
            <button onClick={() => { window.location.href = "/farm"; }}
              className="px-12 py-4 bg-transparent border-2 border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-500 hover:text-yellow-400 hover:border-yellow-400 font-bold text-xl rounded-xl transition-all shadow-[0_0_15px_rgba(253,224,71,0.1)] hover:shadow-[0_0_25px_rgba(253,224,71,0.3)]">
              ENTER COMMAND BASE ➔
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-8 text-center text-red-500 font-bold text-xl bg-red-500/10 py-3 rounded-lg border border-red-500/20">{errorMsg}</div>
        )}
      </div>

      {/* ══════ CINEMATIC ANIMATION OVERLAY ══════ */}
      {isAnimating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden">

          {/* ── Phase 1: CONFIRMING (chest floating, waiting for wallet) ── */}
          {phase === "confirming" && (
            <div className="flex flex-col items-center">
              <div className="w-72 h-72 relative" style={{ animation: "float-idle 2s ease-in-out infinite" }}>
                <Image src={getImg(selectedChest, "confirming")} alt="Chest" fill className="object-contain" style={{ animation: "pulse-glow 2s infinite" }} />
              </div>
              <p className="mt-8 text-gray-400 text-xl font-bold tracking-widest uppercase animate-pulse">Confirm in Wallet...</p>
            </div>
          )}

          {/* ── Phase 2: CHARGING (glowing chest shaking violently) ── */}
          {phase === "charging" && (
            <div className="flex flex-col items-center relative">
              {/* Particles rising from chest */}
              <div className="absolute inset-0 w-72 h-72 mx-auto">{particles}</div>
              {/* Magic circle beneath */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-20">
                <div className="w-full h-full rounded-full bg-purple-500/30 blur-xl" style={{ animation: "ring-expand 2s infinite" }} />
              </div>
              <div className="w-72 h-72 relative" style={{ animation: "shake-intense 0.15s infinite" }}>
                <Image src={getImg(selectedChest, "charging")} alt="Charging" fill className="object-contain" style={{ animation: "pulse-glow 0.5s infinite" }} />
              </div>
              <p className="mt-8 text-yellow-400 text-xl font-black tracking-widest uppercase animate-pulse"
                style={{ fontFamily: "'Futura', 'Futura Book', 'Century Gothic', sans-serif" }}>
                UNLOCKING...
              </p>
            </div>
          )}

          {/* ── Phase 3: OPENING (chest opens, light beams shoot up) ── */}
          {phase === "opening" && (
            <div className="flex flex-col items-center relative">
              {/* Particles */}
              <div className="absolute inset-0 w-80 h-80 mx-auto">{particles}</div>
              {/* Light beam from chest */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[500px] bg-gradient-to-t from-purple-400 via-purple-300/50 to-transparent blur-xl opacity-80"
                style={{ animation: "ring-expand 1.5s ease-out forwards" }} />
              <div className="w-80 h-80 relative" style={{ animation: "chest-open-zoom 1.8s ease-out forwards" }}>
                <Image src={getImg(selectedChest, "opening")} alt="Opened!" fill className="object-contain"
                  style={{ filter: "drop-shadow(0 0 60px rgba(168,85,247,1)) drop-shadow(0 0 120px rgba(168,85,247,0.5))" }} />
              </div>

            </div>
          )}

          {/* ── Phase 4: FLASH (white screen flash) ── */}
          {phase === "flash" && (
            <>
              <div className="w-96 h-96 relative" style={{ animation: "chest-fade-after-open 0.8s ease-out forwards" }}>
                <Image src={getImg(selectedChest, "flash")} alt="Fading" fill className="object-contain" />
              </div>
              <div className="fixed inset-0 bg-white z-10 pointer-events-none" style={{ animation: "white-flash 0.8s ease-out forwards" }} />
            </>
          )}

          {/* ── Phase 5: REVEALING (NFT flies in from the light) ── */}
          {phase === "revealing" && revealedLand && (
            <div className="flex flex-col items-center" style={{ animation: "nft-fly-in 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards" }}>
              {/* Radial glow background */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.25)_0%,transparent_70%)] pointer-events-none" />
              {/* Expanding ring */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border-2 border-yellow-400/30 pointer-events-none"
                style={{ animation: "ring-expand 2s ease-out infinite" }} />

              <p className="text-yellow-400 font-bold tracking-widest uppercase mb-4 text-lg" style={{ animation: "rarity-text-in 0.8s ease-out forwards" }}>
                Legendary Drop
              </p>
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-yellow-300 mb-10"
                style={{ filter: "drop-shadow(0 0 25px rgba(253,224,71,0.6))", animation: "rarity-text-in 1s ease-out forwards" }}>
                {revealedLand.name}
              </h1>

              <div className="w-80 h-80 relative mb-10">
                <Image src={`/${revealedLand.size}x${revealedLand.size}land-nobg.png`} alt="Land NFT" fill className="object-contain"
                  style={{ filter: "drop-shadow(0 0 40px rgba(253,224,71,0.8))" }} />
              </div>

              <button onClick={() => { window.location.href = "/farm"; }}
                className="px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(253,224,71,0.5)] relative z-50">
                ENTER VENALAND
              </button>
              <p className="text-xs text-gray-500 font-mono mt-4">
                Tx: {revealedLand.tx.slice(0, 10)}...{revealedLand.tx.slice(-8)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
