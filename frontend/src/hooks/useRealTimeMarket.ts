"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MarketStatus,
  MarketMoversResponse,
  SignalOverviewResponse,
  OpportunitiesResponse,
  ScannerResponse,
} from "@/lib/types";
import { api } from "@/lib/api";
import {
  initialMarketStatus,
  initialMarketMovers,
  initialSignals,
  initialOpportunities,
  initialScannerResults,
} from "@/lib/initialData";

export function useRealTimeMarket() {
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(initialMarketStatus);
  const [movers, setMovers] = useState<MarketMoversResponse>(initialMarketMovers);
  const [signals, setSignals] = useState<SignalOverviewResponse>(initialSignals);
  const [opportunities, setOpportunities] = useState<OpportunitiesResponse>(initialOpportunities);
  const [scannerResults, setScannerResults] = useState<ScannerResponse>(initialScannerResults);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all initial data via REST
  const refreshAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statusRes, moversRes, signalsRes, oppsRes, scanRes] = await Promise.all([
        api.getMarketStatus(),
        api.getMarketMovers(),
        api.getSignals(),
        api.getOpportunities(),
        api.getScannerResults(),
      ]);

      setMarketStatus(statusRes.data);
      setMovers(moversRes.data);
      setSignals(signalsRes.data);
      setOpportunities(oppsRes.data);
      setScannerResults(scanRes.data);

      const live = statusRes.isLiveBackend || moversRes.isLiveBackend;
      setIsLiveBackend(live);
    } catch (err: any) {
      console.warn("Could not load backend data:", err);
      setError("Failed to fetch fresh live backend data. Verify the backend service is running.");
      setIsLiveBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/live-signals";

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsWsConnected(true);
        setIsLiveBackend(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "MARKET_TICK") {
            setMarketStatus((prev) => ({
              ...prev,
              current_value: payload.current_value ?? prev.current_value,
              change: payload.change ?? prev.change,
              change_percent: payload.change_percent ?? prev.change_percent,
              volume_formatted: payload.volume_formatted ?? prev.volume_formatted,
              last_updated: payload.timestamp ?? prev.last_updated,
            }));
          }
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };

      ws.onerror = () => {
        setIsWsConnected(false);
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        // Attempt reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
    } catch {
      setIsWsConnected(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
    connectWebSocket();

    // Fallback polling every 8s if WS is not connected
    const interval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        refreshAllData();
      }
    }, 8000);

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [refreshAllData, connectWebSocket]);

  return {
    marketStatus,
    movers,
    signals,
    opportunities,
    scannerResults,
    isLoading,
    isLiveBackend,
    isWsConnected,
    error,
    refreshAllData,
  };
}
