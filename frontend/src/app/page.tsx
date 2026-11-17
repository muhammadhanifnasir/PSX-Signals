"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { TradingChart } from "@/components/dashboard/TradingChart";
import { SignalOverviewTable } from "@/components/dashboard/SignalOverviewTable";
import { TopOpportunitiesPanel } from "@/components/dashboard/TopOpportunitiesPanel";
import { MarketMoversPanel } from "@/components/dashboard/MarketMoversPanel";
import { MacroRegimeBanner } from "@/components/dashboard/MacroRegimeBanner";
import { SectorRotationMatrix } from "@/components/dashboard/SectorRotationMatrix";
import { SmartMoneyFlowWidget } from "@/components/dashboard/SmartMoneyFlowWidget";
import { CorporateActionsWidget } from "@/components/dashboard/CorporateActionsWidget";
import { LoadingState, MetricCardSkeleton } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useRealTimeMarket } from "@/hooks/useRealTimeMarket";
import { api } from "@/lib/api";
import { MacroRegimeReport, SectorPerformance } from "@/lib/types";

export default function DashboardPage() {
  const {
    marketStatus,
    movers,
    signals,
    opportunities,
    isLoading,
    isLiveBackend,
    isWsConnected,
    error,
    refreshAllData,
  } = useRealTimeMarket();

  const [selectedStockForChart, setSelectedStockForChart] = useState<string>("KSE-100");
  const [macroRegime, setMacroRegime] = useState<MacroRegimeReport | null>(null);
  const [sectors, setSectors] = useState<SectorPerformance[]>([]);
  const [isSectorLoading, setIsSectorLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMacroAndSectors = async () => {
      try {
        const [regimeRes, sectorRes] = await Promise.all([
          api.getMacroRegime(),
          api.getSectorRotation(),
        ]);
        if (isMounted) {
          setMacroRegime(regimeRes.data);
          setSectors(sectorRes.data);
          setIsSectorLoading(false);
        }
      } catch (err) {
        if (isMounted) setIsSectorLoading(false);
      }
    };

    fetchMacroAndSectors();
    const interval = setInterval(fetchMacroAndSectors, 45000); // 45s refresh
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSelectSymbol = (symbol: string) => {
    setSelectedStockForChart(symbol);
    // Smooth scroll to chart if needed
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppShell
      marketStatus={marketStatus}
      isLiveBackend={isLiveBackend}
      isWsConnected={isWsConnected}
      isLoading={isLoading}
      onRefresh={refreshAllData}
      onSearchSymbol={handleSelectSymbol}
      activeSignalsCount={signals.total_signals}
      scannerCount={opportunities.top_opportunities.length}
    >
      {/* 1. TOP 6 METRIC CARDS */}
      <section aria-label="Market Overview Cards">
        <MetricCards status={marketStatus} isLoading={isLoading} />
      </section>

      {/* 1.5. INSTITUTIONAL MACRO REGIME BANNER */}
      <section aria-label="Macro Market Regime">
        <MacroRegimeBanner regime={macroRegime} isLoading={isSectorLoading} />
      </section>

      {/* ERROR BANNER IF ANY */}
      {error && !isLiveBackend && (
        <ErrorState
          title="Backend API Offline"
          message="Could not reach the FastAPI backend on port 8000. Please ensure the live market backend service is running."
          onRetry={refreshAllData}
        />
      )}

      {/* 2. MAIN INTERACTIVE TRADING CHART (Lightweight Charts) */}
      <section aria-label="Interactive Trading Chart">
        <TradingChart
          initialSymbol={selectedStockForChart}
          onSymbolChange={(sym) => setSelectedStockForChart(sym)}
        />
      </section>

      {/* 2.5. SECTOR ROTATION MATRIX (RRG QUADRANTS) */}
      <section aria-label="Sector Rotation Matrix">
        <SectorRotationMatrix
          sectors={sectors}
          isLoading={isSectorLoading}
          onSelectSymbol={handleSelectSymbol}
        />
      </section>

      {/* 2.6. SMART MONEY FLOW & CORPORATE ACTIONS */}
      <section aria-label="Smart Money Footprint and Corporate Actions" className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SmartMoneyFlowWidget onSelectSymbol={handleSelectSymbol} />
        <CorporateActionsWidget onSelectSymbol={handleSelectSymbol} />
      </section>

      {/* 3. OPPORTUNITIES & MARKET MOVERS (2-column layout on desktop) */}
      <section aria-label="Opportunities and Movers" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopOpportunitiesPanel
          opportunities={opportunities.top_opportunities}
          onSelectSymbol={handleSelectSymbol}
        />
        <MarketMoversPanel
          movers={movers}
          onSelectSymbol={handleSelectSymbol}
        />
      </section>

      {/* 4. SIGNAL OVERVIEW TABLE */}
      <section aria-label="Active Signals Table">
        {signals.signals.length > 0 ? (
          <SignalOverviewTable
            signals={signals.signals}
            onSelectSymbol={handleSelectSymbol}
          />
        ) : (
          <EmptyState
            title="No Active Signals"
            description="All algorithmic scanning criteria currently hold neutral bias. Check back during active market hours."
            onAction={refreshAllData}
          />
        )}
      </section>
    </AppShell>
  );
}
