"use client";

import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, LineSeries, AreaSeries, LineStyle } from "lightweight-charts";
import { BacktestEquityPoint } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface BacktestEquityChartProps {
  equityCurve: BacktestEquityPoint[];
  height?: number;
}

export function BacktestEquityChart({ equityCurve, height = 360 }: BacktestEquityChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !equityCurve || equityCurve.length === 0) return;

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
          top: 0.1,
          bottom: 0.15,
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

    // 1. Strategy Equity Area Series (Cyan/Emerald gradient)
    const strategySeries = chart.addSeries(AreaSeries, {
      topColor: "rgba(16, 185, 129, 0.35)",
      bottomColor: "rgba(16, 185, 129, 0.02)",
      lineColor: "#10B981",
      lineWidth: 2,
      title: "Strategy Equity",
    });

    strategySeries.setData(
      equityCurve.map((p) => ({
        time: p.date as any,
        value: p.equity,
      }))
    );

    // 2. KSE-100 Benchmark Series (Slate/Amber dashed)
    const benchmarkSeries = chart.addSeries(LineSeries, {
      color: "#F59E0B",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: "KSE-100 Benchmark",
    });

    benchmarkSeries.setData(
      equityCurve.map((p) => ({
        time: p.date as any,
        value: p.benchmark_equity,
      }))
    );

    chart.timeScale().fitContent();

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
  }, [equityCurve, height]);

  if (!equityCurve || equityCurve.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-500 font-mono text-xs">
        No equity curve data available. Run simulation to view performance curve.
      </div>
    );
  }

  const initialEq = equityCurve[0].equity;
  const currentEq = equityCurve[equityCurve.length - 1].equity;
  const currentBm = equityCurve[equityCurve.length - 1].benchmark_equity;
  const initialBm = equityCurve[0].benchmark_equity;

  const returnPct = ((currentEq - initialEq) / initialEq) * 100.0;
  const bmReturnPct = ((currentBm - initialBm) / initialBm) * 100.0;

  return (
    <div className="relative w-full rounded-xl border border-slate-800/90 bg-[#070A11] p-3 overflow-hidden shadow-xl">
      {/* Legend & Stats Overlay */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-2 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-white font-bold">Strategy Equity:</span>
            <span className="text-emerald-400 font-bold">
              Rs. {formatNumber(currentEq)} ({returnPct >= 0 ? `+${returnPct.toFixed(2)}%` : `${returnPct.toFixed(2)}%`})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="text-slate-300 font-bold">KSE-100 Benchmark:</span>
            <span className="text-amber-400 font-bold">
              Rs. {formatNumber(currentBm)} ({bmReturnPct >= 0 ? `+${bmReturnPct.toFixed(2)}%` : `${bmReturnPct.toFixed(2)}%`})
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Lightweight Charts v5.3 • Daily Mark-to-Market Valuation
        </div>
      </div>

      <div ref={chartContainerRef} style={{ height: `${height}px` }} className="w-full" />
    </div>
  );
}
