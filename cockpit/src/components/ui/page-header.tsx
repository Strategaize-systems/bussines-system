"use client";

import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/60 px-8 py-6 shadow-sm sticky top-0 z-20">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-600 font-medium">{subtitle}</p>
            )}
          </div>
          {children && (
            <div className="flex items-center gap-3">{children}</div>
          )}
        </div>
      </div>
    </header>
  );
}
