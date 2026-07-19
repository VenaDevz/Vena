"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, DollarSign } from "lucide-react";
import {
  EXCHANGE_MIN_CRYSTAL,
  EXCHANGE_MAX_CRYSTAL,
  EXCHANGE_SEASON_END,
  EXCHANGE_SEASON_LABEL,
  exchangeRate,
  formatUsdc,
  previewUsdc,
  quotaRemaining,
} from "../config/farm-exchange";
import { formatCrystal } from "../config/farm-config";

type ExchangeState = {
  seasonId: string;
  totalCrystalSold: number;
  totalUsdcEarned: number;
};

type Props = {
  crystal: number;
  exchange: ExchangeState | null;
  poolLeft: number;
  poolTotal: number;
  onExchange: (crystalAmount: number) => void;
};

const PRESETS = [500, 2_000, 10_000, 50_000];

export default function FarmExchangePanel({
  crystal,
  exchange,
  poolLeft,
  poolTotal,
  onExchange,
}: Props) {
  const [amount, setAmount] = useState(String(EXCHANGE_MIN_CRYSTAL));
  const earned = exchange?.totalUsdcEarned ?? 0;
  const rate = exchangeRate();
  const poolPct = poolTotal > 0 ? (poolLeft / poolTotal) * 100 : 0;
  const quotaLeft = quotaRemaining();

  const crystalIn = useMemo(() => {
    const n = Number(amount.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.floor(n) : 0;
  }, [amount]);

  const usdcOut = previewUsdc(crystalIn);
  const canSwap =
    crystalIn >= EXCHANGE_MIN_CRYSTAL &&
    crystalIn <= EXCHANGE_MAX_CRYSTAL &&
    crystalIn <= crystal &&
    usdcOut > 0 &&
    poolLeft > 0 &&
    quotaLeft >= crystalIn;

  return (
    <div className="farm-bazaar farm-bazaar--exchange">
      <div className="farm-bazaar-awning farm-bazaar-awning--exchange" aria-hidden />

      <div className="farm-bazaar-inner">
        {/* Header */}
        <div className="farm-bazaar-top">
          <div>
            <p className="farm-bazaar-kicker">
              <ArrowRightLeft size={11} strokeWidth={2.25} />
              Fee-Funded Pool
            </p>
            <h3 className="farm-bazaar-title">Crystal Exchange</h3>
          </div>
          <span className="farm-bazaar-badge farm-bazaar-badge--exchange">{EXCHANGE_SEASON_LABEL}</span>
        </div>

        <p className="farm-bazaar-sub">
          Swap Crystal → USDC from the trade-fee pool. Rate floats as the pool depletes — small amounts welcome.
        </p>

        {/* Stats */}
        <div className="farm-bazaar-stats">
          <div className="farm-bazaar-stat">
            <DollarSign size={12} className="text-[#4ade80]" />
            <span>${poolLeft.toFixed(0)} pool left</span>
          </div>
          <div className="farm-bazaar-stat">
            <span className="text-[#00ff88]">💎</span>
            <span>{formatCrystal(crystal)} held</span>
          </div>
          {earned > 0 && (
            <div className="farm-bazaar-stat">
              <span className="text-[#4ade80]">Your swaps: {formatUsdc(earned)}</span>
            </div>
          )}
        </div>

        {/* Pool bar */}
        <div className="farm-vault-pool">
          <div className="farm-vault-pool-top">
            <span className="farm-vault-pool-label">USDC pool</span>
            <span className="farm-vault-pool-value">
              {formatUsdc(poolLeft)}{" "}
              <span className="text-slate-600">/ {formatUsdc(poolTotal)}</span>
            </span>
          </div>
          <div className="farm-vault-pool-bar">
            <div className="farm-vault-pool-fill" style={{ width: `${poolPct}%` }} />
          </div>
          <p className="farm-vault-pool-note">
            Rate: {formatUsdc(rate)}/Crystal · ends {EXCHANGE_SEASON_END}
          </p>
        </div>

        {/* Swap form */}
        <div className="farm-exchange-form">
          <label className="farm-exchange-label">
            Crystal to swap
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))}
              className="farm-exchange-input"
            />
          </label>

          <div className="farm-exchange-presets">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className="farm-exchange-preset"
                onClick={() => setAmount(String(Math.min(p, crystal)))}
              >
                {formatCrystal(p)}
              </button>
            ))}
            <button
              type="button"
              className="farm-exchange-preset"
              onClick={() => setAmount(String(Math.min(crystal, EXCHANGE_MAX_CRYSTAL)))}
            >
              Max
            </button>
          </div>

          <div className="farm-exchange-preview">
            <span>You receive</span>
            <strong className="text-[#4ade80]">{formatUsdc(usdcOut)}</strong>
          </div>

          <button
            type="button"
            className="farm-exchange-btn"
            disabled={!canSwap}
            onClick={() => onExchange(crystalIn)}
          >
            Swap {formatCrystal(crystalIn)} → {formatUsdc(usdcOut)}
          </button>

          <p className="farm-exchange-hint">
            Min {formatCrystal(EXCHANGE_MIN_CRYSTAL)} · max {formatCrystal(EXCHANGE_MAX_CRYSTAL)}/swap ·
            balance {formatCrystal(crystal)}
          </p>
        </div>

        <p className="farm-bazaar-footer">
          Pool topped up from trade fees · live payouts require on-chain verification
        </p>
      </div>
    </div>
  );
}
