"use client";

import { Search, Mic, Sparkles, Plus, type LucideIcon } from "lucide-react";
import { ReactNode, useState } from "react";
import { SearchAutocomplete, type SearchItem } from "./search-autocomplete";

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  autocompleteItems?: SearchItem[];
  showVoice?: boolean;
  showAI?: boolean;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  children?: ReactNode;
}

export function FilterBar({
  searchPlaceholder = "Suchen...",
  searchValue,
  onSearchChange,
  autocompleteItems,
  showVoice = true,
  showAI = true,
  actionLabel,
  actionIcon: ActionIcon = Plus,
  onAction,
  children,
}: FilterBarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
      <div className="flex items-center gap-4">
        {/* Search — with or without autocomplete */}
        {autocompleteItems && searchValue !== undefined && onSearchChange ? (
          <SearchAutocomplete
            items={autocompleteItems}
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        ) : (
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
                strokeWidth={2.5}
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all"
              />
            </div>
          </div>
        )}

        {/* Voice Button */}
        {showVoice && (
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition-all flex items-center gap-2 ${
              isRecording
                ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100 animate-pulse"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
            }`}
          >
            <Mic size={16} strokeWidth={2.5} />
            {isRecording ? "Aufnahme..." : "Voice"}
          </button>
        )}

        {/* AI Button */}
        {showAI && (
          <button
            onClick={() => setIsAIProcessing(!isAIProcessing)}
            className={`px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition-all flex items-center gap-2 ${
              isAIProcessing
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-transparent text-white shadow-lg"
                : "bg-gradient-to-r from-[#120774] to-[#4454b8] border-transparent text-white hover:shadow-lg"
            }`}
          >
            <Sparkles
              size={16}
              strokeWidth={2.5}
              className={isAIProcessing ? "animate-spin" : ""}
            />
            KI
          </button>
        )}

        {/* Filter Dropdowns (passed as children) */}
        {children}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Button */}
        {actionLabel && (
          <button
            onClick={onAction}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <ActionIcon size={16} strokeWidth={2.5} />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function FilterSelect({ value, onChange, options, className }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-4 py-2.5 rounded-lg border-2 border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all cursor-pointer ${className || ""}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
