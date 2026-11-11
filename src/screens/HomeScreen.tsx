import React, { useState } from 'react';
import {
  Search,
  HardDrive,
  Users,
  ChevronRight,
  ShieldCheck,
  FolderOpen,
  ArrowRight,
  UserCheck,
  FileDown,
  PenTool,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { VaultDocument, ApplicationProfile, NavScreen } from '../types';
import { DocumentCard } from '../components/DocumentCard';

interface HomeScreenProps {
  documents: VaultDocument[];
  profiles: ApplicationProfile[];
  storageBytes: number;
  onNavigate: (screen: NavScreen) => void;
  onSelectDocument: (doc: VaultDocument) => void;
  onOpenImport: () => void;
  onLaunchTool: (toolId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  documents,
  profiles,
  storageBytes,
  onNavigate,
  onSelectDocument,
  onOpenImport,
  onLaunchTool,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Quick search
  const filteredDocs = searchQuery.trim()
    ? documents.filter(
        (d) =>
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // Recent 5 documents
  const recentDocs = [...documents].sort((a, b) => b.lastAccessedAt - a.lastAccessedAt).slice(0, 5);

  const storageMb = (storageBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-5 pb-24">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents by name, category, or tags..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Search results overlay if searching */}
      {searchQuery.trim() && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Search Results ({filteredDocs.length})</span>
          </div>
          {filteredDocs.length > 0 ? (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <DocumentCard key={doc.id} document={doc} onClick={() => onSelectDocument(doc)} />
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-xs text-slate-400">
              No documents matched "{searchQuery}"
            </p>
          )}
        </div>
      )}

      {/* Quick Action Tool Launchers */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Quick Preparation
          </h2>
          <button
            onClick={() => onNavigate('tools')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center space-x-0.5 hover:underline"
          >
            <span>All Tools</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onLaunchTool('passport')}
            className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-500 transition text-center group shadow-2xs"
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
              Passport
            </span>
            <span className="block text-[9px] text-slate-400 truncate">35x45mm</span>
          </button>

          <button
            onClick={() => onLaunchTool('compress')}
            className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-500 transition text-center group shadow-2xs"
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
              Compress
            </span>
            <span className="block text-[9px] text-slate-400 truncate">&lt;50KB spec</span>
          </button>

          <button
            onClick={() => onLaunchTool('signature')}
            className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-500 transition text-center group shadow-2xs"
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <PenTool className="w-5 h-5" />
            </div>
            <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
              Signature
            </span>
            <span className="block text-[9px] text-slate-400 truncate">Clean PNG</span>
          </button>

          <button
            onClick={() => onLaunchTool('pdf')}
            className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-500 transition text-center group shadow-2xs"
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <FileDown className="w-5 h-5" />
            </div>
            <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
              PDF Studio
            </span>
            <span className="block text-[9px] text-slate-400 truncate">Merge &amp; Edit</span>
          </button>
        </div>
      </div>

      {/* Storage and Offline Status Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-4 text-white shadow-md shadow-blue-600/20 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-blue-100 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Isolated Internal Storage</span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight">
              {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
            </h3>
            <p className="text-xs text-blue-100">
              {storageMb} MB used • 100% Offline • Zero Cloud Telemetry
            </p>
          </div>

          <button
            onClick={onOpenImport}
            className="px-3.5 py-2 rounded-xl bg-white text-blue-700 text-xs font-extrabold hover:bg-blue-50 active:scale-95 transition shadow-sm"
          >
            + Add New
          </button>
        </div>
      </div>

      {/* Recently Accessed Documents Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Recently Accessed
          </h2>
          <button
            onClick={() => onNavigate('vault')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center space-x-0.5 hover:underline"
          >
            <span>View All ({documents.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentDocs.length > 0 ? (
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <DocumentCard key={doc.id} document={doc} onClick={() => onSelectDocument(doc)} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border border-slate-200 dark:border-slate-700">
            <FolderOpen className="w-10 h-10 mx-auto text-blue-500 mb-2" />
            <p className="font-bold text-sm text-slate-800 dark:text-white">Your Vault is Empty</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Import your degree certificates, passport, photo, and signature once to prepare customized
              formats anytime.
            </p>
            <button
              onClick={onOpenImport}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              Import First Document
            </button>
          </div>
        )}
      </div>

      {/* Application Profiles Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Application Bundles
          </h2>
          <button
            onClick={() => onNavigate('profiles')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center space-x-0.5 hover:underline"
          >
            <span>Manage</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {profiles.map((profile) => {
            const reqCount = profile.requirements?.length || profile.documentIds.length;
            const mappedCount = profile.requirements?.filter(r => Boolean(r.assignedDocumentId)).length || 0;
            return (
              <div
                key={profile.id}
                onClick={() => onNavigate('profiles')}
                className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 transition cursor-pointer flex flex-col justify-between shadow-2xs group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition">
                      {profile.title}
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      {mappedCount}/{reqCount} Mapped
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {profile.targetOrganization}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  <span>Prepare &amp; Export</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
