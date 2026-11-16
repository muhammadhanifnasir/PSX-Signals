"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Failed to Fetch Market Data",
  message = "Could not establish a connection to the PSX Signal Intelligence backend. You are currently viewing cached or mock data.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-red-900/30 rounded-xl bg-red-950/10">
      <div className="w-12 h-12 rounded-xl bg-red-900/20 border border-red-800/40 flex items-center justify-center text-red-400 mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-red-200">{title}</h4>
      <p className="text-xs text-red-300/80 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
