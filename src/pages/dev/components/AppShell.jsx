import React from "react";
import { Code2 } from "lucide-react";

export default function AppShell({ title, subtitle, icon: Icon = Code2, actions, children }) {
  return (
    <div className="text-slate-800 w-full flex flex-col min-h-0 animate-in fade-in duration-200">
      {title && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 shrink-0 shadow-sm">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">{title}</h1>
              {subtitle && <p className="text-[11px] sm:text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className="w-full flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
