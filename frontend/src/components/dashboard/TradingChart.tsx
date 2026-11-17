"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createSeriesMarkers,
} from "lightweight-charts";
import { StockDetail, Candle, SignalMarker, OverlayPoint } from "@/lib/types";
import { api } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Zap,
  Target,
  Shield,
  Clock,
  Eye,
  EyeOff,
  Maximize2,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

interface TradingChartProps {
  initialSymbol?: string;
  stockDetail?: StockDetail | null;
  onSymbolChange?: (symbol: string) => void;
  height?: number;
  showQuickTickers?: boolean;
}

const POPULAR_SYMBOLS = [
  { symbol: "KSE-100", name: "KSE-100 Index", price: 178801.35, change: 681.35, pct: 0.38 },
  { symbol: "AIRLINK", name: "Air Link Comm", price: 142.10, change: 9.60, pct: 7.25 },
  { symbol: "OGDC", name: "Oil & Gas Dev", price: 164.50, change: 3.80, pct: 2.36 },
  { symbol: "MARI", name: "Mari Petroleum", price: 748.20, change: 18.50, pct: 2.54 },
  { symbol: "SYS", name: "Systems Limited", price: 482.00, change: 22.50, pct: 4.90 },
  { symbol: "LUCK", name: "Lucky Cement", price: 945.00, change: 35.00, pct: 3.85 },
  { symbol: "HUBC", name: "Hub Power Co", price: 138.20, change: 4.50, pct: 3.37 },
  { symbol: "ATRL", name: "Attock Refinery", price: 412.30, change: 21.40, pct: 5.47 },
];

