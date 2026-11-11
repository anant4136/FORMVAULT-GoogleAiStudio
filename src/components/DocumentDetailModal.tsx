import React, { useState } from 'react';
import {
  X,
  Download,
  Trash2,
  Calendar,
  FileCheck,
  HardDrive,
  Layers,
  Wrench,
  AlertTriangle,
  ExternalLink,
  Eye,
  FileText,
} from 'lucide-react';
import { VaultDocument, CATEGORIES, DocumentVersion } from '../types';
import { DocumentThumbnail } from './DocumentThumbnail';
import { PdfStudioTab } from './PdfStudioModal';

interface DocumentDetailModalProps {
  document: VaultDocument | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDeleteVersion: (docId: string, verId: string) => void;
  onLaunchToolWithDoc: (doc: VaultDocument, toolId: string) => void;
  onOpenPdfStudio?: (tab?: PdfStudioTab, doc?: VaultDocument) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
  onDelete,
  onDeleteVersion,
  onLaunchToolWithDoc,
  onOpenPdfStudio,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'versions'>('overview');

  if (!document) return null;

  const categoryInfo = CATEGORIES.find((c) => c.id === document.category) || CATEGORIES[0];
  const sizeKb = document.fileSizeBytes / 1024;
  const formattedSize =
    sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(2)} MB` : `${Math.round(sizeKb)} KB`;
  const formattedDate = new Date(document.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDownload = (dataUrl: string, filename: string) => {
    const a = window.document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${categoryInfo.color}`}>
              {categoryInfo.displayName}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {document.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3 border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Document Overview
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'versions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Prepared Versions</span>
            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[10px]">
              {document.versions?.length || 0}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'overview' ? (
            <>
              {/* Preview image / PDF */}
              <div className="w-full max-h-56 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center p-2 relative group min-h-[140px]">
                <DocumentThumbnail
                  dataUrl={document.dataUrl}
                  mimeType={document.mimeType}
                  title={document.title}
                  className="max-h-52 w-auto object-contain rounded-lg"
                  iconClassName="w-10 h-10"
                />

                <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                  {document.mimeType.includes('pdf') && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPdfStudio?.('viewer', document);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-xs flex items-center space-x-1.5 shadow"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open in PDF Viewer</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(document.dataUrl, document.originalFileName)}
                    className="bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-xs flex items-center space-x-1.5 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Quick Preparation Actions */}
              <div className="bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl p-3 border border-blue-100 dark:border-blue-900/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center space-x-1">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Prepare Form-Ready Variant</span>
                  </span>
                </div>
                {document.mimeType.includes('pdf') ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPdfStudio?.('split', document);
                      }}
                      className="bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-800 dark:text-slate-200 font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-left transition"
                    >
                      ✂️ Split / Extract Pages
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPdfStudio?.('manage', document);
                      }}
                      className="bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-800 dark:text-slate-200 font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-left transition"
                    >
                      📑 Reorder &amp; Rotate Pages
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPdfStudio?.('pdfToImages', document);
                      }}
                      className="bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-800 dark:text-slate-200 font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-left transition"
                    >
                      🖼️ Render PDF to Images
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPdfStudio?.('optimize', document);
                      }}
                      className="bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-800 dark:text-slate-200 font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-left transition"
                    >
                      📉 Optimize &amp; Compress PDF
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => {
                        onClose();
                        onLaunchToolWithDoc(document, 'compress');
                      }}
                      className="bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-800 dark:text-slate-200 font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-left transition"
                    >
                      📉 Compress (&lt;50KB)
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onLaunchToolWithDoc(document, 'passport');
                      }}
                      className="bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-800 dark:text-slate-200 font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-left transition"
                    >
                      👤 Passport (35x45mm)
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onLaunchToolWithDoc(document, 'signature');
                      }}
                      className="bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-800 dark:text-slate-200 font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-left transition"
                    >
                      ✍️ Clean Signature PNG
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPdfStudio?.('imagesToPdf', document);
                      }}
                      className="bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-800 dark:text-slate-200 font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-left transition"
                    >
                      📄 Convert to A4 PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Metadata Details */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 space-y-2.5 text-xs border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>File Name</span>
                  </span>
                  <span className="font-mono font-medium truncate max-w-[200px]">
                    {document.originalFileName}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Original Size</span>
                  </span>
                  <span className="font-mono font-semibold">{formattedSize}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Added to Vault</span>
                  </span>
                  <span className="font-medium">{formattedDate}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-400">Storage Location</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Private internal storage
                  </span>
                </div>
              </div>

              {/* Notes */}
              {document.notes && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 text-xs border border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">Notes</p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {document.notes}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Versions tab */
            <div className="space-y-3">
              {document.versions && document.versions.length > 0 ? (
                document.versions.map((version: DocumentVersion) => {
                  const verKb = version.fileSizeBytes / 1024;
                  const formattedVerSize =
                    verKb > 1024 ? `${(verKb / 1024).toFixed(1)} MB` : `${Math.round(verKb)} KB`;
                  return (
                    <div
                      key={version.id}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                          <DocumentThumbnail
                            dataUrl={version.dataUrl}
                            mimeType={version.mimeType}
                            title={version.label}
                            className="w-full h-full object-contain"
                            iconClassName="w-4 h-4"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {version.label}
                          </h4>
                          {version.targetSpec && (
                            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 truncate">
                              {version.targetSpec}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {formattedVerSize} • {new Date(version.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 ml-2">
                        <button
                          onClick={() =>
                            handleDownload(
                              version.dataUrl,
                              `${document.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${version.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${version.mimeType.includes('pdf') ? 'pdf' : version.mimeType.includes('png') ? 'png' : 'jpg'}`
                            )
                          }
                          className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                          title="Download version"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteVersion(document.id, version.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition"
                          title="Delete version"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    No prepared versions yet
                  </p>
                  <p className="mt-1">
                    Use the preparation tools above to generate resized photos, compressed files, or
                    PDFs.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {confirmDelete ? (
            <div className="w-full flex items-center justify-between space-x-2 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-900">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Permanently delete file &amp; versions?</span>
              </span>
              <div className="flex space-x-1.5">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDelete(document.id);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
              <button
                onClick={() => handleDownload(document.dataUrl, document.originalFileName)}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Original</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
