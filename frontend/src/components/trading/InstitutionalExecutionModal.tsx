"use client";

import React, { useState, useEffect } from "react";
import {
  OrderBracketSimulationRequest,
  OrderBracketSimulationResponse,
  FastOrderTicket,
  ProfitLockerPlanResponse,
} from "@/lib/types";
import { api } from "@/lib/api";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Download,
  Calculator,
  Sliders,
  DollarSign,
  AlertTriangle,
  FileCode2,
  Terminal,
  ExternalLink,
  Lock,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface InstitutionalExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  defaultPrice: number;
  defaultAction?: "BUY" | "SELL";
  defaultStopLoss?: number;
  defaultTarget?: number;
  isUpperLocked?: boolean;
  isDefaulter?: boolean;
  isNonCompliant?: boolean;
}

export function InstitutionalExecutionModal({
  isOpen,
  onClose,
  symbol,
  defaultPrice,
  defaultAction = "BUY",
  defaultStopLoss,
  defaultTarget,
  isUpperLocked = false,
  isDefaulter = false,
  isNonCompliant = false,
}: InstitutionalExecutionModalProps) {
  const [action, setAction] = useState<"BUY" | "SELL">(defaultAction);
  const [price, setPrice] = useState<number>(defaultPrice || 100);
  const [quantity, setQuantity] = useState<number>(1000);
  const [stopLoss, setStopLoss] = useState<number>(defaultStopLoss || Math.round(defaultPrice * 0.96 * 100) / 100);
  const [target1, setTarget1] = useState<number>(defaultTarget || Math.round(defaultPrice * 1.05 * 100) / 100);
  const [target2, setTarget2] = useState<number>(Math.round((defaultTarget || defaultPrice * 1.05) * 1.07 * 100) / 100);
  const [simMarketPrice, setSimMarketPrice] = useState<number>(defaultPrice || 100);
  const [isFiler, setIsFiler] = useState<boolean>(true);
  const [clientCode, setClientCode] = useState<string>("SCST-PRO");

  const [activeTab, setActiveTab] = useState<"SIMULATOR" | "TICKET" | "PROFIT_LOCKER">("SIMULATOR");
  const [simData, setSimData] = useState<OrderBracketSimulationResponse | null>(null);
  const [ticketData, setTicketData] = useState<FastOrderTicket | null>(null);
  const [lockerData, setLockerData] = useState<ProfitLockerPlanResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (symbol) {
      setPrice(defaultPrice || 100);
      setSimMarketPrice(defaultPrice || 100);
      setStopLoss(defaultStopLoss || Math.round((defaultPrice || 100) * 0.96 * 100) / 100);
      setTarget1(defaultTarget || Math.round((defaultPrice || 100) * 1.05 * 100) / 100);
      setTarget2(Math.round(((defaultTarget || defaultPrice * 1.05) || 100) * 1.07 * 100) / 100);
    }
  }, [symbol, defaultPrice, defaultStopLoss, defaultTarget]);

  // Recalculate simulation and profit locker whenever inputs change
  useEffect(() => {
    if (!isOpen || !symbol) return;

    let isMounted = true;
    setIsSimulating(true);

    const runSim = async () => {
      const simReq: OrderBracketSimulationRequest = {
        symbol,
        price,
        quantity,
        stop_loss: stopLoss,
        target_1: target1,
        is_filer: isFiler,
      };

      const [simRes, ticketRes, lockerRes] = await Promise.all([
        api.simulateOrderBracket(simReq),
        api.generateFastOrderTicket({
          symbol,
          action,
          price,
          quantity,
          stop_loss: stopLoss,
          target_1: target1,
          client_code: clientCode,
        }),
        api.getProfitLockerPlan({
          symbol,
          entry_price: price,
          current_price: simMarketPrice,
          quantity,
          stop_loss: stopLoss,
          target_1: target1,
          target_2: target2,
          is_filer: isFiler,
        }),
      ]);

      if (isMounted) {
        setSimData(simRes.data);
        setTicketData(ticketRes.data);
        setLockerData(lockerRes.data);
        setIsSimulating(false);
      }
    };

    const timer = setTimeout(runSim, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, symbol, price, quantity, stopLoss, target1, target2, simMarketPrice, isFiler, action, clientCode]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(label);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCsv = () => {
    if (!ticketData) return;
    const header = "Symbol,Side,OrderType,Qty,Price,DisclosedQty,Validity,ClientCode,TriggerPrice\n";
    const blob = new Blob([header + ticketData.scstrade_quick_string], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SCSTrade_Order_${symbol}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Institutional Order Bracket & Execution Terminal
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {symbol}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official PSX slippage depth, statutory charges (SECP/CVT/NCCPL/WHT), and broker execution formats.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 bg-slate-900 border-b border-slate-800 flex items-center gap-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab("SIMULATOR")}
            className={`pb-2.5 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === "SIMULATOR"
                ? "border-sky-500 text-sky-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Phase 3: Slippage & Bracket Cost Simulator
          </button>
          <button
            onClick={() => setActiveTab("TICKET")}
            className={`pb-2.5 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === "TICKET"
                ? "border-sky-500 text-sky-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Phase 4: SCSTrade & FIX 4.2 Fast-Order Ticket
          </button>
          <button
            onClick={() => setActiveTab("PROFIT_LOCKER")}
            className={`pb-2.5 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === "PROFIT_LOCKER"
                ? "border-emerald-500 text-emerald-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock className="w-4 h-4" />
            Phase 6: Profit Locker &amp; 50/50 Scale-Out
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Inputs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Side</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as "BUY" | "SELL")}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
              >
                <option value="BUY">BUY (Long)</option>
                <option value="SELL">SELL (Exit)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Price (PKR)</label>
              <input
                type="number"
                step="0.05"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Shares (Qty)</label>
              <input
                type="number"
                step="500"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Stop-Loss (PKR)</label>
              <input
                type="number"
                step="0.05"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-rose-300 font-semibold focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Target 1 (PKR)</label>
              <input
                type="number"
                step="0.05"
                value={target1}
                onChange={(e) => setTarget1(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-300 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Filer Status</label>
              <button
                type="button"
                onClick={() => setIsFiler(!isFiler)}
                className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                  isFiler
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}
              >
                {isFiler ? "Active Filer" : "Non-Filer"}
              </button>
            </div>
          </div>

          {/* TAB 1: BRACKET SIMULATION */}
          {activeTab === "SIMULATOR" && simData && (
            <div className="space-y-4">
              {/* Highlight Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-400">Effective Entry Price</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    PKR {simData.effective_entry_price.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-amber-400 font-medium">
                    +{simData.estimated_slippage_pct}% Slippage (PKR {simData.estimated_slippage_pkr.toLocaleString()})
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-400">True Breakeven Price</div>
                  <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
                    PKR {simData.breakeven_price.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    +{simData.breakeven_buffer_pct}% buffer to clear roundtrip friction
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-400">Target 1 Net Profit</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                    PKR {simData.target1_net_profit_pkr.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium">
                    +{simData.target1_net_return_pct}% Net Yield
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-400">Net Risk-Reward Ratio</div>
                  <div className={`text-lg font-bold font-mono mt-0.5 ${simData.risk_reward_ratio >= 2.0 ? "text-emerald-400" : "text-amber-400"}`}>
                    1 : {simData.risk_reward_ratio.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Net Risk: PKR {simData.risk_pkr.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Statutory PSX Breakdown Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Official PSX Statutory Taxes & Charges Schedule</span>
                  <span className="text-sky-400 font-mono">{simData.tax_filer_status}</span>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Brokerage Commission (0.15%):</span>
                    <div className="font-mono font-bold text-slate-200 mt-0.5">
                      PKR {simData.brokerage_commission_pkr.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">SECP Turnover Levy (0.002%):</span>
                    <div className="font-mono font-bold text-slate-200 mt-0.5">
                      PKR {simData.secp_turnover_levy_pkr.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Capital Value Tax (CVT 0.01%):</span>
                    <div className="font-mono font-bold text-slate-200 mt-0.5">
                      PKR {simData.cvt_pkr.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">NCCPL Settlement (PKR 0.001/shr):</span>
                    <div className="font-mono font-bold text-slate-200 mt-0.5">
                      PKR {simData.nccpl_charge_pkr.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Withholding Tax (WHT):</span>
                    <div className="font-mono font-bold text-slate-200 mt-0.5">
                      PKR {simData.wht_pkr.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-amber-300">Total Statutory (1-way):</span>
                    <div className="font-mono font-bold text-amber-400 mt-0.5">
                      PKR {simData.total_statutory_charges_pkr.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Capital Required (Entry + Slippage + Charges):</span>
                  <span className="font-mono font-bold text-white text-sm">
                    PKR {simData.effective_capital_required.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FAST-ORDER TICKET & FIX 4.2 */}
          {activeTab === "TICKET" && ticketData && (
            <div className="space-y-4">
              {/* Safety Checks Banner */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-white uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Pre-Trade Execution Safety Audit
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {ticketData.safety_checks.map((chk, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                        chk.passed
                          ? "bg-slate-900/60 border-slate-800 text-slate-300"
                          : "bg-rose-950/30 border-rose-500/40 text-rose-300"
                      }`}
                    >
                      {chk.passed ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold text-slate-100">{chk.rule}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{chk.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SCS Trade Quick-String */}
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">
                      SCS Trade Fast-Order Quick String
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Single-Paste Box
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(ticketData.scstrade_quick_string, "scs")}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
                  >
                    {copiedType === "scs" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {copiedType === "scs" ? "Copied" : "Copy String"}
                  </button>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-sky-300 select-all overflow-x-auto">
                  {ticketData.scstrade_quick_string}
                </div>
              </div>

              {/* FIX 4.2 Message */}
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">
                      FIX 4.2 Tag-Delimited Protocol Message
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      DMA / OMS Gateway
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(ticketData.fix_42_message, "fix")}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
                  >
                    {copiedType === "fix" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {copiedType === "fix" ? "Copied" : "Copy FIX"}
                  </button>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 select-all overflow-x-auto leading-relaxed">
                  {ticketData.fix_42_message}
                </div>
              </div>

              {/* Batch CSV Download Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleDownloadCsv}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-2 transition border border-slate-700"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Download SCSTrade Batch CSV Row
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PROFIT LOCKER & 50/50 SCALE-OUT */}
          {activeTab === "PROFIT_LOCKER" && lockerData && (
            <div className="space-y-4">
              {/* Dynamic Breakeven Ratchet Status Banner */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Auto-Breakeven Ratchet Engine
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          lockerData.trade_risk_status === "PROFIT_LOCKED"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : lockerData.trade_risk_status === "RISK_FREE_BREAKEVEN"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}>
                          {lockerData.trade_risk_status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {lockerData.guidance}
                      </p>
                    </div>
                  </div>

                  {/* Price Simulator Controller */}
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-mono">
                    <span className="text-slate-400 text-[11px]">Simulate Mkt Price:</span>
                    <input
                      type="number"
                      step="0.10"
                      value={simMarketPrice}
                      onChange={(e) => setSimMarketPrice(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-bold text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setSimMarketPrice(target1)}
                      className="px-2 py-1 rounded text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition"
                    >
                      Hit T1
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimMarketPrice(price)}
                      className="px-2 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Key Metrics: Breakeven Stop, Trailing Stop, Gain */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">TRUE BREAKEVEN STOP</span>
                    <span className="text-base font-bold text-sky-400">
                      Rs. {lockerData.breakeven_price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Entry + 0.35% Friction buffer
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">ACTIVE TRAILING STOP</span>
                    <span className="text-base font-bold text-emerald-400">
                      Rs. {lockerData.active_trailing_stop.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {lockerData.is_breakeven_locked ? "Locked to Breakeven (+0.35%)" : "At Initial Structural SL"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">UNREALIZED GAIN</span>
                    <span className={`text-base font-bold ${lockerData.unrealized_gain_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {lockerData.unrealized_gain_pct >= 0 ? "+" : ""}{lockerData.unrealized_gain_pct.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      At Rs. {lockerData.current_price.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">SCALE-OUT PHASE</span>
                    <span className="text-sm font-bold text-amber-300">
                      {lockerData.scale_out_phase.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {lockerData.recommended_action}
                    </span>
                  </div>
                </div>
              </div>

              {/* 50/50 Scale-Out Legs Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 font-mono text-xs">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300 font-sans">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>50/50 Scale-Out Execution Plan (Institutional Standard)</span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400">
                    Blended Net Return: +{lockerData.blended_target_return_pct.toFixed(2)}%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase bg-slate-900/40">
                        <th className="py-2.5 px-4">Execution Leg</th>
                        <th className="py-2.5 px-4 text-right">Shares (50%)</th>
                        <th className="py-2.5 px-4 text-right">Exit Target</th>
                        <th className="py-2.5 px-4 text-right">Net Return</th>
                        <th className="py-2.5 px-4 text-right">Net Profit</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {lockerData.scale_out_legs.map((leg, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-3 px-4 font-sans font-semibold text-white">
                            {leg.leg_name}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            {leg.quantity.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-400">
                            Rs. {leg.exit_price.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-300 font-bold">
                            +{leg.net_return_pct.toFixed(2)}%
                          </td>
                          <td className="py-3 px-4 text-right text-white font-bold">
                            PKR {Math.round(leg.net_pnl_pkr).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              leg.execution_status === "EXECUTED"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : leg.execution_status === "ACTIVE_RUNNER"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}>
                              {leg.execution_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-slate-400 font-sans">
                    Total Estimated Round-Trip Statutory Charges:{" "}
                    <strong className="font-mono text-amber-400">
                      PKR {Math.round(lockerData.total_statutory_fees_pkr).toLocaleString()}
                    </strong>
                  </div>
                  <div className="text-white font-sans">
                    Combined Target Net Profit:{" "}
                    <strong className="font-mono text-emerald-400 text-sm">
                      PKR {Math.round(lockerData.blended_target_profit_pkr).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Manual Broker Execution Protocol (No live auto orders).</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
          >
            Close Terminal
          </button>
        </div>
      </div>
    </div>
  );
}
