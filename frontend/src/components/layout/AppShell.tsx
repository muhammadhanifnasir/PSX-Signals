"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { OfflineBanner } from "../states/OfflineBanner";
import { MarketStatus } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
  marketStatus?: MarketStatus | null;
  isLiveBackend?: boolean;
  isWsConnected?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  onSearchSymbol?: (symbol: string) => void;
  activeSignalsCount?: number;
  scannerCount?: number;
}

export function AppShell({
  children,
  marketStatus,
  isLiveBackend = true,
  isWsConnected = false,
  isLoading = false,
  onRefresh = () => {},
  onSearchSymbol,
  activeSignalsCount = 24,
  scannerCount = 9,
}: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#090D16]">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeSignalsCount={activeSignalsCount}
        scannerCount={scannerCount}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        {/* Offline & Mock Simulation Banner */}
        <OfflineBanner
          isOffline={!isLiveBackend}
          isLiveBackend={isLiveBackend}
          onReconnect={onRefresh}
        />

        {/* Header */}
        <Header
          onOpenSidebar={() => setIsSidebarOpen(true)}
          marketStatus={marketStatus}
          isLiveBackend={isLiveBackend}
          isWsConnected={isWsConnected}
          isLoading={isLoading}
          onRefresh={onRefresh}
          onSearchSymbol={onSearchSymbol}
        />

        {/* Main Body */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 max-w-[1700px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
