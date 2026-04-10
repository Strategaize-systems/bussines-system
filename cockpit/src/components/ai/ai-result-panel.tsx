"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

interface AiResultPanelProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  loadingMessage?: string;
  children: React.ReactNode;
}

export function AiResultPanel({
  loading,
  error,
  onRetry,
  loadingMessage = "Analysiere...",
  children,
}: AiResultPanelProps) {
  if (loading) {
    return (
      <div className="text-center py-6">
        <Loader2
          size={24}
          className="mx-auto text-[#4454b8] animate-spin mb-2"
        />
        <p className="text-sm text-slate-500">{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-3 border border-red-100">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={onRetry}
              className="mt-1 text-xs font-bold text-red-600 hover:text-red-800"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
