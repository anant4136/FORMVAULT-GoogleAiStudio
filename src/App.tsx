import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  addDocumentVersion,
  deleteDocumentVersion,
  getAllProfiles,
  saveProfile,
  deleteProfile,
  getStorageUsageBytes,
  purgeCache,
  seedInitialSamplesIfNeeded,
} from './storage/db';
import { VaultDocument, ApplicationProfile, DocumentVersion, NavScreen } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { ImportModal } from './components/ImportModal';
import { CodeInspectorModal } from './components/CodeInspectorModal';
import { SplashScreen } from './screens/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { VaultScreen } from './screens/VaultScreen';
import { ToolsScreen } from './screens/ToolsScreen';
import { ProfilesScreen } from './screens/ProfilesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PassportPhotoStudioModal } from './components/PassportPhotoStudioModal';
import { SignatureStudioModal } from './components/SignatureStudioModal';
import { PdfStudioModal, PdfStudioTab } from './components/PdfStudioModal';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<NavScreen>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Data states
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [profiles, setProfiles] = useState<ApplicationProfile[]>([]);
  const [storageBytes, setStorageBytes] = useState(0);

  // Modals & Navigation states
  const [selectedDocument, setSelectedDocument] = useState<VaultDocument | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCodeInspectorOpen, setIsCodeInspectorOpen] = useState(false);
  const [isPassportStudioOpen, setIsPassportStudioOpen] = useState(false);
  const [isSignatureStudioOpen, setIsSignatureStudioOpen] = useState(false);
  const [isPdfStudioOpen, setIsPdfStudioOpen] = useState(false);
  const [pdfStudioInitialTab, setPdfStudioInitialTab] = useState<PdfStudioTab>('viewer');

  // Tool specific selection
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [selectedDocForTool, setSelectedDocForTool] = useState<VaultDocument | null>(null);

  // Initialize data and dark mode
  const refreshData = useCallback(async () => {
    try {
      await seedInitialSamplesIfNeeded();
      const docs = await getAllDocuments();
      const profs = await getAllProfiles();
      const usage = await getStorageUsageBytes();

      setDocuments(docs);
      setProfiles(profs);
      setStorageBytes(usage.totalBytes);

      // Keep selectedDocument in sync if open
      if (selectedDocument) {
        const updated = docs.find((d) => d.id === selectedDocument.id);
        if (updated) setSelectedDocument(updated);
      }
    } catch (err) {
      console.error('Failed to load local vault data:', err);
    }
  }, [selectedDocument]);

  useEffect(() => {
    refreshData();
  }, []);

  // Sync dark theme class on documentElement
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Document actions
  const handleSaveDocument = async (
    docData: Omit<VaultDocument, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'versions'>
  ) => {
    const now = Date.now();
    const newDoc: VaultDocument = {
      ...docData,
      id: `doc-${now}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      versions: [],
    };

    await saveDocument(newDoc);
    await refreshData();
    setSelectedDocument(newDoc);
  };

  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id);
    if (selectedDocument?.id === id) {
      setSelectedDocument(null);
    }
    await refreshData();
  };

  const handleSaveVersion = async (docId: string, version: DocumentVersion) => {
    await addDocumentVersion(docId, version);
    await refreshData();
  };

  const handleDeleteVersion = async (docId: string, versionId: string) => {
    await deleteDocumentVersion(docId, versionId);
    await refreshData();
  };

  const handleSaveProfile = async (profile: ApplicationProfile) => {
    await saveProfile(profile);
    await refreshData();
  };

  const handleDeleteProfile = async (id: string) => {
    await deleteProfile(id);
    await refreshData();
  };

  const handleOpenPdfStudio = (tab: PdfStudioTab = 'viewer', doc?: VaultDocument) => {
    if (doc) {
      setSelectedDocForTool(doc);
    }
    setPdfStudioInitialTab(tab);
    setIsPdfStudioOpen(true);
  };

  // Launch a tool directly from home or document details
  const handleLaunchTool = (toolId: string, doc?: VaultDocument) => {
    if (doc) {
      setSelectedDocForTool(doc);
    }
    if (toolId === 'passport') {
      setIsPassportStudioOpen(true);
    } else if (toolId === 'signature') {
      setIsSignatureStudioOpen(true);
    } else if (toolId === 'pdf' || toolId.startsWith('pdf-')) {
      const tab =
        toolId === 'pdf-merge'
          ? 'merge'
          : toolId === 'pdf-split'
          ? 'split'
          : toolId === 'pdf-manage'
          ? 'manage'
          : toolId === 'pdf-optimize'
          ? 'optimize'
          : 'viewer';
      handleOpenPdfStudio(tab as PdfStudioTab, doc);
    } else {
      setActiveToolId(toolId);
      setCurrentScreen('tools');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex justify-center selection:bg-blue-600 selection:text-white">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Main Mobile App Container */}
      <div className="w-full max-w-md min-h-screen bg-slate-50/80 dark:bg-slate-900 shadow-xl border-x border-slate-200/80 dark:border-slate-800/80 flex flex-col relative">
        {/* Top Header */}
        <Header
          onOpenImport={() => setIsImportOpen(true)}
          onOpenCodeInspector={() => setIsCodeInspectorOpen(true)}
        />

        {/* Screen Content */}
        <main className="flex-1 p-4 overflow-y-auto">
          {currentScreen === 'home' && (
            <HomeScreen
              documents={documents}
              profiles={profiles}
              storageBytes={storageBytes}
              onNavigate={setCurrentScreen}
              onSelectDocument={setSelectedDocument}
              onOpenImport={() => setIsImportOpen(true)}
              onLaunchTool={(toolId) => handleLaunchTool(toolId)}
            />
          )}

          {currentScreen === 'vault' && (
            <VaultScreen
              documents={documents}
              onSelectDocument={setSelectedDocument}
              onOpenImport={() => setIsImportOpen(true)}
            />
          )}

          {currentScreen === 'tools' && (
            <ToolsScreen
              documents={documents}
              activeToolId={activeToolId}
              selectedDocForTool={selectedDocForTool}
              onSaveVersion={handleSaveVersion}
              onClearToolSelection={() => {
                setActiveToolId(null);
                setSelectedDocForTool(null);
              }}
              onOpenPassportStudio={() => setIsPassportStudioOpen(true)}
              onOpenSignatureStudio={() => setIsSignatureStudioOpen(true)}
              onOpenPdfStudio={handleOpenPdfStudio}
            />
          )}

          {currentScreen === 'profiles' && (
            <ProfilesScreen
              profiles={profiles}
              documents={documents}
              onSaveProfile={handleSaveProfile}
              onDeleteProfile={handleDeleteProfile}
              onSelectDocument={setSelectedDocument}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen
              isDarkMode={isDarkMode}
              onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
              storageBytes={storageBytes}
              documentsCount={documents.length}
              onPurgeCache={async () => {
                await purgeCache();
                await refreshData();
              }}
              onOpenCodeInspector={() => setIsCodeInspectorOpen(true)}
              documents={documents}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            if (screen !== 'tools') {
              setActiveToolId(null);
              setSelectedDocForTool(null);
            }
            setCurrentScreen(screen);
          }}
          vaultCount={documents.length}
        />

        {/* Modals */}
        <DocumentDetailModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDelete={handleDeleteDocument}
          onDeleteVersion={handleDeleteVersion}
          onLaunchToolWithDoc={(doc, toolId) => handleLaunchTool(toolId, doc)}
          onOpenPdfStudio={(tab, doc) => handleOpenPdfStudio(tab, doc)}
        />

        <ImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSaveDocument={handleSaveDocument}
        />

        <PassportPhotoStudioModal
          isOpen={isPassportStudioOpen}
          onClose={() => {
            setIsPassportStudioOpen(false);
            setSelectedDocForTool(null);
          }}
          documents={documents}
          initialDocument={selectedDocForTool}
          onSaveVersion={handleSaveVersion}
          onSaveNewDocument={handleSaveDocument}
        />

        <SignatureStudioModal
          isOpen={isSignatureStudioOpen}
          onClose={() => {
            setIsSignatureStudioOpen(false);
            setSelectedDocForTool(null);
          }}
          documents={documents}
          initialDocument={selectedDocForTool}
          onSaveVersion={handleSaveVersion}
          onSaveNewDocument={handleSaveDocument}
        />

        <CodeInspectorModal
          isOpen={isCodeInspectorOpen}
          onClose={() => setIsCodeInspectorOpen(false)}
        />

        <PdfStudioModal
          isOpen={isPdfStudioOpen}
          onClose={() => {
            setIsPdfStudioOpen(false);
            setSelectedDocForTool(null);
          }}
          documents={documents}
          initialDocument={selectedDocForTool}
          initialTab={pdfStudioInitialTab}
          onSaveVersion={handleSaveVersion}
          onSaveNewDocument={handleSaveDocument}
        />
      </div>
    </div>
  );
}
