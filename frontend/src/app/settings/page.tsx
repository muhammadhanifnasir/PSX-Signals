"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { AlertConfig } from "@/lib/types";
import { api } from "@/lib/api";
import {
  Settings,
  Save,
  Check,
  RefreshCw,
  Bell,
  Shield,
  Sliders,
  Send,
  Lock,
  Info,
  AlertCircle,
  Radio,
  CheckCircle2,
  User,
  Activity,
  Cpu,
  Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } =
    useRealTimeMarket();

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    telegram_enabled: false,
    telegram_bot_token_masked: "",
    telegram_chat_id: "",
    min_alert_score: 75,
    alert_on_buy: true,
    alert_on_target: true,
    alert_on_stop_loss: true,
  });

  const [newBotToken, setNewBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [minAlertScore, setMinAlertScore] = useState(75);
  const [alertBuy, setAlertBuy] = useState(true);
  const [alertTarget, setAlertTarget] = useState(true);
  const [alertStopLoss, setAlertStopLoss] = useState(true);

  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api");
  const [wsUrl, setWsUrl] = useState("ws://localhost:8000/ws/live-signals");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { user, isAuthenticated, settings: authSettings, updateSettings: updateAuthSettings } = useAuth();
  const [defaultCapital, setDefaultCapital] = useState("1000000");
  const [defaultRiskPct, setDefaultRiskPct] = useState("1.5");
  const [defaultTimeframe, setDefaultTimeframe] = useState("15m");
  const [browserNotifs, setBrowserNotifs] = useState(true);
  const [autoRefreshSec, setAutoRefreshSec] = useState(5);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{
    status: "success" | "error" | null;
    message: string;
  }>({ status: null, message: "" });

  // Load backend alert configuration on mount
  useEffect(() => {
    api.getAlertConfig().then((res) => {
      if (res.data) {
        const c = res.data;
        setAlertConfig(c);
        setTelegramEnabled(c.telegram_enabled);
        setChatId(c.telegram_chat_id || "");
        setMinAlertScore(c.min_alert_score);
        setAlertBuy(c.alert_on_buy);
        setAlertTarget(c.alert_on_target);
        setAlertStopLoss(c.alert_on_stop_loss);
      }
    });

    // Fetch system health & worker status
    fetch(`${apiUrl.replace('/api', '')}/api/health`)
      .then((r) => r.json())
      .then((d) => setSystemHealth(d))
      .catch(() => {});
  }, [apiUrl]);

  useEffect(() => {
    if (authSettings) {
      setDefaultCapital(authSettings.default_capital.toString());
      setDefaultRiskPct(authSettings.default_risk_pct.toString());
      setDefaultTimeframe(authSettings.default_timeframe);
      setSoundEnabled(authSettings.sound_alerts_enabled);
      setBrowserNotifs(authSettings.browser_notifications_enabled);
      setAutoRefreshSec(authSettings.auto_refresh_interval_sec);
    }
  }, [authSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = {
        telegram_enabled: telegramEnabled,
        telegram_chat_id: chatId.trim(),
        min_alert_score: minAlertScore,
        alert_on_buy: alertBuy,
        alert_on_target: alertTarget,
        alert_on_stop_loss: alertStopLoss,
      };
      if (newBotToken.trim()) {
        payload.telegram_bot_token = newBotToken.trim();
      }

      const res = await api.updateAlertConfig(payload);
      if (res.data) {
        setAlertConfig(res.data);
        setNewBotToken("");
      }

      if (isAuthenticated) {
        await updateAuthSettings({
          default_capital: parseFloat(defaultCapital) || 1000000.0,
          default_risk_pct: parseFloat(defaultRiskPct) || 1.5,
          default_timeframe: defaultTimeframe,
          sound_alerts_enabled: soundEnabled,
          browser_notifications_enabled: browserNotifs,
          auto_refresh_interval_sec: autoRefreshSec,
        });
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTelegramTestResult({ status: null, message: "" });
    try {
      const res = await api.sendTestTelegramAlert();
      if (res.status === "success") {
        setTelegramTestResult({
          status: "success",
          message: res.message || "Test alert dispatched successfully to Telegram channel!",
        });
      } else {
        setTelegramTestResult({
          status: "error",
          message: res.message || "Telegram API rejected test alert. Check token and chat ID.",
        });
      }
    } catch (err: any) {
      setTelegramTestResult({
        status: "error",
        message: err.message || "Could not connect to Telegram dispatcher endpoint.",
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Page Header */}
        <div className="trading-card rounded-xl p-5 border border-slate-800/90 bg-slate-900/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                System Settings &amp; Notification Triggers
              </h1>
              <p className="text-xs text-slate-400">
                Configure encrypted Telegram alerts, backend network endpoints, and quantitative signal thresholds.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* 1. TELEGRAM BOT & NOTIFICATION DISPATCH (SECURITY FIRST) */}
          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-4 bg-slate-950/40">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <Send className="w-4 h-4 text-cyan-400" />
                Telegram Instant Alert Dispatcher
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono text-slate-300">Enable Telegram Alerts:</label>
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200/90 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11.5px] leading-relaxed">
                <strong>Zero-Exposure Secret Security:</strong> Bot tokens are stored securely in backend server memory or environment variables and are never transmitted in plaintext to the browser. Only masked tokens (e.g. <code>{alertConfig.telegram_bot_token_masked || "1234••••••••5678"}</code>) are returned for verification.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1">
                  Telegram Bot Token {alertConfig.telegram_bot_token_masked && "(Currently Configured)"}:
                </label>
                <input
                  type="password"
                  value={newBotToken}
                  onChange={(e) => setNewBotToken(e.target.value)}
                  placeholder={
                    alertConfig.telegram_bot_token_masked
                      ? alertConfig.telegram_bot_token_masked
                      : "Enter BotFather token (e.g. 7123456789:AA...)"
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400 block mt-1 font-sans">
                  Leave blank to retain current backend configured token.
                </span>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">
                  Telegram Target Chat ID (or Channel Username):
                </label>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="-1001234567890 or @psx_signals_channel"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400 block mt-1 font-sans">
                  The private chat or public/private channel to receive actionable trade broadcasts.
                </span>
              </div>
            </div>

            {/* Test Alert Button and Result */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="text-xs">
                {telegramTestResult.status === "success" && (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                    <CheckCircle2 className="w-4 h-4" />
                    {telegramTestResult.message}
                  </span>
                )}
                {telegramTestResult.status === "error" && (
                  <span className="flex items-center gap-1.5 text-rose-400 font-mono text-[11px]">
                    <AlertCircle className="w-4 h-4" />
                    {telegramTestResult.message}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isTestingTelegram}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-all"
              >
                <Send className={`w-3.5 h-3.5 ${isTestingTelegram ? "animate-spin" : ""}`} />
                {isTestingTelegram ? "Sending Telegram Test..." : "Send Test Telegram Alert"}
              </button>
            </div>
          </div>

          {/* 2. ALERT THRESHOLDS & TRIGGER RULES */}
          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-4 bg-slate-950/40">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Signal Alert Rules &amp; Thresholds
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-slate-300">Minimum Opportunity Score Trigger:</span>
                  <span className="text-emerald-400 font-bold">{minAlertScore} / 100 Pts</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="90"
                  step="5"
                  value={minAlertScore}
                  onChange={(e) => setMinAlertScore(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block mt-1 font-sans">
                  Signals scoring below {minAlertScore} will not trigger push alerts to Telegram.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-200">Alert on BUY Signals</span>
                  <input
                    type="checkbox"
                    checked={alertBuy}
                    onChange={(e) => setAlertBuy(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-200">Alert on Target 1 Hit</span>
                  <input
                    type="checkbox"
                    checked={alertTarget}
                    onChange={(e) => setAlertTarget(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-200">Alert on Stop-Loss Exit</span>
                  <input
                    type="checkbox"
                    checked={alertStopLoss}
                    onChange={(e) => setAlertStopLoss(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. API & WEBSOCKET NETWORK ENDPOINTS */}
          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-4 bg-slate-950/40">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Radio className="w-4 h-4 text-purple-400" />
              Backend Network Endpoints
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">REST API Base URL:</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">WebSocket Live Stream URL:</label>
                <input
                  type="text"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. USER PROFILE & TRADING PREFERENCES */}
          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-4 bg-slate-950/40">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <User className="w-4 h-4 text-teal-400" />
                User Account &amp; Trading Profile
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                isAuthenticated ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400"
              }`}>
                {isAuthenticated ? `ACTIVE: ${user?.email}` : "GUEST MODE (UNAUTHENTICATED)"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Default Trading Capital (PKR):</label>
                <input
                  type="number"
                  value={defaultCapital}
                  onChange={(e) => setDefaultCapital(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Default Risk Cap % / Trade:</label>
                <input
                  type="number"
                  step="0.1"
                  value={defaultRiskPct}
                  onChange={(e) => setDefaultRiskPct(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Default Chart Timeframe:</label>
                <select
                  value={defaultTimeframe}
                  onChange={(e) => setDefaultTimeframe(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-teal-500 focus:outline-none"
                >
                  <option value="5m">5 Minutes (Intraday Scalp)</option>
                  <option value="15m">15 Minutes (Default Swing/Intraday)</option>
                  <option value="1h">1 Hour (Trend Following)</option>
                  <option value="1D">1 Day (EOD Daily Structural)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-200">Terminal Sound Alerts on Signals</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="accent-teal-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-200">Desktop Browser Notifications</span>
                <input
                  type="checkbox"
                  checked={browserNotifs}
                  onChange={(e) => setBrowserNotifs(e.target.checked)}
                  className="accent-teal-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 5. PRODUCTION BACKGROUND WORKERS & SYSTEM HEALTH */}
          {systemHealth && (
            <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-4 bg-slate-950/40">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Background Workers &amp; Server Infrastructure
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {systemHealth.status} ({systemHealth.uptime_human})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                {Object.entries(systemHealth.workers || {}).map(([workerKey, w]: [string, any]) => (
                  <div key={workerKey} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="font-bold text-slate-200 capitalize mb-1">
                      {workerKey.replace(/_/g, " ")}
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Status:</span>
                      <span className="text-emerald-400 font-bold">{w.status}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Cycles / Errors:</span>
                      <span>{w.cycles} / {w.errors}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400 font-sans">
              Changes take effect immediately across all background scanning jobs.
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Preferences Saved Successfully!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Preferences"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
