"use client";

import React, { useState } from "react";
import { Signal, SignalAction } from "@/lib/types";
import {
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Shield,
  Percent,
  Info,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";
import { SignalDetailModal } from "@/components/signals/SignalDetailModal";

interface SignalOverviewTableProps {
  signals: Signal[];
  onSelectSymbol?: (symbol: string) => void;
}

export function SignalOverviewTable({ signals, onSelectSymbol }: SignalOverviewTableProps) {
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [selectedSignalForModal, setSelectedSignalForModal] = useState<Signal | null>(null);

  const filteredSignals = signals.filter((s) => {
    if (filterAction === "ALL") return true;
    if (filterAction === "BUY_ALL") return s.action === "BUY" || s.action === "STRONG_BUY";
    if (filterAction === "SELL_ALL") return s.action === "SELL" || s.action === "STRONG_SELL";
    return s.action === filterAction;
  });

  const getActionBadge = (action: SignalAction) => {
    switch (action) {
      case "STRONG_BUY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <ArrowUpRight className="w-3.5 h-3.5" />
            STRONG BUY
          </span>
        );
      case "BUY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <ArrowUpRight className="w-3.5 h-3.5" />
            BUY
          </span>
        );
      case "STRONG_SELL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
            <ArrowDownRight className="w-3.5 h-3.5" />
            STRONG SELL
          </span>
        );
      case "SELL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/60">
            <ArrowDownRight className="w-3.5 h-3.5" />
            SELL
          </span>
        );
      case "WATCH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-semibold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            WATCH
          </span>
        );
      case "WAIT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
            WAIT
          </span>
        );
      case "EXIT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-semibold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
            EXIT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-slate-800 text-slate-300">
            HOLD
          </span>
        );
    }
  };

  return (
    <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden">
      {/* Table Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Active Signal Intelligence Overview</h3>
            <p className="text-[11px] text-slate-400">
              Automated algorithmic triggers with calculated entries, stop-loss targets & volume surge confirmation.
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs font-mono">
          <button
            onClick={() => setFilterAction("ALL")}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterAction === "ALL" ? "bg-slate-700 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({signals.length})
          </button>
          <button
            onClick={() => setFilterAction("BUY_ALL")}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterAction === "BUY_ALL" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Buys Only
          </button>
          <button
            onClick={() => setFilterAction("SELL_ALL")}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterAction === "SELL_ALL" ? "bg-rose-500/20 text-rose-300 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sells Only
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Symbol / Stock</th>
              <th className="py-3 px-3">Signal</th>
              <th className="py-3 px-3">Strategy</th>
              <th className="py-3 px-3 text-center">TF</th>
              <th className="py-3 px-3 text-center">Confidence</th>
              <th className="py-3 px-3 text-right">Current Price</th>
              <th className="py-3 px-3 text-right">Entry</th>
              <th className="py-3 px-3 text-right">Target 1</th>
              <th className="py-3 px-3 text-right">Stop Loss</th>
              <th className="py-3 px-3 text-center">R:R</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredSignals.map((signal) => {
              const isBuy = signal.action.includes("BUY");
              return (
                <tr
                  key={signal.id}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  onClick={() => onSelectSymbol && onSelectSymbol(signal.symbol)}
                >
                  {/* Symbol */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs group-hover:text-emerald-400 transition-colors">
                        {signal.symbol}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px] hidden sm:inline">
                        {signal.company_name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">{signal.sector}</div>
                  </td>

                  {/* Signal Badge */}
                  <td className="py-3 px-3">{getActionBadge(signal.action)}</td>

                  {/* Strategy */}
                  <td className="py-3 px-3 font-sans text-slate-300 text-[11px] max-w-[180px] truncate" title={signal.strategy}>
                    {signal.strategy}
                  </td>

                  {/* Timeframe */}
                  <td className="py-3 px-3 text-center">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                      {signal.timeframe}
                    </span>
                  </td>

                  {/* Confidence Score */}
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${signal.confidence_score >= 90 ? "bg-emerald-400" : "bg-cyan-400"}`}
                          style={{ width: `${signal.confidence_score}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-200">{signal.confidence_score}%</span>
                    </div>
                  </td>

                  {/* Current Price */}
                  <td className="py-3 px-3 text-right font-bold text-slate-100">
                    Rs. {signal.current_price.toFixed(2)}
                  </td>

                  {/* Entry Price */}
                  <td className="py-3 px-3 text-right text-slate-300">
                    Rs. {signal.entry_price.toFixed(2)}
                  </td>

                  {/* Target 1 */}
                  <td className="py-3 px-3 text-right">
                    <div className="text-emerald-400 font-semibold">
                      Rs. {signal.target_1.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-500/80">
                      +{signal.potential_gain_percent}%
                    </div>
                  </td>

                  {/* Stop Loss */}
                  <td className="py-3 px-3 text-right">
                    <div className="text-rose-400 font-semibold">
                      Rs. {signal.stop_loss.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-rose-500/80">
                      -{signal.max_loss_percent}%
                    </div>
                  </td>

                  {/* Risk Reward */}
                  <td className="py-3 px-3 text-center">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-semibold">
                      {signal.risk_reward_ratio}:1
                    </span>
                  </td>

                  {/* Action / Catalyst Details */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSignalForModal(signal);
                      }}
                      className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 transition-all"
                    >
                      Thesis
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signal Details Modal / Dialog */}
      {selectedSignalForModal && (
        <SignalDetailModal
          signal={selectedSignalForModal}
          isOpen={!!selectedSignalForModal}
          onClose={() => setSelectedSignalForModal(null)}
        />
      )}
    </div>
  );
}
