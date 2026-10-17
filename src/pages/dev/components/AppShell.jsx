import React from "react";

export default function AppShell({ title, children }) {
  return (
    <div className="w-full text-slate-100 animate-in fade-in duration-200">
      {title && (
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
        </div>
      )}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
