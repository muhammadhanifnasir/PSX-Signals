"use client";

import React, { useState } from "react";
import { Signal, SignalLifecycleStatus } from "@/lib/types";
import { api } from "@/lib/api";
import {
  X,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Target,
  Shield,
  Zap,
  TrendingUp,
  Clock,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Sliders,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { formatNumber, formatPercent } from "@/lib/utils";
import { InstitutionalExecutionModal } from "@/components/trading/InstitutionalExecutionModal";

interface SignalDetailModalProps {
  signal: Signal | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (signalId: string, newStatus: string) => void;
}

export function SignalDetailModal({
  signal,
  isOpen,
  onClose,
  onStatusUpdated,
}: SignalDetailModalProps) {
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [showExecutionTerminal, setShowExecutionTerminal] = useState(false);

  if (!isOpen || !signal) return null;

  const score = signal.opportunity_score ?? signal.confidence_score;
  const conds = signal.conditions_met || {
    price_above_vwap: (signal.current_price || 0) >= (signal.vwap || 0),
    ema_alignment: (signal.ema_9 || 0) >= (signal.ema_21 || 0),
    breakout_or_pullback: true,
    rvol_confirmation: (signal.relative_volume || 1) >= 1.3,
    rsi_momentum: signal.rsi_14 >= 48 && signal.rsi_14 <= 75,
    adequate_liquidity: true,
    acceptable_vwap_distance: (signal.vwap_distance_pct || 0) <= 3.5,
    acceptable_risk_reward: signal.risk_reward_ratio >= 1.8,
    fresh_and_validated_data: !(signal.is_stale ?? false),
  };

  const breakdown = signal.score_breakdown || {
    momentum_score: Math.min(25, Math.round(score * 0.25)),
    volume_score: Math.min(25, Math.round(score * 0.25)),
    vwap_ema_score: Math.min(25, Math.round(score * 0.25)),
    setup_rr_score: Math.min(25, Math.round(score * 0.25)),
    penalty_deduction: 0,
    total_score: score,
  };

  const copyOrderSetup = () => {
    const text = `PSX SCSTrade Order Setup:
Symbol: ${signal.symbol}
Compliance: ${signal.regulatory_category || (signal.is_defaulter ? "DEFAULTER" : signal.is_shariah_compliant ? "KMI SHARIAH" : "MAINBOARD")}
Strategy: ${signal.strategy} (${signal.strategy_version || "1.0.0"})
Action: ${signal.action}
Entry Price: Rs. ${signal.entry_price.toFixed(2)}
Entry Zone: Rs. [${(signal.entry_zone_low || signal.entry_price * 0.99).toFixed(2)} - ${(signal.entry_zone_high || signal.entry_price * 1.01).toFixed(2)}]
Stop-Loss: Rs. ${signal.stop_loss.toFixed(2)} (-${signal.max_loss_percent.toFixed(1)}%)
Target 1: Rs. ${signal.target_1.toFixed(2)} (+${signal.potential_gain_percent.toFixed(1)}%)
Target 2: Rs. ${signal.target_2.toFixed(2)}
Upper Circuit Limit: Rs. ${signal.circuit_breaker_upper?.toFixed(2) || "N/A"}
Lower Circuit Limit: Rs. ${signal.circuit_breaker_lower?.toFixed(2) || "N/A"}
Risk:Reward: 1 : ${signal.risk_reward_ratio}
Opportunity Score: ${score}/100`;
    navigator.clipboard.writeText(text);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2200);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await api.updateSignalStatus(
        signal.id,
        newStatus,
        statusNote || `Trader marked as ${newStatus}`
      );
      if (res.success && onStatusUpdated) {
        onStatusUpdated(signal.id, newStatus);
      }
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setIsUpdatingStatus(false);
      setStatusNote("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="trading-card rounded-2xl border border-slate-700 bg-slate-900 w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold font-mono text-white">
                  {signal.symbol}
                </span>
                {signal.is_defaulter ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/25 text-rose-300 border border-rose-500/40">
                    DEFAULTER
                  </span>
                ) : signal.is_non_compliant ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                    NON-COMPLIANT
                  </span>
                ) : signal.is_shariah_compliant ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    KMI SHARIAH
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                    MAINBOARD
                  </span>
                )}
                <span className="text-xs text-slate-400 font-sans">
                  {signal.company_name}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {signal.signal_type || signal.action}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                <span>{signal.sector}</span>
                <span>•</span>
                <span>{signal.strategy} v{signal.strategy_version || "1.0.0"}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto font-sans">
          {/* Circuit Lock & Risk Alert Banners */}
          {signal.circuit_status === "LOCKED_UPPER" && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-rose-300 block">
                  Upper Circuit Locked (+7.5% / PKR 1.00 Limit)
                </span>
                <p className="text-rose-200/80 mt-0.5">
                  The equity is pinned at the daily upper circuit band with zero ask depth. Orders cannot be filled in the regular market session. The engine has systematically suppressed actionable BUY signals to WATCH.
                </p>
              </div>
            </div>
          )}

          {signal.circuit_status === "CAP_DANGER" && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-300 block">
                  Circuit Cap Proximity Warning (&lt;1.2% Headroom)
                </span>
                <p className="text-amber-200/80 mt-0.5">
                  Current price is within 1.2% of the daily circuit cap. Entering at this level carries severe risk of upper ceiling rejection or freeze. Wait for consolidation or intraday retrace.
                </p>
              </div>
            </div>
          )}

          {/* PSX Microstructure Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 block">UPPER CIRCUIT (+7.5%)</span>
              <span className="font-bold text-emerald-400">
                Rs. {signal.circuit_breaker_upper?.toFixed(2) || (signal.current_price * 1.075).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">LOWER CIRCUIT (-7.5%)</span>
              <span className="font-bold text-rose-400">
                Rs. {signal.circuit_breaker_lower?.toFixed(2) || (signal.current_price * 0.925).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">CAP HEADROOM</span>
              <span className={`font-bold ${signal.circuit_status === "LOCKED_UPPER" ? "text-rose-400" : (signal.cap_distance_pct ?? 10) <= 1.2 ? "text-amber-400" : "text-slate-200"}`}>
                {signal.cap_distance_pct !== undefined ? `${signal.cap_distance_pct.toFixed(2)}%` : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">CIRCUIT STATUS</span>
              <span className="font-bold text-slate-200">
                {signal.circuit_status || "NORMAL"}
              </span>
            </div>
          </div>
          {/* Key Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">CURRENT PRICE</span>
              <span className="text-base font-bold text-white">
                Rs. {signal.current_price.toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">RECOMMENDED ENTRY</span>
              <span className="text-base font-bold text-emerald-400">
                Rs. {signal.entry_price.toFixed(2)}
              </span>
              {signal.entry_zone_low && signal.entry_zone_high && (
                <span className="text-[9.5px] text-slate-400 block">
                  [{signal.entry_zone_low.toFixed(1)} - {signal.entry_zone_high.toFixed(1)}]
                </span>
              )}
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">STOP-LOSS LEVEL</span>
              <span className="text-base font-bold text-rose-400">
                Rs. {signal.stop_loss.toFixed(2)}
              </span>
              <span className="text-[9.5px] text-rose-400/80 block">
                -{signal.max_loss_percent.toFixed(1)}% Max Risk
              </span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">TARGET 1 (R:R 1:{signal.risk_reward_ratio})</span>
              <span className="text-base font-bold text-emerald-300">
                Rs. {signal.target_1.toFixed(2)}
              </span>
              <span className="text-[9.5px] text-emerald-400/80 block">
                +{signal.potential_gain_percent.toFixed(1)}% Gain (T2: {signal.target_2.toFixed(1)})
              </span>
            </div>
          </div>

          {/* 9-Condition Algorithmic Checklist */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 font-mono">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                9-Confluence Algorithmic Rules Verification
              </h4>
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {Object.values(conds).filter(Boolean).length} / 9 Conditions Met
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="text-slate-300">1. Price strictly above VWAP</span>
                {conds.price_above_vwap ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="text-slate-300">2. EMA 9 &gt; EMA 21 Trend</span>
                {conds.ema_alignment ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="text-slate-300">3. Confirmed Breakout / Pullback</span>
                {conds.breakout_or_pullback ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="text-slate-300">4. RVOL Surge (&ge; 1.3x)</span>
                {conds.rvol_confirmation ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="text-slate-300">5. RSI Momentum (48 - 75)</span>
                {conds.rsi_momentum ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="text-slate-300">6. Liquidity (&gt;100k shares &gt;2M PKR)</span>
                {conds.adequate_liquidity ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="text-slate-300">7. Distance to VWAP (&le; 3.5%)</span>
                {conds.acceptable_vwap_distance ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="text-slate-300">8. Risk-to-Reward (&ge; 1.8)</span>
                {conds.acceptable_risk_reward ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/80 sm:col-span-2">
                <span className="text-slate-300">9. Fresh &amp; Non-stale Data (&le; 1800s)</span>
                {conds.fresh_and_validated_data ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                    <CheckCircle2 className="w-4 h-4" /> Validated ({signal.data_delay_type || "DELAYED_15MIN"})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                    <XCircle className="w-4 h-4" /> Stale / Rejected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quantitative Opportunity Score Breakdown */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Opportunity Score Breakdown (Total: {breakdown.total_score}/100)
              </h4>
              <span className="text-[10px] text-slate-400 font-sans">
                Algorithmic Quantitative Weighting
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-sans">MOMENTUM</span>
                <span className="font-bold text-white text-sm">+{breakdown.momentum_score} / 25</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-sans">VOLUME SURGE</span>
                <span className="font-bold text-white text-sm">+{breakdown.volume_score} / 25</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-sans">VWAP &amp; EMA</span>
                <span className="font-bold text-white text-sm">+{breakdown.vwap_ema_score} / 25</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-sans">SETUP &amp; R:R</span>
                <span className="font-bold text-white text-sm">+{breakdown.setup_rr_score} / 25</span>
              </div>
            </div>
          </div>

          {/* Signal Lifecycle Status Updater */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 font-sans text-xs">
            <h4 className="font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Signal Status Lifecycle Management
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">Current Status:</span>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                {signal.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {(["TARGET_1_HIT", "TARGET_2_HIT", "STOPPED_OUT", "EXPIRED", "INVALIDATED", "ACTIVE"] as const).map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(st)}
                    disabled={isUpdatingStatus || signal.status === st}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition-all ${
                      signal.status === st
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700"
                    }`}
                  >
                    Mark {st.replace(/_/g, " ")}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Regulatory Disclaimer */}
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11.5px] text-purple-200/90 leading-relaxed">
            <strong className="text-purple-100">Algorithmic Advisory Notice:</strong> Opportunity
            score is a mathematical composite of momentum, intraday volume expansion, and risk/reward
            asymmetry. It does not represent a guaranteed win-rate or profit certainty. Always enforce
            strict stop-loss discipline on SCSTrade.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-800 bg-slate-950/90 font-sans">
          <Link
            href={`/stock-analysis?symbol=${signal.symbol}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Stock Analysis
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExecutionTerminal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm shadow-indigo-900/40"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-200" />
              Institutional Execution Terminal
            </button>
            <button
              onClick={copyOrderSetup}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              {copiedOrder ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  Copied SCSTrade Setup!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy SCSTrade Order
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Execution & Slippage Modal */}
      <InstitutionalExecutionModal
        isOpen={showExecutionTerminal}
        onClose={() => setShowExecutionTerminal(false)}
        symbol={signal.symbol}
        defaultPrice={signal.current_price}
        defaultAction={signal.action === "BUY" || signal.action === "STRONG_BUY" ? "BUY" : "SELL"}
        defaultStopLoss={signal.stop_loss}
        defaultTarget={signal.target_1}
        isUpperLocked={signal.circuit_status === "LOCKED_UPPER"}
        isDefaulter={signal.is_defaulter}
        isNonCompliant={signal.is_non_compliant}
      />
    </div>
  );
}
