"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radar,
  Zap,
  TrendingUp,
  BookmarkCheck,
  FlaskConical,
  History,
  BookOpen,
  ShieldCheck,
  Database,
  Settings,
  Activity,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSignalsCount?: number;
  scannerCount?: number;
}

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, badge: "Live" },
  { name: "Market Scanner", href: "/scanner", icon: Radar, badgeCountKey: "scanner" },
  { name: "Signals", href: "/signals", icon: Zap, badgeCountKey: "signals" },
  { name: "Stock Analysis", href: "/stock-analysis", icon: TrendingUp },
  { name: "Watchlist", href: "/watchlist", icon: BookmarkCheck },
  { name: "Strategy Lab", href: "/strategy-lab", icon: FlaskConical },
  { name: "Backtesting", href: "/backtesting", icon: History },
  { name: "Trade Journal", href: "/trade-journal", icon: BookOpen },
  { name: "Risk Management", href: "/risk-management", icon: ShieldCheck },
  { name: "Data Sources", href: "/data-sources", icon: Database },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ isOpen, onClose, activeSignalsCount = 24, scannerCount = 9 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-[#0B0F19] border-r border-slate-800/80 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800/80">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Activity className="w-5 h-5 text-slate-950 font-black" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>PSX SIGNAL</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  INTEL
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 tracking-wider">
                TRADING RESEARCH
              </div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                  isActive
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <span>{item.name}</span>
                </div>

                {/* Badges */}
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
                {item.badgeCountKey === "signals" && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {activeSignalsCount}
                  </span>
                )}
                {item.badgeCountKey === "scanner" && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                    {scannerCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* System Architecture status box at bottom */}
        <div className="p-3 m-3 rounded-xl bg-slate-900/80 border border-slate-800/90 text-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse" />
              Engine Online
            </span>
            <span className="font-mono text-[10px] text-slate-400">v1.0.0</span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>Backend:</span>
              <span className="text-emerald-400">FastAPI :8000</span>
            </div>
            <div className="flex justify-between">
              <span>Storage:</span>
              <span className="text-slate-300">Supabase PG</span>
            </div>
            <div className="flex justify-between">
              <span>Feed Mode:</span>
              <span className="text-amber-400">Mock Research</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
