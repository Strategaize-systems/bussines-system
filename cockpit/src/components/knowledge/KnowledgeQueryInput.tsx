"use client";

import { useState } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { VoiceRecordButton } from "@/components/voice/voice-record-button";

interface KnowledgeQueryInputProps {
  onSubmit: (query: string) => void;
  loading: boolean;
}

export function KnowledgeQueryInput({ onSubmit, loading }: KnowledgeQueryInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim() && !loading) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim() && !loading) {
      handleSubmit();
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setValue(text);
    onSubmit(text);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Frage zur Wissensbasis stellen..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all disabled:opacity-50"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-5 w-5 text-[#4454b8] animate-spin" />
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="p-1 rounded-lg bg-[#4454b8] text-white disabled:opacity-30 hover:bg-[#3a479e] transition-colors"
              title="Frage senden"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <VoiceRecordButton onTranscript={handleVoiceTranscript} />
    </div>
  );
}
