import React, { useState } from 'react';
import {
  Moon,
  Sun,
  ShieldCheck,
  HardDrive,
  Trash2,
  FileCode,
  Download,
  Upload,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { VaultDocument } from '../types';

interface SettingsScreenProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  storageBytes: number;
  documentsCount: number;
  onPurgeCache: () => void;
  onOpenCodeInspector: () => void;
  documents: VaultDocument[];
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  isDarkMode,
  onToggleDarkMode,
  storageBytes,
  documentsCount,
  onPurgeCache,
  onOpenCodeInspector,
  documents,
}) => {
  const [cachePurged, setCachePurged] = useState(false);

  const handlePurge = () => {
    onPurgeCache();
    setCachePurged(true);
    setTimeout(() => setCachePurged(false), 2500);
  };

  const handleExportBackup = () => {
    const backupData = {
      app: 'FormVault',
      version: '1.0.0',
      exportedAt: Date.now(),
      documents: documents.map((d) => ({
        ...d,
      })),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formvault_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const storageMb = (storageBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-4 pb-24 text-xs">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-500">Preferences, offline privacy audit, and local storage</p>
      </div>

      {/* Offline & Privacy Architecture Guarantee */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl p-4 border border-emerald-200 dark:border-emerald-900/60 flex items-start space-x-3.5">
        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
            Zero Internet Dependency Verified
          </h3>
          <p className="text-emerald-800 dark:text-emerald-300/90 leading-relaxed text-[11px]">
            FormVault requires zero internet permissions. There are no tracking SDKs, no cloud
            databases (no Firebase, no Supabase), and no user login. Documents remain strictly in
            private local device storage.
          </p>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 space-y-3">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
          Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Dark Theme</p>
              <p className="text-slate-500 text-[11px]">Switch between light and dark palette</p>
            </div>
          </div>
          <button
            onClick={onToggleDarkMode}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
              isDarkMode ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
          </button>
        </div>
      </div>

      {/* Storage Management */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 space-y-3">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
          Local Storage
        </h3>
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Vault Consumption</p>
              <p className="text-slate-500 text-[11px]">
                {documentsCount} documents ({storageMb} MB used)
              </p>
            </div>
          </div>
          <button
            onClick={handlePurge}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
          >
            {cachePurged ? 'Cache Purged!' : 'Clear Temp Cache'}
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Export Vault Backup</p>
            <p className="text-slate-500 text-[11px]">JSON archive of all documents &amp; metadata</p>
          </div>
          <button
            onClick={handleExportBackup}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup</span>
          </button>
        </div>
      </div>

      {/* Android Architecture Inspector Trigger */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Native Android Codebase</p>
            <p className="text-slate-500 text-[11px]">
              Kotlin, Room entities, DAOs, StorageManager, and Compose UI
            </p>
          </div>
        </div>
        <button
          onClick={onOpenCodeInspector}
          className="px-3.5 py-1.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Inspect Code
        </button>
      </div>

      {/* System Technical Specifications */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
        <p className="font-bold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">
          Technical Specifications
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-400">Target Framework: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Android 15 (API 35)</span>
          </div>
          <div>
            <span className="text-slate-400">Language: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Kotlin 2.1.0</span>
          </div>
          <div>
            <span className="text-slate-400">UI Toolkit: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Jetpack Compose M3</span>
          </div>
          <div>
            <span className="text-slate-400">Local Database: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Room 2.6.1 (SQLite)</span>
          </div>
          <div>
            <span className="text-slate-400">Preferences: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Android DataStore</span>
          </div>
          <div>
            <span className="text-slate-400">Ads Provider: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">NoAdsProvider (Disabled)</span>
          </div>
        </div>
      </div>

      <div className="text-center pt-2 text-slate-400 text-[10px]">
        FORMVAULT • Version 1.0.0 • Offline-First Native Architecture
      </div>
    </div>
  );
};
