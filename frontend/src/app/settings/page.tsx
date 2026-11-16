"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { Settings, Save, Check, RefreshCw, Bell, Shield, Sliders } from "lucide-react";

export default function SettingsPage() {
  const { marketStatus, isLiveBackend, isWsConnected, isLoading, refreshAllData } = useRealTimeMarket();

  const [apiUrl, setApiUrl] = useState("http://localhost:8000/api");
  const [wsUrl, setWsUrl] = useState("ws://localhost:8000/ws/live-signals");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [minConfidenceAlert, setMinConfidenceAlert] = useState(85);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
    >
      <div className="space-y-6 max-w-3xl">
        <div className="trading-card rounded-xl p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">System Settings & Preferences</h2>
            <p className="text-xs text-slate-400">Configure connection ports, notification rules, and quantitative thresholds.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Connection settings */}
          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              API & WebSocket Endpoints
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Backend REST API Base URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">WebSocket Live Feed URL</label>
                <input
                  type="text"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Alert rules */}
          <div className="trading-card rounded-xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              Signal Notification Triggers
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-semibold block">Audible Sound Alerts</span>
                  <span className="text-slate-400 text-[11px]">Play audio chime on newly discovered Strong Buy signals</span>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Minimum Confidence Filter:</span>
                  <span className="text-emerald-400 font-bold">{minConfidenceAlert}%</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="95"
                  step="5"
                  value={minConfidenceAlert}
                  onChange={(e) => setMinConfidenceAlert(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Preferences Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
