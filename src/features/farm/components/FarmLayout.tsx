"use client";

import "../farm.css";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { Share2, X, Bot, Flame, Timer, Hexagon, ArrowRight, Zap, Store, Target, Trophy, LayoutGrid, Package } from "lucide-react";
import { FARM_DEMO_MODE, FARM_DEMO_START_CRYSTAL, FARM_GRID_TIERS, formatCrystal } from "../config/farm-config";
import { useFarmGame } from "../hooks/useFarmGame";
import FarmHeader from "./FarmHeader";
import FarmGate from "./FarmGate";
import FarmWorld from "./FarmWorld";
import FarmBuildModal from "./FarmBuildModal";
import FarmManageModal from "./FarmManageModal";
import FarmQuestPanel from "./FarmQuestPanel";
import FarmLeaderboard from "./FarmLeaderboard";
import FarmExchangePanel from "./FarmExchangePanel";
import FarmDailyCachePanel from "./FarmDailyCachePanel";
import FarmSeasonPanel from "./FarmSeasonPanel";
import FarmTutorial from "./FarmTutorial";
import FarmBazaarModal from "./FarmBazaarModal";
import FarmCommandCenterModal from "./FarmCommandCenterModal";
import FarmObeliskModal from "./FarmObeliskModal";
import FarmDecryptorModal from "./FarmDecryptorModal";
import FarmGuideModal from "./FarmGuideModal";

