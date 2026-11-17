"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Radio,
  Bell,
  Check,
  CheckCheck,
  X,
  Zap,
  ExternalLink,
  User,
  LogIn,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MarketStatus, DashboardNotification, SessionPhaseReport } from "@/lib/types";
import { api } from "@/lib/api";
import { formatNumber, formatPercent } from "@/lib/utils";

interface HeaderProps {
  onOpenSidebar: () => void;
  marketStatus?: MarketStatus | null;
  isLiveBackend: boolean;
  isWsConnected: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onSearchSymbol?: (symbol: string) => void;
}

export function Header({
  onOpenSidebar,
  marketStatus,
  isLiveBackend,
  isWsConnected,
  isLoading,
  onRefresh,
  onSearchSymbol,
}: HeaderProps) {
  const { user, isAuthenticated, signIn, signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("trader@psxsignals.com");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);
    const res = await signIn(loginEmail, loginPassword);
    setIsSubmittingAuth(false);
    if (res.success) {
      setIsAuthModalOpen(false);
    } else {
      setAuthError(res.error || "Authentication failed");
    }
  };
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<SessionPhaseReport | null>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch session phase
  const loadSessionPhase = useCallback(async () => {
    try {
      const res = await api.getSessionPhase();
      setSessionPhase(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadSessionPhase();
    const interval = setInterval(loadSessionPhase, 30000); // 30s
    return () => clearInterval(interval);
  }, [loadSessionPhase]);

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications(20);
      setNotifications(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(e.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && onSearchSymbol) {
      onSearchSymbol(searchTerm.trim().toUpperCase());
    }
  };

  const isMarketOpen = marketStatus?.status === "OPEN";
  const indexValue = marketStatus?.current_value ?? 105420.50;
  const indexChange = marketStatus?.change ?? 682.40;
  const indexPct = marketStatus?.change_percent ?? 0.65;
  const isPositive = indexChange >= 0;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Left: Mobile trigger & Mini KSE-100 Ticker */}
      <div className="flex items-center gap-3 lg:gap-5">
        <button
          onClick={onOpenSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Real-time KSE-100 Index Badge */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-tight text-white">KSE-100</span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">PSX</span>
          </div>
          <div className="h-3.5 w-px bg-slate-700 hidden sm:block" />
          <div className="font-mono text-xs font-semibold text-white">
            {formatNumber(indexValue)}
          </div>
          <div
            className={`flex items-center gap-0.5 text-xs font-mono font-medium ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{isPositive ? `+${indexChange.toFixed(2)}` : indexChange.toFixed(2)}</span>
            <span className="text-[11px] hidden md:inline">({formatPercent(indexPct)})</span>
          </div>
        </div>

        {/* Market Status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border border-slate-800 bg-slate-900/60">
          <span
            className={`w-2 h-2 rounded-full ${
              isMarketOpen ? "bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className={isMarketOpen ? "text-emerald-300" : "text-amber-300"}>
            {isMarketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
          </span>
        </div>

        {/* PSX Intraday Timing Window Playbook Pill */}
        {sessionPhase && (
          <div
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition ${
              sessionPhase.is_prime_window
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950"
                : sessionPhase.session_phase === "MIDDAY_LUNCH_CHOP"
                ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                : sessionPhase.session_phase === "OPENING_AUCTION_TRAP"
                ? "bg-orange-950/40 border-orange-500/40 text-orange-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
            title={`${sessionPhase.phase_title}: ${sessionPhase.institutional_playbook} (${sessionPhase.window_start} - ${sessionPhase.window_end})`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                sessionPhase.is_prime_window
                  ? "bg-emerald-400 animate-pulse"
                  : sessionPhase.session_phase === "MIDDAY_LUNCH_CHOP"
                  ? "bg-amber-400"
                  : "bg-slate-500"
              }`}
            />
            <span className="font-bold uppercase tracking-wider text-[10px]">
              {sessionPhase.session_phase === "PRIME_INSTITUTIONAL_RUN"
                ? `PRIME RUN (${sessionPhase.window_start}-${sessionPhase.window_end})`
                : sessionPhase.session_phase === "MIDDAY_LUNCH_CHOP"
                ? `MIDDAY CHOP`
                : sessionPhase.session_phase === "OPENING_AUCTION_TRAP"
                ? `OPENING TRAP`
                : sessionPhase.session_phase.replace(/_/g, " ")}
            </span>
          </div>
        )}
      </div>

      {/* Center: Quick Search Form */}
      <div className="hidden md:flex flex-1 max-w-xs mx-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search stock symbol (e.g. OGDC, LUCK)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
        </form>
      </div>

      {/* Right: Connectivity badges, Notifications bell & Refresh button */}
      <div className="flex items-center gap-2.5">
        {/* Stream / Connection status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border border-slate-800 bg-slate-900/80">
          {isWsConnected ? (
            <>
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="text-cyan-300 hidden sm:inline">LIVE WS STREAM</span>
              <span className="text-cyan-300 sm:hidden">WS</span>
            </>
          ) : isLiveBackend ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-300 hidden sm:inline">REST CONNECTED</span>
              <span className="text-emerald-300 sm:hidden">REST</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-300 hidden sm:inline">CLIENT MOCK</span>
              <span className="text-amber-300 sm:hidden">MOCK</span>
            </>
          )}
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="Trading Alerts & Notifications"
            className="relative p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950 animate-pulse shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden font-sans">
              <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950/80">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white font-mono">
                    System Alerts &amp; Signals
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition-colors hover:bg-slate-800/40 flex items-start gap-2.5 ${
                        !n.is_read ? "bg-slate-800/20" : ""
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                        <Zap className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <Link
                            href={`/stock-analysis?symbol=${n.symbol}`}
                            onClick={() => setIsNotifOpen(false)}
                            className="font-bold text-white hover:text-emerald-400 transition-colors truncate"
                          >
                            {n.title}
                          </Link>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {n.timestamp.split(" ")[1] || n.timestamp}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/50">
                          <Link
                            href={`/stock-analysis?symbol=${n.symbol}`}
                            onClick={() => setIsNotifOpen(false)}
                            className="text-[10.5px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            View Analysis <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                          {!n.is_read && (
                            <button
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              className="text-[10px] text-slate-400 hover:text-slate-200"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh All Market Data"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* User Auth Section */}
        <div className="relative" ref={userMenuRef}>
          {isAuthenticated && user ? (
            <div>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-white transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                  {user.email.slice(0, 1).toUpperCase()}
                </div>
                <span className="hidden md:inline font-mono text-[11px] truncate max-w-[120px]">
                  {user.display_name || user.email.split("@")[0]}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                  {user.role}
                </span>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-md shadow-2xl z-50 p-2 text-xs">
                  <div className="p-2 border-b border-slate-800 mb-1">
                    <div className="font-bold text-white truncate">{user.display_name || "Trader"}</div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">{user.email}</div>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    User Settings
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-900/30 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Authentication Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-white">PSX Terminal Authentication</h3>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="p-5 space-y-3.5">
              {authError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {authError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-[10.5px] text-slate-400 space-y-0.5 font-mono">
                <div className="text-slate-300 font-sans font-semibold">Demo Credentials:</div>
                <div>Email: trader@psxsignals.com</div>
                <div>Pass: admin123</div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-colors"
              >
                {isSubmittingAuth ? "Authenticating..." : "Sign In to Terminal"}
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
