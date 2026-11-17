"use client";

import React, { useState, useEffect } from "react";
import { CorporateActionsCalendarReport, CorporateActionItem } from "@/lib/types";
import { api } from "@/lib/api";
import {
  CalendarDays,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

interface CorporateActionsWidgetProps {
  onSelectSymbol?: (symbol: string) => void;
}

export function CorporateActionsWidget({ onSelectSymbol }: CorporateActionsWidgetProps) {
  const [calendar, setCalendar] = useState<CorporateActionsCalendarReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>("ALL");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getCorporateCalendar();
      setCalendar(res.data);
    } catch (err) {
      console.warn("Failed to load corporate calendar", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !calendar) {
    return (
      <div className="trading-card rounded-xl p-5 border border-slate-800 bg-slate-900/60 animate-pulse space-y-4">
        <div className="h-6 bg-slate-800 rounded w-1/3"></div>
        <div className="h-20 bg-slate-800/60 rounded"></div>
        <div className="h-40 bg-slate-800/40 rounded"></div>
      </div>
    );
  }

  if (!calendar) return null;

  const filteredEvents = calendar.events.filter((ev) => {
    if (filterType === "ALL") return true;
    if (filterType === "HIGH_RISK") return ev.is_high_risk_window;
    if (filterType === "RESULTS") return ev.event_type === "FINANCIAL_RESULTS" || ev.event_type === "BOARD_MEETING";
    if (filterType === "DIVIDEND") return ev.event_type === "BOOK_CLOSURE" || ev.event_type === "DIVIDEND";
    return true;
  });

  return (
    <div className="trading-card rounded-xl border border-slate-800/90 bg-slate-900/60 p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Corporate Actions &amp; Earnings Catalyst Calendar
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                48h Event Risk Filter
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Board meetings, EPS disclosures, and dividend book closures with institutional volatility precautions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Total Upcoming: {calendar.total_upcoming_events}
          </span>
          <button
            onClick={loadData}
            title="Refresh Corporate Calendar"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* High-Risk Warning Alert Banner */}
      {calendar.high_risk_events_count > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <strong className="text-amber-300 font-mono tracking-wide">
                {calendar.high_risk_events_count} HIGH-EVENT-RISK CATALYST(S) WITHIN 48 HOURS
              </strong>
            </div>
            <p className="text-amber-200/90 font-sans">
              Holding equities into binary corporate actions (Board meetings, financial disclosures) entails severe gap risk. The institutional playbook mandates halving position size to 50% or trailing stops to breakeven before market close.
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-mono text-slate-400">
          Showing <strong className="text-white">{filteredEvents.length}</strong> events
        </span>
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-2.5 py-1 rounded-md transition ${
              filterType === "ALL"
                ? "bg-slate-700 text-white font-bold"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilterType("HIGH_RISK")}
            className={`px-2.5 py-1 rounded-md transition ${
              filterType === "HIGH_RISK"
                ? "bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            High Risk (&lt;48h)
          </button>
          <button
            onClick={() => setFilterType("RESULTS")}
            className={`px-2.5 py-1 rounded-md transition ${
              filterType === "RESULTS"
                ? "bg-purple-500/25 text-purple-300 font-bold border border-purple-500/40"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Financial Results
          </button>
          <button
            onClick={() => setFilterType("DIVIDEND")}
            className={`px-2.5 py-1 rounded-md transition ${
              filterType === "DIVIDEND"
                ? "bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Dividends / Book Closures
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {filteredEvents.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs font-mono">
            No corporate actions matching this filter.
          </div>
        ) : (
          filteredEvents.map((ev, idx) => (
            <div
              key={`${ev.symbol}-${ev.event_date}-${idx}`}
              className={`p-3.5 rounded-xl border transition ${
                ev.is_high_risk_window
                  ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/60"
                  : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectSymbol && onSelectSymbol(ev.symbol)}
                    className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/40 transition flex items-center gap-1"
                  >
                    {ev.symbol}
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                  <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-[280px]">
                    {ev.company_name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {ev.is_high_risk_window ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rose-400" />
                      {ev.days_until_event === 0 ? "TODAY" : ev.days_until_event === 1 ? "TOMORROW" : `IN ${ev.days_until_event} DAYS`}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                      In {ev.days_until_event} Days
                    </span>
                  )}

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {ev.event_type.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-xs font-sans text-slate-300">
                {ev.details}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="text-slate-400">
                  Event Date: <strong className="text-white">{ev.event_date}</strong>
                </div>
                <div className="text-amber-400/90 font-sans italic text-[11px]">
                  💡 {ev.action_guidance}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