export default function FarmLayout() {
  const { address } = useAccount();
  const game = useFarmGame();
  const [buildCell, setBuildCell] = useState<number | null>(null);
  const [manageCell, setManageCell] = useState<number | null>(null);
  const [showExpand, setShowExpand] = useState(false);
  const [showBazaar, setShowBazaar] = useState(false);
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [showObelisk, setShowObelisk] = useState(false);
  const [showDecryptor, setShowDecryptor] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isPayoutPending, setIsPayoutPending] = useState(false);
  const [payoutTx, setPayoutTx] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [hasFreeSpin, setHasFreeSpin] = useState(false);
  const [countdownText, setCountdownText] = useState("24:00:00");
  const [speechText, setSpeechText] = useState("");
  const [speechVisible, setSpeechVisible] = useState(false);

  const COMMANDER_PHRASES = [
    "MOVE IT, TROOPS!",
    "DOUBLE TIME!",
    "SPEED IT UP!",
    "WE NEED MORE CRYSTALS!",
    "LET'S GO, LET'S GO!",
    "FASTER!",
    "RALLY THE CREW!"
  ];

  const handleCommanderClick = () => {
    if (!rallyActive) return;
    setSpeechText(COMMANDER_PHRASES[Math.floor(Math.random() * COMMANDER_PHRASES.length)]);
    setSpeechVisible(true);
    setTimeout(() => setSpeechVisible(false), 2500);
  };

  const {
    state,
    rate,
    rateMultiplier,
    vpickCount,
    vpickTier,
    vpickBonusPct,
    balanceVena,
    venaLoading,
    isConnected,
    hasAccess,
    offlineBanner,
    dismissOffline,
    buildOnCell,
    demolishCell,
    replaceCell,
    upgradeCell,
    buyMarketItem,
    buildError,
    isPaying,
    pendingCell,
    isDemoMode,
    rallyCommander,
    rallyActive,
    rallyOnCooldown,
    rallyRemaining,
    rallyCooldownRemaining,
    rallyBoost,
    expandBase,
    quests,
    streakCount,
    strMult,
    claimQuest,
    primeCrystal,
    powerCores,
    coreMult,
    nextCoreCost: nextCore,
    forgePowerCore,
    powerCoreMax,
    exchange,
    exchangePoolLeft,
    exchangePoolTotal,
    exchangeCrystal,
    hasPickaxe,
    pickaxeRequired,
    fillTrade,
    tutorialStep,
    tutorialDone,
    dismissTutorial,
    skipTutorial,
    claimDailyCache,
    dailyCacheAvailable,
    dailyCachePreview,
    cacheCountdownMs,
    totalCrystalProduced,
    tradesFilled,
    gridTier,
    builtPlots,
    claimDecryptorReward,
    decryptorFreeSpinAt,
  } = game;

  useEffect(() => {
    const updateCountdown = () => {
      const diff = decryptorFreeSpinAt - Date.now();
      if (diff <= 0) {
        setHasFreeSpin(true);
      } else {
        setHasFreeSpin(false);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdownText(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [decryptorFreeSpinAt]);

  const cosmetics = state?.cosmetics ?? [];
  const neonBorder = cosmetics.includes("neon_border");
  const sparkFx = cosmetics.includes("spark_fx");
  const founderFrame = cosmetics.includes("founder_frame");

  const shareOnX = () => {
    if (!state) return;
    const built = state.cells.filter((c) => c.buildingId).length;
    const plots =
      FARM_GRID_TIERS.find((t) => t.tier === (state.gridTier ?? 1))?.plots ?? state.cells.length;
    const text = `My VENA Command Base ⚡ ${built}/${plots} plots · ${formatCrystal(state.crystal)} CRYSTAL · +${rate.toFixed(1)}/s\n\nBuild yours → ${typeof window !== "undefined" ? window.location.origin : ""}/farm`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const gated = !hasAccess || !state;

  return (
    <div className="farm-root flex min-h-screen flex-col">
      <FarmHeader
        crystal={state?.crystal ?? 0}
        rate={rate}
        primeCrystal={primeCrystal}
        balanceVena={balanceVena}
        isConnected={isConnected}
        rallyActive={rallyActive}
        rallyRemaining={rallyRemaining}
        rallyOnCooldown={rallyOnCooldown}
        rallyCooldownRemaining={rallyCooldownRemaining}
        rallyBoost={rallyBoost}
        rallyCommander={rallyCommander}
        powerCores={powerCores}
        powerCoreMax={powerCoreMax}
        nextCoreCost={nextCore}
        forgePowerCore={forgePowerCore}
        resources={state?.resources}
      />

      {gated ? (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
          <FarmGate
            isConnected={isConnected}
            hasAccess={hasAccess}
            hasPickaxe={hasPickaxe}
            pickaxeRequired={pickaxeRequired}
            balanceVena={balanceVena}
            venaLoading={venaLoading}
          />
        </main>
      ) : (
        <main className="farm-main-split">

          {/* ── Left: full-bleed world ── */}
          <section className="farm-world-section relative">
            <FarmWorld
              state={state}
              rate={rate}
              vpickCount={vpickCount}
              vpickBonusPct={vpickBonusPct}
              neonBorder={neonBorder}
              sparkFx={sparkFx}
              founderFrame={founderFrame}
              pendingCell={pendingCell}
              onCellClick={setBuildCell}
              onManageCell={setManageCell}
              onExpandClick={() => setShowExpand(true)}
              rallyActive={rallyActive}
              onOpenBazaar={() => setShowBazaar(true)}
              onOpenCommandCenter={() => setShowCommandCenter(true)}
              onOpenObelisk={() => setShowObelisk(true)}
            />



            {/* ── Commander Floating HUD ── */}
            <div className="farm-commander-hud-float flex flex-col items-center" style={{ top: "12px", right: "-60px" }}>
              <div className="farm-side-card farm-commander-card" style={{ padding: "0", width: "330px", background: "transparent", border: "none", boxShadow: "none" }}>
                <p className="farm-side-card-title farm-side-card-title-icon text-center justify-center w-full" style={{ fontSize: "14px", marginBottom: "8px", fontFamily: "Futura, sans-serif", fontWeight: 300, textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
                  <Bot size={14} strokeWidth={2.25} />
                  Commander
                </p>

                {/* ── Commander Image ── */}
                <button 
                  type="button"
                  onClick={handleCommanderClick}
                  className={`relative farm-commander-stage ${rallyActive ? "farm-commander-stage-on" : ""} ${powerCores >= 6 ? "farm-commander-stage-max" : powerCores >= 3 ? "farm-commander-stage-mid" : ""} hover:scale-105 transition-transform cursor-pointer`} 
                  style={{ padding: "0", overflow: "visible", border: "none", background: "transparent", height: "330px" }}
                >
                  {speechVisible && (
                    <div className="absolute top-10 -left-6 bg-white text-black font-mono text-[11px] font-black px-3 py-2 rounded border-[3px] border-black z-50 shadow-[4px_4px_0_rgba(0,0,0,0.5)] animate-bounce whitespace-nowrap" style={{ imageRendering: "pixelated" }}>
                      {speechText}
                      <div className="absolute top-full right-6 w-0 h-0 border-t-[8px] border-t-black border-x-[6px] border-x-transparent border-b-0 -mb-[3px]" />
                      <div className="absolute top-full right-6 w-0 h-0 border-t-[6px] border-t-white border-x-[4px] border-x-transparent border-b-0 -mt-[1px]" />
                    </div>
                  )}
                  <Image
                    src={`/miner/robot-${vpickTier && ["gold", "platinum", "diamond", "emerald"].includes(vpickTier) ? vpickTier : "silver"}.png`}
                    alt={`VENA Commander (${vpickTier || "Silver"})`}
                    width={330}
                    height={330}
                    className="farm-commander-robot drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
                    style={{ width: "auto", height: "330px", margin: "0 auto", bottom: "-10px", transform: "translateX(30px)" }}
                    priority
                  />
                </button>
              </div> {/* End Commander Card */}
            </div> {/* End Commander HUD Float */}

            {/* Orbital Chest Button (Moved to bottom right, next to the central HUD) */}
            <div className="absolute z-50 transition-all hover:scale-110 hover:drop-shadow-[0_0_30px_rgba(0,212,255,0.8)] group" style={{ bottom: '20px', left: 'calc(50% + 280px)', width: '220px', height: '180px' }}>
              <button
                type="button"
                onClick={() => setShowDecryptor(true)}
                className="relative w-full h-full flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-cyan-500/10 blur-[40px] group-hover:bg-cyan-400/20 transition-all rounded-full z-0"></div>
                <Image 
                  src="/farm/orbital-chest.png" 
                  alt="Orbital Chest" 
                  fill 
                  className="object-contain group-hover:brightness-125 transition-all drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] z-10" 
                />
                {hasFreeSpin ? (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00ff88] text-black text-[11px] font-black px-3 py-1.5 rounded-full shadow-[0_0_15px_#00ff88] z-20 animate-bounce border-2 border-green-900 whitespace-nowrap">
                    FREE OPEN
                  </span>
                ) : (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-[#00d4ff] text-[11px] font-mono font-bold px-3 py-1.5 rounded-full shadow-[0_0_10px_#00d4ff88] z-20 border border-[#00d4ff] whitespace-nowrap">
                    {countdownText}
                  </span>
                )}
              </button>
            </div>

            {/* Toasts */}
            <div className="farm-overlay-top">
              {/* Removed demo banner */}
              {offlineBanner && (
                <div className="farm-offline-toast">
                  <div>
                    <p className="text-sm font-semibold text-[#00ff88]">While you were away</p>
                    <p className="mt-0.5 text-xs text-slate-300">
                      +{formatCrystal(offlineBanner.gained)} CRYSTAL ({offlineBanner.hoursAway.toFixed(1)}h, max 8h)
                    </p>
                  </div>
                  <button type="button" onClick={dismissOffline} className="text-slate-400 hover:text-white" aria-label="Dismiss">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom-left actions */}
            <div className="farm-overlay-actions">
              <button
                type="button"
                onClick={shareOnX}
                className="farm-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider"
              >
                <Share2 size={14} />
                Share
              </button>
              <a href="/miner" className="farm-btn-primary px-4 py-2 text-xs uppercase tracking-wider">
                Real $VENA mining →
              </a>
            </div>

            {buildError && <p className="farm-error-toast">{buildError}</p>}
          </section>
        </main>
      )}

      {buildCell !== null && state && (
        <FarmBuildModal
          cellIndex={buildCell}
          onClose={() => setBuildCell(null)}
          onBuild={(id) => {
            buildOnCell(buildCell, id);
            setBuildCell(null);
          }}
          isPaying={isPaying}
          balanceVena={balanceVena}
        />
      )}

      {manageCell !== null && state?.cells[manageCell]?.buildingId && (
        <FarmManageModal
          cellIndex={manageCell}
          currentBuildingId={state.cells[manageCell].buildingId!}
          currentLevel={state.cells[manageCell].level ?? 1}
          crystal={state.crystal}
          resources={state.resources}
          balanceVena={balanceVena}
          isPaying={isPaying}
          onClose={() => setManageCell(null)}
          onDemolish={() => {
            demolishCell(manageCell);
            setManageCell(null);
          }}
          onUpgrade={() => upgradeCell(manageCell)}
          onReplace={(id) => {
            replaceCell(manageCell, id);
            setManageCell(null);
          }}
        />
      )}

      {showExpand && state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal>
          <div className="farm-panel w-full max-w-sm p-5 sm:rounded-xl bg-[rgba(10,14,20,0.95)] backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">VenaLand</p>
                <h2 className="text-base font-bold text-white">Expand Your Base</h2>
              </div>
              <button type="button" onClick={() => setShowExpand(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            {/* Removed demo expansion note */}
            <ul className="space-y-3">
              {FARM_GRID_TIERS.map((tier) => {
                const currentTier = state.gridTier ?? 1;
                const isCurrent = tier.tier === currentTier;
                const isUnlocked = tier.tier < currentTier;
                const canUnlock = tier.tier === currentTier + 1;
                const hasVena = isDemoMode || balanceVena >= tier.holdVena;
                const hasCrystal = isDemoMode || state.crystal >= tier.costCrystal;
                const canExpand = isDemoMode ? !isCurrent && !isUnlocked : (canUnlock && hasVena && hasCrystal);
                return (
                  <li key={tier.tier} className={`rounded-xl border p-3 transition-colors ${
                    isCurrent ? "border-[#00ff88]/40 bg-[#00ff88]/6" :
                    isUnlocked ? "border-white/20 bg-white/4" :
                    canUnlock || isDemoMode ? "border-[#00d4ff]/30 bg-white/3" : "border-white/6 opacity-50"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{tier.label} Grid — {tier.plots} plots</p>
                        <>
                          {tier.costVena > 0 && (
                            <p className={`text-[10px] mt-0.5 ${hasVena ? "text-[#00d4ff]" : "text-red-400"}`}>
                              {tier.costVena.toLocaleString("en-US")} VENA {isDemoMode && <span className="ml-1 text-slate-500 line-through">(FREE)</span>}
                            </p>
                          )}
                          {tier.costCrystal > 0 && (
                            <p className={`text-[10px] ${hasCrystal ? "text-[#00ff88]" : "text-red-400"}`}>
                              💎 {tier.costCrystal.toLocaleString("en-US")} CRYSTAL {isDemoMode && <span className="ml-1 text-slate-500 line-through">(FREE)</span>}
                            </p>
                          )}
                        </>
                      </div>
                      {isCurrent ? (
                        <span className="shrink-0 rounded-full bg-[#00ff88]/15 border border-[#00ff88]/40 px-2 py-0.5 text-[10px] font-bold text-[#00ff88]">Active</span>
                      ) : isUnlocked ? (
                        <button
                          type="button"
                          className="farm-btn-primary shrink-0 px-3 py-1.5 text-[11px] font-bold"
                          onClick={() => { expandBase(tier.tier as 1|2|3|4); setShowExpand(false); }}
                        >
                          Switch
                        </button>
                      ) : canExpand ? (
                        <button
                          type="button"
                          className="farm-btn-primary shrink-0 px-3 py-1.5 text-[11px] font-bold"
                          onClick={() => { expandBase(tier.tier as 1|2|3|4); setShowExpand(false); }}
                        >
                          Expand
                        </button>
                      ) : (
                        <span className="shrink-0 text-[10px] text-slate-600">🔒 Locked</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {!gated && !tutorialDone && (
        <FarmTutorial
          step={tutorialStep}
          onNext={dismissTutorial}
          onSkip={skipTutorial}
        />
      )}

      {showBazaar && state && (
        <FarmBazaarModal
          crystal={state.crystal}
          resources={state.resources}
          balanceVena={balanceVena}
          owned={cosmetics}
          isPaying={isPaying}
          isDemoMode={isDemoMode}
          tradesFilled={tradesFilled}
          onFill={fillTrade}
          onBuy={buyMarketItem}
          onClose={() => setShowBazaar(false)}
        />
      )}
      {showCommandCenter && state && (
        <FarmCommandCenterModal
          onClose={() => setShowCommandCenter(false)}
          dailyCacheAvailable={dailyCacheAvailable}
          dailyCachePreview={dailyCachePreview}
          cacheCountdownMs={cacheCountdownMs}
          vpickTier={vpickTier}
          onClaimCache={claimDailyCache}
          quests={quests}
          streakCount={streakCount}
          strMult={strMult}
          onClaimQuest={claimQuest}
        />
      )}

      {showObelisk && state && (
        <FarmObeliskModal
          onClose={() => setShowObelisk(false)}
          primeCrystal={primeCrystal}
          totalCrystalProduced={totalCrystalProduced}
          gridTier={gridTier}
          builtPlots={builtPlots}
          streakCount={streakCount}
          address={address}
          crystal={state.crystal}
          exchange={exchange}
          exchangePoolLeft={exchangePoolLeft}
          exchangePoolTotal={exchangePoolTotal}
          tradesFilled={tradesFilled}
          onExchangeCrystal={exchangeCrystal}
        />
      )}

      {showDecryptor && state && (
        <FarmDecryptorModal
          onClose={() => setShowDecryptor(false)}
          crystal={state.crystal}
          hasFreeSpin={hasFreeSpin}
          countdownText={countdownText}
          onReward={(reward: any) => {
            if (hasFreeSpin && !reward.isPaid) {
              setHasFreeSpin(false);
            }
            
            // This unified method now safely updates both the resource and the 24h timer in one atomic state update
            claimDecryptorReward(reward);
            
            if (reward.type === "vena") {
              setPayoutTx(reward.txHash || "secured");
            }
          }}
        />
      )}

      {/* Payout Status Overlay */}
      {(isPayoutPending || payoutTx || payoutError) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-2xl max-w-md w-full flex flex-col items-center text-center shadow-2xl">
            {isPayoutPending && (
              <>
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Processing Payout...</h3>
                <p className="text-slate-400 text-sm">Securely transferring $VENA to your Robinhood Wallet. Please wait.</p>
              </>
            )}
            {payoutTx && (
              <>
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4">
                  <Share2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Payout Successful!</h3>
                <p className="text-slate-400 text-sm mb-4">Your VENA tokens have been sent.</p>
                <div className="bg-slate-800/50 p-3 rounded-lg w-full mb-6 break-all">
                  <span className="text-xs text-slate-500 block mb-1">Transaction Hash</span>
                  <span className="text-sm font-mono text-green-400">{payoutTx}</span>
                </div>
                <button onClick={() => setPayoutTx(null)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors">
                  Close
                </button>
              </>
            )}
            {payoutError && (
              <>
                <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Payout Failed</h3>
                <p className="text-red-400 text-sm mb-6">{payoutError}</p>
                <button onClick={() => setPayoutError(null)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors">
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
