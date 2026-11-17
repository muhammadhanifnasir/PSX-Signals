"use client";

import React, { useState, useEffect } from "react";
import { SmartMoneyFlowReport, SectorInstitutionalFlow } from "@/lib/types";
import { api } from "@/lib/api";
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface SmartMoneyFlowWidgetProps {
  onSelectSymbol?: (symbol: string) => void;
}

export function SmartMoneyFlowWidget({ onSelectSymbol }: SmartMoneyFlowWidgetProps) {
  const [report, setReport] = useState<SmartMoneyFlowReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterRegime, setFilterRegime] = useState<string>("ALL");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSmartMoneyFlow();
      setReport(res.data);
    } catch (err) {
      console.warn("Failed to load smart money flows", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // 1-minute auto-refresh
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !report) {
    return (
      <div className="trading-card rounded-xl p-5 border border-slate-800 bg-slate-900/60 animate-pulse space-y-4">
        <div className="h-6 bg-slate-800 rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-16 bg-slate-800/60 rounded"></div>
          <div className="h-16 bg-slate-800/60 rounded"></div>
          <div className="h-16 bg-slate-800/60 rounded"></div>
          <div className="h-16 bg-slate-800/60 rounded"></div>
        </div>
        <div className="h-40 bg-slate-800/40 rounded"></div>
      </div>
    );
  }

  if (!report) return null;

  const fipiPositive = report.market_fipi_net_usd_millions >= 0;
  const mfPositive = report.market_mutual_funds_net_pkr_millions >= 0;
  const smartMoneyPositive = report.market_smart_money_net_pkr_millions >= 0;

  const filteredSectors = report.sector_flows.filter((s) => {
    if (filterRegime === "ALL") return true;
    if (filterRegime === "ACCUMULATION") return s.flow_regime === "INSTITUTIONAL_ACCUMULATION";
    if (filterRegime === "TRAP") return s.retail_trap_detected;
    return true;
  });

  return (
    <div className="trading-card rounded-xl border border-slate-800/90 bg-slate-900/60 p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Smart Money Footprint &amp; Liquidity Flow
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                NCCPL FIPI / LIPI
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Net settlement flow tracking institutional accumulation vs retail positioning across sectors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Updated: {report.timestamp}
          </span>
          <button
            onClick={loadData}
            title="Refresh Smart Money Flow"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        {/* FIPI Net */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>FOREIGN LIQUIDITY (FIPI)</span>
            <span className="text-slate-500">USD Net</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${fipiPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {fipiPositive ? "+" : ""}${report.market_fipi_net_usd_millions.toFixed(2)}M
            </span>
            <span className="text-[10px] text-slate-500">
              ({fipiPositive ? "+" : ""}PKR {report.market_fipi_net_pkr_millions.toFixed(1)}M)
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px]">
            {fipiPositive ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> Foreign Inflow
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3" /> Foreign Outflow
              </span>
            )}
          </div>
        </div>

        {/* Mutual Funds Net */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>DOMESTIC FUNDS (LIPI)</span>
            <span className="text-slate-500">PKR Net</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${mfPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {mfPositive ? "+" : ""}PKR {report.market_mutual_funds_net_pkr_millions.toFixed(1)}M
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px]">
            {mfPositive ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> Funds Buying
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3" /> Funds Offloading
              </span>
            )}
          </div>
        </div>

        {/* Smart Money Combined */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>NET SMART MONEY</span>
            <span className="text-cyan-400 font-bold text-[9px] uppercase">
              {report.institutional_stance}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${smartMoneyPositive ? "text-cyan-400" : "text-amber-400"}`}>
              {smartMoneyPositive ? "+" : ""}PKR {report.market_smart_money_net_pkr_millions.toFixed(1)}M
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
            <span>Dominant: <strong className="text-white">{report.dominant_participant}</strong></span>
          </div>
        </div>

        {/* Retail Positioning */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>RETAIL INDIVIDUALS</span>
            <span className="text-slate-500">Public Net</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${report.market_retail_net_pkr_millions >= 0 ? "text-amber-400" : "text-slate-300"}`}>
              {report.market_retail_net_pkr_millions >= 0 ? "+" : ""}PKR {report.market_retail_net_pkr_millions.toFixed(1)}M
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px]">
            {report.market_retail_net_pkr_millions > 100 && report.market_smart_money_net_pkr_millions < 0 ? (
              <span className="text-rose-400 flex items-center gap-0.5 font-bold">
                <ShieldAlert className="w-3 h-3" /> Distribution Absorption
              </span>
            ) : (
              <span className="text-slate-400">Neutral Public Flow</span>
            )}
          </div>
        </div>
      </div>

      {/* Retail Trap Warning Alert (if any detected) */}
      {report.retail_trap_sectors && report.retail_trap_sectors.length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <strong className="text-rose-300 font-mono tracking-wide">
                RETAIL TRAP ALERT DETECTED
              </strong>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-200 border border-rose-500/30">
                Sectors: {report.retail_trap_sectors.join(", ")}
              </span>
            </div>
            <p className="text-rose-200/90 font-sans">
              Heavy retail individual buying accompanied by simultaneous institutional liquidation (Mutual Funds / FIPI selling). High probability of distribution tops. Avoid initiating unconfirmed longs in these sectors.
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs & Sector Breakdown */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Sector-Level Participant Flows (PKR Millions)
          </h4>
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <button
              onClick={() => setFilterRegime("ALL")}
              className={`px-2.5 py-1 rounded-md transition ${
                filterRegime === "ALL"
                  ? "bg-slate-700 text-white font-bold"
                  : "bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              All Sectors
            </button>
            <button
              onClick={() => setFilterRegime("ACCUMULATION")}
              className={`px-2.5 py-1 rounded-md transition ${
                filterRegime === "ACCUMULATION"
                  ? "bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40"
                  : "bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              Accumulation Only
            </button>
            <button
              onClick={() => setFilterRegime("TRAP")}
              className={`px-2.5 py-1 rounded-md transition ${
                filterRegime === "TRAP"
                  ? "bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40"
                  : "bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              Retail Traps
            </button>
          </div>
        </div>

        {/* Sector Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase bg-slate-900/60">
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3 text-right">FIPI Net</th>
                <th className="py-2.5 px-3 text-right">Mutual Funds</th>
                <th className="py-2.5 px-3 text-right">Banks</th>
                <th className="py-2.5 px-3 text-right">Retail Net</th>
                <th className="py-2.5 px-3 text-right">Smart Money</th>
                <th className="py-2.5 px-3">Institutional Regime</th>
                <th className="py-2.5 px-3">Top Targets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSectors.map((sector) => {
                const isAccum = sector.flow_regime === "INSTITUTIONAL_ACCUMULATION";
                const isTrap = sector.retail_trap_detected;

                return (
                  <tr
                    key={sector.sector}
                    className={`hover:bg-slate-900/50 transition ${
                      isTrap ? "bg-rose-500/5" : isAccum ? "bg-emerald-500/5" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans font-semibold text-white whitespace-nowrap">
                      {sector.sector}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${sector.fipi_net_pkr_millions >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {sector.fipi_net_pkr_millions >= 0 ? "+" : ""}
                      {sector.fipi_net_pkr_millions.toFixed(1)}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${sector.mutual_funds_net_pkr_millions >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {sector.mutual_funds_net_pkr_millions >= 0 ? "+" : ""}
                      {sector.mutual_funds_net_pkr_millions.toFixed(1)}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${sector.banks_net_pkr_millions >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {sector.banks_net_pkr_millions >= 0 ? "+" : ""}
                      {sector.banks_net_pkr_millions.toFixed(1)}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${sector.retail_individuals_net_pkr_millions >= 0 ? "text-amber-400" : "text-slate-400"}`}>
                      {sector.retail_individuals_net_pkr_millions >= 0 ? "+" : ""}
                      {sector.retail_individuals_net_pkr_millions.toFixed(1)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${sector.smart_money_net_pkr_millions >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
                      {sector.smart_money_net_pkr_millions >= 0 ? "+" : ""}
                      {sector.smart_money_net_pkr_millions.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isTrap ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          RETAIL TRAP
                        </span>
                      ) : isAccum ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          ACCUMULATION
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                          NEUTRAL / ROTATION
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {sector.top_institutional_targets.map((tgt) => (
                          <button
                            key={tgt}
                            onClick={() => onSelectSymbol && onSelectSymbol(tgt)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/40 transition"
                          >
                            {tgt}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
