"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import { Candle } from "@/lib/types";
import { generateSampleCandles } from "@/lib/mockData";
import { TrendingUp, TrendingDown, Maximize2, BarChart2 } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

interface TradingChartProps {
  initialSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
}

const POPULAR_SYMBOLS = [
  { symbol: "KSE-100", name: "KSE 100 Index", price: 105420.50, change: 682.40, pct: 0.65 },
  { symbol: "AIRLINK", name: "Air Link Comm", price: 142.10, change: 9.60, pct: 7.25 },
  { symbol: "ATRL", name: "Attock Refinery", price: 412.30, change: 21.40, pct: 5.47 },
  { symbol: "LUCK", name: "Lucky Cement", price: 945.00, change: 35.00, pct: 3.85 },
  { symbol: "OGDC", name: "Oil & Gas Dev", price: 164.50, change: 3.80, pct: 2.36 },
  { symbol: "HUBC", name: "Hub Power Co", price: 138.20, change: 4.50, pct: 3.37 },
  { symbol: "SYS", name: "Systems Limited", price: 482.00, change: 22.50, pct: 4.90 },
];

export function TradingChart({ initialSymbol = "KSE-100", onSymbolChange }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "ALL">("1M");

  const currentStock = POPULAR_SYMBOLS.find((s) => s.symbol === selectedSymbol) || {
    symbol: selectedSymbol,
    name: `${selectedSymbol} Equity`,
    price: 150.0,
    change: 2.5,
    pct: 1.7,
  };

  const isPositive = currentStock.change >= 0;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#94A3B8",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.5)" },
        horzLines: { color: "rgba(30, 41, 59, 0.5)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#10B981",
          width: 1,
          style: 2,
        },
        horzLine: {
          color: "#10B981",
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: "#1E293B",
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
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

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981",
      downColor: "#EF4444",
      borderUpColor: "#10B981",
      borderDownColor: "#EF4444",
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
    });
    candleSeriesRef.current = candleSeries;

    // Add Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#334155",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "", // Overlay on separate scale margin
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Populate data
    const candles = generateSampleCandles(currentStock.price, 60);
    candleSeries.setData(
      candles.map((c) => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    volumeSeries.setData(
      candles.map((c) => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)",
      }))
    );

    chart.timeScale().fitContent();

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: 380,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [selectedSymbol]);

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    if (onSymbolChange) {
      onSymbolChange(sym);
    }
  };

  return (
    <div className="trading-card rounded-xl border border-slate-800/90 overflow-hidden">
      {/* Chart Top Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">
                {currentStock.symbol}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {currentStock.name}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                PSX
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-mono font-bold text-white">
                Rs. {formatNumber(currentStock.price)}
              </span>
              <span
                className={`flex items-center text-xs font-mono font-semibold ${
                  isPositive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                {isPositive ? `+${currentStock.change.toFixed(2)}` : currentStock.change.toFixed(2)} (
                {formatPercent(currentStock.pct)})
              </span>
            </div>
          </div>
        </div>

        {/* Quick Ticker Switcher Buttons */}
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

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs font-mono">
          {(["1D", "1W", "1M", "ALL"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded transition-colors ${
                timeframe === tf
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative w-full h-[380px] p-2 bg-[#090D16]">
        <div ref={chartContainerRef} className="w-full h-full" />
        {/* Subtle Watermark */}
        <div className="absolute bottom-4 left-4 pointer-events-none text-[11px] font-mono text-slate-400/80 select-none">
          TradingView Lightweight Charts • PSX Simulated Research Data
        </div>
      </div>
    </div>
  );
}
