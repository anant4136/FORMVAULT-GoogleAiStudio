import React from 'react';
import { ShieldCheck, Plus, Code2 } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenImport: () => void;
  onOpenCodeInspector: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'FormVault',
  subtitle = 'Offline Document Vault',
  onOpenImport,
  onOpenCodeInspector,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </h1>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                OFFLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onOpenCodeInspector}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Inspect Android Native Source Code"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Code</span>
          </button>

          <button
            onClick={onOpenImport}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>
      </div>
    </header>
  );
};