export function TradingChart({
  initialSymbol = "AIRLINK",
  stockDetail: externalStockDetail,
  onSymbolChange,
  height = 420,
  showQuickTickers = true,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const ema9SeriesRef = useRef<any>(null);
  const ema21SeriesRef = useRef<any>(null);
  const vwapSeriesRef = useRef<any>(null);
  const priceLinesRef = useRef<any[]>([]);

  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [stockData, setStockData] = useState<StockDetail | null>(externalStockDetail || null);
  const [loading, setLoading] = useState(false);

  // Overlay toggles
  const [showEMA, setShowEMA] = useState(true);
  const [showVWAP, setShowVWAP] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showSRLevels, setShowSRLevels] = useState(true);
  const [showOrderLevels, setShowOrderLevels] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);

  // Fetch stock details if not supplied externally or if symbol changed
  const loadStockData = useCallback(async (sym: string) => {
    setLoading(true);
    try {
      const res = await api.getStockDetail(sym);
      setStockData(res.data);
    } catch (err) {
      console.warn("Failed to fetch stock detail:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (externalStockDetail && externalStockDetail.symbol === selectedSymbol) {
      setStockData(externalStockDetail);
    } else {
      loadStockData(selectedSymbol);
    }
  }, [selectedSymbol, externalStockDetail, loadStockData]);

  // Handle symbol change from props
  useEffect(() => {
    if (initialSymbol && initialSymbol !== selectedSymbol) {
      setSelectedSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  // Construct Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#94A3B8",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.45)" },
        horzLines: { color: "rgba(30, 41, 59, 0.45)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#10B981",
          width: 1,
          style: LineStyle.Dotted,
        },
        horzLine: {
          color: "#10B981",
          width: 1,
          style: LineStyle.Dotted,
        },
      },
      rightPriceScale: {
        borderColor: "#1E293B",
        scaleMargins: {
          top: 0.08,
          bottom: 0.22,
        },
      },
      timeScale: {
        borderColor: "#1E293B",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    // 2. Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981",
      downColor: "#EF4444",
      borderUpColor: "#10B981",
      borderDownColor: "#EF4444",
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
    });
    candleSeriesRef.current = candleSeries;

    // 3. Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#334155",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // 4. Overlays: EMA 9, EMA 21, and VWAP LineSeries
    const ema9Series = chart.addSeries(LineSeries, {
      color: "#06B6D4", // Cyan
      lineWidth: 2,
      title: "EMA 9",
    });
    ema9SeriesRef.current = ema9Series;

    const ema21Series = chart.addSeries(LineSeries, {
      color: "#F59E0B", // Amber
      lineWidth: 2,
      title: "EMA 21",
    });
    ema21SeriesRef.current = ema21Series;

    const vwapSeries = chart.addSeries(LineSeries, {
      color: "#EAB308", // Yellow
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: "VWAP",
    });
    vwapSeriesRef.current = vwapSeries;

    // Resize handler with ResizeObserver
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const w = chartContainerRef.current.clientWidth;
        if (w > 0) {
          chartRef.current.applyOptions({
            width: w,
            height: height,
          });
        }
      }
    };

    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 0 && chartRef.current) {
        chartRef.current.applyOptions({ width, height });
        chartRef.current.timeScale().fitContent();
      }
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [height]);

  // Populate data when stockData changes
  useEffect(() => {
    if (!chartRef.current || !stockData || !candleSeriesRef.current) return;

    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const ema9Series = ema9SeriesRef.current;
    const ema21Series = ema21SeriesRef.current;
    const vwapSeries = vwapSeriesRef.current;

    // Clear previous price lines
    priceLinesRef.current.forEach((line) => {
      try {
        candleSeries.removePriceLine(line);
      } catch {}
    });
    priceLinesRef.current = [];

    // Set Candlesticks
    if (stockData.candles && stockData.candles.length > 0) {
      candleSeries.setData(
        stockData.candles.map((c) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      // Set Volume
      if (showVolume && volumeSeries) {
        volumeSeries.setData(
          stockData.candles.map((c) => ({
            time: c.time as any,
            value: c.volume,
            color: c.close >= c.open ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)",
          }))
        );
      } else if (volumeSeries) {
        volumeSeries.setData([]);
      }
    }

    // Set EMA 9
    if (showEMA && stockData.ema_9_series && ema9Series) {
      ema9Series.setData(
        stockData.ema_9_series.map((p) => ({ time: p.time as any, value: p.value }))
      );
    } else if (ema9Series) {
      ema9Series.setData([]);
    }

    // Set EMA 21
    if (showEMA && stockData.ema_21_series && ema21Series) {
      ema21Series.setData(
        stockData.ema_21_series.map((p) => ({ time: p.time as any, value: p.value }))
      );
    } else if (ema21Series) {
      ema21Series.setData([]);
    }

    // Set VWAP
    if (showVWAP && stockData.vwap_series && vwapSeries) {
      vwapSeries.setData(
        stockData.vwap_series.map((p) => ({ time: p.time as any, value: p.value }))
      );
    } else if (vwapSeries) {
      vwapSeries.setData([]);
    }

    // Set Historical Markers
    if (showMarkers && stockData.historical_markers && stockData.historical_markers.length > 0) {
      try {
        createSeriesMarkers(
          candleSeries,
          stockData.historical_markers.map((m) => ({
            time: m.time as any,
            position: m.position,
            color: m.color,
            shape: m.shape,
            text: m.text,
          }))
        );
      } catch (err) {
        console.warn("Could not set markers:", err);
      }
    }

    // Set Order Price Lines (Entry, Stop Loss, Target 1, Target 2)
    if (showOrderLevels && stockData.entry_price && stockData.stop_loss && stockData.target_1) {
      const entryLine = candleSeries.createPriceLine({
        price: stockData.entry_price,
        color: "#06B6D4", // Cyan
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ENTRY: Rs. ${stockData.entry_price.toFixed(2)}`,
      });
      priceLinesRef.current.push(entryLine);

      const slLine = candleSeries.createPriceLine({
        price: stockData.stop_loss,
        color: "#EF4444", // Red
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `STOP-LOSS: Rs. ${stockData.stop_loss.toFixed(2)}`,
      });
      priceLinesRef.current.push(slLine);

      const t1Line = candleSeries.createPriceLine({
        price: stockData.target_1,
        color: "#10B981", // Emerald
        lineWidth: 2,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `TARGET 1: Rs. ${stockData.target_1.toFixed(2)}`,
      });
      priceLinesRef.current.push(t1Line);

      if (stockData.target_2) {
        const t2Line = candleSeries.createPriceLine({
          price: stockData.target_2,
          color: "#34D399", // Light Emerald
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TARGET 2: Rs. ${stockData.target_2.toFixed(2)}`,
        });
        priceLinesRef.current.push(t2Line);
      }
    }

    // Set Support & Resistance (Pivot, R1, R2, S1, S2)
    if (showSRLevels && stockData.support_resistance) {
      const sr = stockData.support_resistance;
      const pivotLine = candleSeries.createPriceLine({
        price: sr.pivot,
        color: "#94A3B8",
        lineWidth: 1,
        lineStyle: LineStyle.SparseDotted,
        axisLabelVisible: true,
        title: `PIVOT: ${sr.pivot.toFixed(1)}`,
      });
      priceLinesRef.current.push(pivotLine);

      const r1Line = candleSeries.createPriceLine({
        price: sr.r1,
        color: "#F43F5E",
        lineWidth: 1,
        lineStyle: LineStyle.SparseDotted,
        axisLabelVisible: false,
        title: `R1: ${sr.r1.toFixed(1)}`,
      });
      priceLinesRef.current.push(r1Line);

      const s1Line = candleSeries.createPriceLine({
        price: sr.s1,
        color: "#10B981",
        lineWidth: 1,
        lineStyle: LineStyle.SparseDotted,
        axisLabelVisible: false,
        title: `S1: ${sr.s1.toFixed(1)}`,
      });
      priceLinesRef.current.push(s1Line);
    }

    chartRef.current.timeScale().fitContent();
  }, [
    stockData,
    showEMA,
    showVWAP,
    showVolume,
    showSRLevels,
    showOrderLevels,
    showMarkers,
  ]);

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    if (onSymbolChange) {
      onSymbolChange(sym);
    }
  };

  const isPositive = (stockData?.change ?? 0) >= 0;

  return (
    <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden bg-slate-900/60 shadow-xl">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800/80 bg-slate-950/70">
        {/* Left: Active Stock Info */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight font-mono">
                {stockData?.symbol || selectedSymbol}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {stockData?.company_name || `${selectedSymbol} Ltd`}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                PSX
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {stockData?.data_delay_type || "DELAYED_15MIN"}
              </span>
            </div>

            <div className="flex items-center gap-2.5 mt-1">
              <span className="text-xl font-mono font-bold text-white">
                Rs. {formatNumber(stockData?.price || 142.10)}
              </span>
              <span
                className={`flex items-center text-xs font-mono font-bold ${
                  isPositive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                {isPositive ? `+${(stockData?.change || 0).toFixed(2)}` : (stockData?.change || 0).toFixed(2)} (
                {formatPercent(stockData?.change_percent || 0)})
              </span>
              <span className="text-xs font-mono text-slate-400">
                Vol: {stockData?.volume_formatted || "0"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Tickers */}
        {showQuickTickers && (
          <div className="flex flex-wrap items-center gap-1.5">
            {POPULAR_SYMBOLS.map((s) => (
              <button
                key={s.symbol}
                onClick={() => handleSelectSymbol(s.symbol)}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                  selectedSymbol === s.symbol
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white"
                }`}
              >
                {s.symbol}
              </button>
            ))}
          </div>
        )}

        {/* Overlay Feature Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
              showEMA
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                : "bg-slate-900 text-slate-500 border-slate-800"
            }`}
            title="Toggle EMA 9 (Cyan) & EMA 21 (Orange)"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            EMA 9/21
          </button>

          <button
            onClick={() => setShowVWAP(!showVWAP)}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
              showVWAP
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                : "bg-slate-900 text-slate-500 border-slate-800"
            }`}
            title="Toggle Intraday VWAP (Yellow Dashed)"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            VWAP
          </button>

          <button
            onClick={() => setShowOrderLevels(!showOrderLevels)}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
              showOrderLevels
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                : "bg-slate-900 text-slate-500 border-slate-800"
            }`}
            title="Toggle Order Levels: Entry Zone, Stop-Loss, Targets"
          >
            <Target className="w-3 h-3 text-emerald-400" />
            Order Levels
          </button>

          <button
            onClick={() => setShowSRLevels(!showSRLevels)}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
              showSRLevels
                ? "bg-purple-500/15 text-purple-300 border-purple-500/40"
                : "bg-slate-900 text-slate-500 border-slate-800"
            }`}
            title="Toggle Floor Pivot Support & Resistance (S1, S2, Pivot, R1, R2)"
          >
            <Layers className="w-3 h-3 text-purple-400" />
            S / R Pivots
          </button>

          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
              showMarkers
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                : "bg-slate-900 text-slate-500 border-slate-800"
            }`}
            title="Toggle Historical & Active Signal Markers on Candlesticks"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            Signal Markers
          </button>
        </div>
      </div>

      {/* 2. Chart Canvas Area */}
      <div className="relative w-full bg-[#070A11] p-2" style={{ height: `${height}px` }}>
        <div ref={chartContainerRef} className="w-full h-full" />

        {/* Legend / Overlay Status Pills */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none text-[11px] font-mono">
          {showEMA && (
            <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur px-2 py-1 rounded border border-slate-800">
              <span className="text-cyan-400">EMA(9): Rs. {stockData?.technicals?.ema_9?.toFixed(2) || "---"}</span>
              <span className="text-amber-400">EMA(21): Rs. {stockData?.technicals?.ema_21?.toFixed(2) || "---"}</span>
            </div>
          )}
          {showVWAP && (
            <div className="bg-slate-950/80 backdrop-blur px-2 py-1 rounded border border-slate-800 text-yellow-400">
              VWAP: Rs. {stockData?.technicals?.vwap?.toFixed(2) || "---"}
            </div>
          )}
          {showOrderLevels && stockData?.entry_price && (
            <div className="bg-slate-950/80 backdrop-blur px-2 py-1 rounded border border-slate-800 text-emerald-300">
              Entry: {stockData.entry_price.toFixed(1)} | SL: {stockData.stop_loss?.toFixed(1)} | T1: {stockData.target_1?.toFixed(1)}
            </div>
          )}
        </div>

        {/* Bottom Disclaimer */}
        <div className="absolute bottom-3 left-4 pointer-events-none text-[10px] font-mono text-slate-400 select-none">
          PSX Data Engine • Real PSX Delayed feed (15m) • Lightweight Charts v5.3
        </div>
      </div>

      {/* 3. Sub-indicator strip: RSI(14) & ATR(14) & Trend Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-950/80 border-t border-slate-800/80 text-xs font-mono">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
          <div>
            <span className="text-slate-400 text-[10.5px] block">RSI (14) MOMENTUM</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-bold text-white text-sm">
                {stockData?.technicals?.rsi_14?.toFixed(1) || "55.0"}
              </span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                  (stockData?.technicals?.rsi_14 || 50) >= 60
                    ? "bg-emerald-500/20 text-emerald-300"
                    : (stockData?.technicals?.rsi_14 || 50) <= 40
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {(stockData?.technicals?.rsi_14 || 50) >= 60
                  ? "BULLISH"
                  : (stockData?.technicals?.rsi_14 || 50) <= 40
                  ? "OVERSOLD"
                  : "NEUTRAL"}
              </span>
            </div>
          </div>
          <Activity className="w-4 h-4 text-emerald-400 opacity-60" />
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
          <div>
            <span className="text-slate-400 text-[10.5px] block">ATR (14) VOLATILITY</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-bold text-white text-sm">
                Rs. {stockData?.technicals?.atr_14?.toFixed(2) || "3.20"}
              </span>
              <span className="text-[10px] text-slate-400">
                ±{stockData ? ((stockData.technicals.atr_14 / stockData.price) * 100).toFixed(1) : "2.2"}%
              </span>
            </div>
          </div>
          <Shield className="w-4 h-4 text-cyan-400 opacity-60" />
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
          <div>
            <span className="text-slate-400 text-[10.5px] block">FLOOR PIVOT (S/R)</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-bold text-slate-200">
                P: {stockData?.support_resistance?.pivot?.toFixed(1) || "---"}
              </span>
              <span className="text-[10px] text-rose-400">
                R1: {stockData?.support_resistance?.r1?.toFixed(1) || "---"}
              </span>
              <span className="text-[10px] text-emerald-400">
                S1: {stockData?.support_resistance?.s1?.toFixed(1) || "---"}
              </span>
            </div>
          </div>
          <Layers className="w-4 h-4 text-purple-400 opacity-60" />
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
          <div>
            <span className="text-slate-400 text-[10.5px] block">SYSTEMATIC TREND</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`font-bold text-xs ${
                  (stockData?.technicals?.trend || "").includes("Bullish")
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {stockData?.technicals?.trend || "Bullish (9 > 21)"}
              </span>
            </div>
          </div>
          <Zap className="w-4 h-4 text-amber-400 opacity-60" />
        </div>
      </div>
    </div>
  );
}
