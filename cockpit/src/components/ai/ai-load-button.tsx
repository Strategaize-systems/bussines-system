"use client";

import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AiLoadButtonProps {
  onClick: () => void;
  loading: boolean;
  loaded: boolean;
  label?: string;
  refreshLabel?: string;
  refreshVariant?: "text" | "icon";
  className?: string;
}

export function AiLoadButton({
  onClick,
  loading,
  loaded,
  label = "KI-Analyse laden",
  refreshLabel = "Aktualisieren",
  refreshVariant = "text",
  className,
}: AiLoadButtonProps) {
  if (loaded) {
    if (refreshVariant === "icon") {
      return (
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${className ?? ""}`}
          onClick={onClick}
          disabled={loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      );
    }

    return (
      <button
        onClick={onClick}
        disabled={loading}
        className={`px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50 ${className ?? ""}`}
      >
        <RefreshCw
          className={`h-3 w-3 inline-block mr-1.5 ${loading ? "animate-spin" : ""}`}
        />
        {refreshLabel}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#120774] to-[#4454b8] text-white text-xs font-bold hover:shadow-md transition-all disabled:opacity-50 ${className ?? ""}`}
    >
      <Sparkles className="h-3 w-3 inline-block mr-1.5" />
      {label}
    </button>
  );
}
