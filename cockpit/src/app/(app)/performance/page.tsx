"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function PerformanceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/mein-tag");
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div
        role="status"
        aria-live="polite"
        className="max-w-lg rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 shadow-lg"
      >
        <div className="mb-3 flex items-center gap-2 text-blue-700">
          <Sparkles className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-xs font-bold uppercase tracking-wide">Hinweis</span>
        </div>
        <p className="text-sm font-semibold text-slate-900">
          Performance ist jetzt im Mein-Tag-KI-Workspace verfuegbar — Wochen-Performance-Berichts-Button.
        </p>
        <p className="mt-2 text-xs text-slate-600">Du wirst gleich weitergeleitet ...</p>
      </div>
    </main>
  );
}
