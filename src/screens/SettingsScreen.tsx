import React, { useState, useRef } from 'react';
import {
  Moon,
  Sun,
  ShieldCheck,
  HardDrive,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  Lock,
  FileText,
  X,
  Info,
  Check,
  AlertCircle,
} from 'lucide-react';
import { VaultDocument } from '../types';

interface SettingsScreenProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  storageBytes: number;
  documentsCount: number;
  onPurgeCache: () => void;
  documents: VaultDocument[];
  onImportBackup?: (docs: VaultDocument[]) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  isDarkMode,
  onToggleDarkMode,
  storageBytes,
  documentsCount,
  onPurgeCache,
  documents,
  onImportBackup,
}) => {
  const [cachePurged, setCachePurged] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [backupStatusMsg, setBackupStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    a.download = `formvault_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupStatusMsg('Vault backup exported successfully!');
    setTimeout(() => setBackupStatusMsg(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.app === 'FormVault' && Array.isArray(parsed.documents)) {
          if (onImportBackup) {
            onImportBackup(parsed.documents);
            setBackupStatusMsg(`Restored ${parsed.documents.length} documents from backup!`);
          } else {
            setBackupStatusMsg('Backup format verified successfully.');
          }
        } else {
          alert('Invalid backup file format. Expected a FormVault JSON archive.');
        }
      } catch (err: any) {
        alert(`Failed to parse backup: ${err?.message || err}`);
      }
      setTimeout(() => setBackupStatusMsg(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const storageMb = (storageBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-4 pb-24 text-xs">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-500">Preferences, offline privacy audit, and local storage</p>
      </div>

      {backupStatusMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-3 rounded-2xl flex items-center space-x-2 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{backupStatusMsg}</span>
        </div>
      )}

      {/* Offline & Privacy Architecture Guarantee */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl p-4 border border-emerald-200 dark:border-emerald-900/60 flex items-start space-x-3.5">
        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
              100% Offline Architecture
            </h3>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100">
              AUDITED
            </span>
          </div>
          <p className="text-emerald-800 dark:text-emerald-300/90 leading-relaxed text-[11px]">
            FormVault requires zero internet permissions. There are no tracking SDKs, no cloud
            databases, no telemetry, and no user registration. Documents remain strictly in
            isolated device storage.
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
          Local Storage &amp; Backup
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

        {/* Backup Actions */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-2">
          <button
            onClick={handleExportBackup}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition flex items-center justify-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center justify-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
          </button>
        </div>
      </div>

      {/* Privacy Policy & Terms Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Privacy Policy &amp; Security</p>
            <p className="text-slate-500 text-[11px]">
              Offline data declaration, no tracking, zero cloud data transfer
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPrivacyPolicy(true)}
          className="px-3.5 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
        >
          View Policy
        </button>
      </div>

      {/* System Technical Specifications */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
        <p className="font-bold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">
          Production Release Specifications
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-400">App Name: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">FormVault</span>
          </div>
          <div>
            <span className="text-slate-400">Package: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">com.formvault.android</span>
          </div>
          <div>
            <span className="text-slate-400">Version: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">1.0.0 (Build 1)</span>
          </div>
          <div>
            <span className="text-slate-400">Target SDK: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Android 15 (API 35)</span>
          </div>
          <div>
            <span className="text-slate-400">Database Engine: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Room 2.6.1 (SQLite)</span>
          </div>
          <div>
            <span className="text-slate-400">Ads Provider: </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">NoAdsProvider (Active)</span>
          </div>
        </div>
      </div>

      <div className="text-center pt-2 text-slate-400 text-[10px]">
        FORMVAULT • Version 1.0.0 • Offline-First Native Architecture
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  FormVault Privacy &amp; Data Policy
                </h3>
              </div>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-semibold text-[11px]">
                Summary: FormVault collects zero personal data, maintains zero remote servers, uses zero
                advertising SDKs, and requires zero internet connectivity.
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  1. Local-Only Storage
                </h4>
                <p>
                  All documents, photographs, specimen signatures, marksheets, and metadata imported or
                  created within FormVault are stored exclusively in your device's isolated internal
                  storage. They never leave your physical device.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  2. Zero Network Transmission
                </h4>
                <p>
                  FormVault does not request or require the Android INTERNET permission. The application
                  cannot transmit, synchronize, or back up files to any external cloud, remote server, or
                  third-party analytics service.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  3. On-Device Image &amp; PDF Processing
                </h4>
                <p>
                  All image compression, dimension resizing, background removal, passport photo sheet
                  tiling, signature extraction, and PDF manipulation algorithms execute 100% locally on
                  your device's processor using hardware acceleration.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  4. No Accounts or Tracking
                </h4>
                <p>
                  You do not need to register, sign in, or provide an email address to use FormVault. No
                  device identifiers, advertising IDs, or telemetry data are collected or shared.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  5. User-Controlled Export &amp; Deletion
                </h4>
                <p>
                  You retain complete authority over your documents. Deleting a document or version from
                  the vault permanently removes it from your device. You can export clean ZIP packages or
                  JSON backups at any time.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
