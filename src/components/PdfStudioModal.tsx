import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  FilePlus2,
  Scissors,
  Layers,
  Image as ImageIcon,
  Minimize2,
  Eye,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Lock,
  Sparkles,
  Save,
  Check,
} from 'lucide-react';
import { VaultDocument, DocumentVersion } from '../types';
import {
  PdfDocumentMetadata,
  getPdfMetadata,
  renderPdfPageToCanvas,
  renderPdfPageToImage,
  mergePdfs,
  splitPdf,
  managePdfPages,
  imagesToPdf,
  optimizePdf,
  ImagesToPdfOptions,
  OptimizePdfOptions,
  OptimizePdfResult,
  uint8ArrayToPdfDataUrl,
} from '../processing/pdfProcessor';
import { DocumentThumbnail } from './DocumentThumbnail';
import JSZip from 'jszip';

export type PdfStudioTab =
  | 'viewer'
  | 'merge'
  | 'split'
  | 'manage'
  | 'imagesToPdf'
  | 'pdfToImages'
  | 'optimize';

interface PdfStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: VaultDocument[];
  initialDocument?: VaultDocument | null;
  initialTab?: PdfStudioTab;
  onSaveVersion: (docId: string, version: DocumentVersion) => void;
  onSaveNewDocument: (
    doc: Omit<VaultDocument, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'versions'>
  ) => void;
}

export const PdfStudioModal: React.FC<PdfStudioModalProps> = ({
  isOpen,
  onClose,
  documents,
  initialDocument,
  initialTab = 'viewer',
  onSaveVersion,
  onSaveNewDocument,
}) => {
  const [activeTab, setActiveTab] = useState<PdfStudioTab>(initialTab);

  // Available PDF documents in the vault
  const pdfDocuments = documents.filter(
    (d) => d.mimeType === 'application/pdf' || d.dataUrl?.startsWith('data:application/pdf')
  );

  // Active selected PDF document
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDocument?.id || pdfDocuments[0]?.id || documents[0]?.id || ''
  );

  const activeDoc = documents.find((d) => d.id === selectedDocId) || initialDocument || documents[0];

  // Document metadata state
  const [docMeta, setDocMeta] = useState<PdfDocumentMetadata | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Processing & progress states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. VIEWER STATE
  const [viewerPage, setViewerPage] = useState(1);
  const [viewerZoom, setViewerZoom] = useState(1.0);
  const viewerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRenderingViewerPage, setIsRenderingViewerPage] = useState(false);

  // 2. MERGE STATE
  const [mergeQueue, setMergeQueue] = useState<{ id: string; name: string; dataUrl: string; pageCount?: number }[]>([]);
  const [mergeResult, setMergeResult] = useState<{ dataUrl: string; pageCount: number; sizeBytes: number } | null>(null);

  // 3. SPLIT STATE
  const [splitMode, setSplitMode] = useState<'single' | 'custom'>('custom');
  const [splitCustomRange, setSplitCustomRange] = useState('1-1');
  const [splitResults, setSplitResults] = useState<{ label: string; dataUrl: string; pageCount: number; sizeBytes: number }[]>([]);

  // 4. PAGE MANAGEMENT STATE
  const [pageCards, setPageCards] = useState<
    { id: string; originalIndex: number; pageNumber: number; rotation: number; isDeleted: boolean; thumbUrl?: string }[]
  >([]);
  const [manageResult, setManageResult] = useState<{ dataUrl: string; pageCount: number; sizeBytes: number } | null>(null);

  // 5. IMAGES TO PDF STATE
  const [selectedImages, setSelectedImages] = useState<{ id: string; name: string; dataUrl: string }[]>([]);
  const [imgPdfPageSize, setImgPdfPageSize] = useState<'A4' | 'LETTER' | 'FIT'>('A4');
  const [imgPdfFitMode, setImgPdfFitMode] = useState<'contain' | 'cover'>('contain');
  const [imgPdfMargin, setImgPdfMargin] = useState<number>(10);
  const [imgPdfQuality, setImgPdfQuality] = useState<number>(0.85);
  const [imagesToPdfResult, setImagesToPdfResult] = useState<{ dataUrl: string; pageCount: number; sizeBytes: number } | null>(null);

  // 6. PDF TO IMAGES STATE
  const [exportFormat, setExportFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [exportDpi, setExportDpi] = useState<number>(150);
  const [renderedPages, setRenderedPages] = useState<{ pageNumber: number; dataUrl: string; width: number; height: number; sizeBytes: number }[]>([]);

  // 7. OPTIMIZE STATE
  const [optimizeLevel, setOptimizeLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [stripMetadata, setStripMetadata] = useState(true);
  const [optimizeResult, setOptimizeResult] = useState<OptimizePdfResult | null>(null);

  // Update selected doc if initialDocument changes
  useEffect(() => {
    if (initialDocument) {
      setSelectedDocId(initialDocument.id);
    }
  }, [initialDocument]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Load document metadata whenever activeDoc changes
  useEffect(() => {
    if (!activeDoc?.dataUrl) return;

    let isMounted = true;
    setIsLoadingMeta(true);
    setMetaError(null);
    setViewerPage(1);

    getPdfMetadata(activeDoc.dataUrl)
      .then((meta) => {
        if (!isMounted) return;
        setDocMeta(meta);
        if (meta.isEncrypted) {
          setMetaError('This PDF document is password-protected or encrypted. FormVault respects security policies and does not bypass encryption without user credentials.');
        }

        // Initialize page management cards
        const initialCards = meta.pages.map((p, idx) => ({
          id: `page-${idx}`,
          originalIndex: idx,
          pageNumber: p.pageNumber,
          rotation: 0,
          isDeleted: false,
        }));
        setPageCards(initialCards);

        // Preload queue for merge if empty
        if (mergeQueue.length === 0) {
          setMergeQueue([
            {
              id: activeDoc.id,
              name: activeDoc.title,
              dataUrl: activeDoc.dataUrl,
              pageCount: meta.pageCount,
            },
          ]);
        }
      })
      .catch((err) => {
        if (isMounted) setMetaError(`Failed to parse PDF metadata: ${String(err)}`);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMeta(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeDoc?.dataUrl]);

  // Render Viewer Page onto canvas
  useEffect(() => {
    if (activeTab !== 'viewer' || !activeDoc?.dataUrl || !docMeta || docMeta.pageCount === 0 || docMeta.isEncrypted) {
      return;
    }

    let isMounted = true;
    setIsRenderingViewerPage(true);

    renderPdfPageToCanvas(activeDoc.dataUrl, viewerPage, viewerZoom)
      .then(({ canvas }) => {
        if (!isMounted || !viewerCanvasRef.current) return;
        const target = viewerCanvasRef.current;
        target.width = canvas.width;
        target.height = canvas.height;
        const ctx = target.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, target.width, target.height);
          ctx.drawImage(canvas, 0, 0);
        }
      })
      .catch((err) => {
        console.warn('Viewer render error:', err);
      })
      .finally(() => {
        if (isMounted) setIsRenderingViewerPage(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, activeDoc?.dataUrl, viewerPage, viewerZoom, docMeta]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 1. MERGE HANDLER
  const handleRunMerge = async () => {
    if (mergeQueue.length < 2) {
      alert('Please add at least 2 PDF documents to merge.');
      return;
    }
    try {
      setIsProcessing(true);
      const res = await mergePdfs(mergeQueue, (pct, status) => {
        setProgressPercent(pct);
        setProgressStatus(status);
      });
      setMergeResult(res);
      showNotification('PDF documents merged successfully!');
    } catch (err) {
      alert(`Merge failed: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. SPLIT HANDLER
  const handleRunSplit = async () => {
    if (!activeDoc?.dataUrl || !docMeta) return;

    try {
      setIsProcessing(true);
      const ranges = [];
      if (splitMode === 'single') {
        for (let p = 1; p <= docMeta.pageCount; p++) {
          ranges.push({
            id: `p-${p}`,
            label: `Page ${p}`,
            startPage: p,
            endPage: p,
          });
        }
      } else {
        // Parse custom range e.g. "1-2, 3-4" or "1-3"
        const parts = splitCustomRange.split(',').map((s) => s.trim());
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (part.includes('-')) {
            const [s, e] = part.split('-').map((n) => parseInt(n.trim(), 10));
            if (!isNaN(s) && !isNaN(e) && s > 0 && e >= s) {
              ranges.push({
                id: `range-${i}`,
                label: `Pages ${s}–${e}`,
                startPage: s,
                endPage: Math.min(docMeta.pageCount, e),
              });
            }
          } else {
            const p = parseInt(part, 10);
            if (!isNaN(p) && p > 0 && p <= docMeta.pageCount) {
              ranges.push({
                id: `range-${i}`,
                label: `Page ${p}`,
                startPage: p,
                endPage: p,
              });
            }
          }
        }
      }

      if (ranges.length === 0) {
        alert('Please specify a valid page range (e.g., 1-2).');
        setIsProcessing(false);
        return;
      }

      const results = await splitPdf(activeDoc.dataUrl, ranges, (pct, status) => {
        setProgressPercent(pct);
        setProgressStatus(status);
      });
      setSplitResults(results);
      showNotification(`Extracted ${results.length} PDF partitions!`);
    } catch (err) {
      alert(`Split failed: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. MANAGE PAGES HANDLER
  const handleRunManagePages = async () => {
    if (!activeDoc?.dataUrl) return;

    try {
      setIsProcessing(true);
      const ops = pageCards.map((c) => ({
        originalPageIndex: c.originalIndex,
        rotationAngleToAdd: c.rotation,
        isDeleted: c.isDeleted,
      }));

      const res = await managePdfPages(activeDoc.dataUrl, ops, (pct, status) => {
        setProgressPercent(pct);
        setProgressStatus(status);
      });

      setManageResult(res);
      showNotification('Page organization and rotations applied!');
    } catch (err) {
      alert(`Failed to manage pages: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. IMAGES TO PDF HANDLER
  const handleRunImagesToPdf = async () => {
    if (selectedImages.length === 0) {
      alert('Please add at least one image.');
      return;
    }
    try {
      setIsProcessing(true);
      const opts: ImagesToPdfOptions = {
        pageSize: imgPdfPageSize,
        fitMode: imgPdfFitMode,
        marginMm: imgPdfMargin,
        quality: imgPdfQuality,
        title: 'FormVault Image Bundle',
      };
      const res = await imagesToPdf(selectedImages, opts, (pct, status) => {
        setProgressPercent(pct);
        setProgressStatus(status);
      });
      setImagesToPdfResult(res);
      showNotification('Images converted to standardized PDF!');
    } catch (err) {
      alert(`Images to PDF failed: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. PDF TO IMAGES HANDLER
  const handleRunPdfToImages = async () => {
    if (!activeDoc?.dataUrl || !docMeta) return;

    try {
      setIsProcessing(true);
      setRenderedPages([]);
      const rendered = [];

      for (let p = 1; p <= docMeta.pageCount; p++) {
        setProgressPercent(Math.round((p / docMeta.pageCount) * 100));
        setProgressStatus(`Rendering Page ${p} at ${exportDpi} DPI...`);
        const imgRes = await renderPdfPageToImage(activeDoc.dataUrl, p, exportFormat, exportDpi);
        rendered.push({
          pageNumber: p,
          ...imgRes,
        });
      }

      setRenderedPages(rendered);
      showNotification(`Rendered ${rendered.length} pages as high-resolution images!`);
    } catch (err) {
      alert(`PDF to images rendering failed: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. OPTIMIZE HANDLER
  const handleRunOptimize = async () => {
    if (!activeDoc?.dataUrl) return;

    try {
      setIsProcessing(true);
      const opts: OptimizePdfOptions = {
        level: optimizeLevel,
        compressImages: true,
        stripMetadata,
      };
      const res = await optimizePdf(activeDoc.dataUrl, opts, (pct, status) => {
        setProgressPercent(pct);
        setProgressStatus(status);
      });
      setOptimizeResult(res);
      showNotification('Optimization completed!');
    } catch (err) {
      alert(`Optimization failed: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save to Vault helper
  const handleSaveToVaultAsVersion = (dataUrl: string, label: string, sizeBytes: number) => {
    if (!activeDoc) return;
    const version: DocumentVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      documentId: activeDoc.id,
      label,
      mimeType: 'application/pdf',
      fileSizeBytes: sizeBytes,
      dataUrl,
      targetSpec: label,
      createdAt: Date.now(),
    };
    onSaveVersion(activeDoc.id, version);
    showNotification(`Saved "${label}" to ${activeDoc.title} versions!`);
  };

  const handleSaveToVaultAsNewDoc = (dataUrl: string, title: string, sizeBytes: number) => {
    onSaveNewDocument({
      title,
      category: 'ACADEMIC',
      originalFileName: `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
      mimeType: 'application/pdf',
      fileSizeBytes: sizeBytes,
      dataUrl,
      notes: `Generated offline in FormVault PDF Studio.`,
      tags: ['pdf', 'formvault-studio'],
    });
    showNotification(`Saved "${title}" as a new document in My Vault!`);
  };

  // Download helper
  const downloadFile = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-4xl h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  FormVault PDF Studio
                </h2>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                  100% OFFLINE
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Merge, split, manage pages, convert, optimize, and inspect PDFs locally
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Active Document Selector */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
              <span className="text-slate-400 font-medium text-[11px]">Source:</span>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none max-w-[150px] truncate"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.mimeType.includes('pdf') ? 'PDF' : 'IMG'})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-800 px-3 bg-slate-50/40 dark:bg-slate-900/40 scrollbar-none text-[11px]">
          <button
            onClick={() => setActiveTab('viewer')}
            className={`py-2.5 px-3 border-b-2 font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'viewer'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>PDF Viewer</span>
          </button>

          <button
            onClick={() => setActiveTab('merge')}
            className={`py-2.5 px-3 border-b-2 font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'merge'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>Merge PDFs</span>
          </button>

          <button
            onClick={() => setActiveTab('split')}
            className={`py-2.5 px-3 border-b-2 font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'split'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split PDF</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`py-2.5 px-3 border-b-2 font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'manage'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manage Pages</span>
          </button>

          <button
            onClick={() => setActiveTab('imagesToPdf')}
            className={`py-2.5 px-3 border-b-2 font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'imagesToPdf'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Images to PDF</span>
          </button>

          <button
            onClick={() => setActiveTab('pdfToImages')}
            className={`py-2.5 px-3 border-b-2 font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'pdfToImages'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF to Images</span>
          </button>

          <button
            onClick={() => setActiveTab('optimize')}
            className={`py-2.5 px-3 border-b-2 font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'optimize'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Optimize PDF</span>
          </button>
        </div>

        {/* Notification Toast */}
        {successMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center space-x-2 animate-in slide-in-from-top-2">
            <Check className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Processing Progress Bar */}
        {isProcessing && (
          <div className="bg-blue-50 dark:bg-blue-950 p-2 border-b border-blue-200 dark:border-blue-900">
            <div className="flex justify-between text-[11px] font-semibold text-blue-800 dark:text-blue-200 mb-1">
              <span>{progressStatus || 'Processing PDF locally...'}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Encryption / Corrupt Error Alert */}
          {metaError && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-start space-x-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                  Document Security Notice
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  {metaError}
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: PDF VIEWER */}
          {activeTab === 'viewer' && (
            <div className="h-full flex flex-col space-y-3">
              {/* Viewer Control Bar */}
              <div className="bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    disabled={viewerPage <= 1}
                    onClick={() => setViewerPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Page {viewerPage} of {docMeta?.pageCount || 1}
                  </span>
                  <button
                    disabled={!docMeta || viewerPage >= docMeta.pageCount}
                    onClick={() => {
                      if (docMeta) setViewerPage((p) => Math.min(docMeta.pageCount, p + 1));
                    }}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setViewerZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono font-bold text-xs w-12 text-center text-slate-600 dark:text-slate-300">
                    {Math.round(viewerZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setViewerZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewerZoom(1.0)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                  >
                    100%
                  </button>
                </div>

                {/* Document Information summary */}
                <div className="text-[11px] text-slate-500 font-mono">
                  {docMeta ? `${docMeta.pageCount} pgs • ${Math.round(docMeta.fileSizeBytes / 1024)} KB` : 'Loading...'}
                </div>
              </div>

              {/* Viewer Canvas Container */}
              <div className="flex-1 bg-slate-200 dark:bg-slate-950 rounded-2xl border border-slate-300 dark:border-slate-800 p-4 flex items-center justify-center overflow-auto min-h-[350px] relative">
                {isRenderingViewerPage && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center">
                    <span className="font-bold text-blue-600 text-xs">Rendering Page {viewerPage}...</span>
                  </div>
                )}
                <canvas
                  ref={viewerCanvasRef}
                  className="shadow-xl rounded-md bg-white border border-slate-300 dark:border-slate-700 max-w-full"
                />
              </div>

              {/* Quick Jump Thumbnail Strip */}
              {docMeta && docMeta.pageCount > 1 && (
                <div className="flex items-center space-x-2 overflow-x-auto py-2">
                  {Array.from({ length: docMeta.pageCount }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setViewerPage(i + 1)}
                      className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition ${
                        viewerPage === i + 1
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Pg {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MERGE PDFS */}
          {activeTab === 'merge' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                  Combine Multiple PDF Documents
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Preserves original documents, maintains bookmarks and text streams, and lets you reorder pages as needed.
                </p>
              </div>

              {/* Queue List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                    Documents in Merge Sequence ({mergeQueue.length})
                  </span>
                  <div className="flex items-center space-x-2">
                    <select
                      onChange={(e) => {
                        const doc = documents.find((d) => d.id === e.target.value);
                        if (doc && doc.dataUrl) {
                          setMergeQueue((prev) => [
                            ...prev,
                            { id: doc.id, name: doc.title, dataUrl: doc.dataUrl },
                          ]);
                        }
                      }}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-semibold"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        + Add from Vault...
                      </option>
                      {documents.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {mergeQueue.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {item.name}
                        </p>
                        {item.pageCount && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            {item.pageCount} pages
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        disabled={idx === 0}
                        onClick={() => {
                          const copy = [...mergeQueue];
                          const temp = copy[idx - 1];
                          copy[idx - 1] = copy[idx];
                          copy[idx] = temp;
                          setMergeQueue(copy);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={idx === mergeQueue.length - 1}
                        onClick={() => {
                          const copy = [...mergeQueue];
                          const temp = copy[idx + 1];
                          copy[idx + 1] = copy[idx];
                          copy[idx] = temp;
                          setMergeQueue(copy);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setMergeQueue(mergeQueue.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                disabled={mergeQueue.length < 2 || isProcessing}
                onClick={handleRunMerge}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-xs transition"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Merge {mergeQueue.length} Documents</span>
              </button>

              {/* Merge Result Preview */}
              {mergeResult && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Merged Document Ready ({mergeResult.pageCount} Pages • {Math.round(mergeResult.sizeBytes / 1024)} KB)</span>
                    </span>
                  </div>
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => handleSaveToVaultAsNewDoc(mergeResult.dataUrl, 'Merged Application Bundle', mergeResult.sizeBytes)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition"
                    >
                      Save to Vault
                    </button>
                    <button
                      onClick={() => downloadFile(mergeResult.dataUrl, 'merged_bundle.pdf')}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPLIT PDF */}
          {activeTab === 'split' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                  Split Document into Separate Pages or Ranges
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Source: <strong>{activeDoc.title}</strong> ({docMeta?.pageCount || 0} pages total)
                </p>
              </div>

              <div className="flex space-x-3">
                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="splitMode"
                    checked={splitMode === 'custom'}
                    onChange={() => setSplitMode('custom')}
                    className="accent-blue-600"
                  />
                  <span>Custom Page Ranges</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="splitMode"
                    checked={splitMode === 'single'}
                    onChange={() => setSplitMode('single')}
                    className="accent-blue-600"
                  />
                  <span>Extract Every Page Separately</span>
                </label>
              </div>

              {splitMode === 'custom' && (
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                    Specify Page Ranges (comma separated, e.g. 1-1, 2-2):
                  </label>
                  <input
                    type="text"
                    value={splitCustomRange}
                    onChange={(e) => setSplitCustomRange(e.target.value)}
                    placeholder="e.g. 1-2, 3-5"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
              )}

              <button
                disabled={isProcessing || !docMeta || docMeta.pageCount === 0}
                onClick={handleRunSplit}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-xs transition"
              >
                <Scissors className="w-4 h-4" />
                <span>Execute Split Operation</span>
              </button>

              {/* Split Results */}
              {splitResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                    Generated Extracted Partitions ({splitResults.length})
                  </span>
                  <div className="space-y-2">
                    {splitResults.map((res, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {res.label}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {res.pageCount} pgs • {Math.round(res.sizeBytes / 1024)} KB
                          </p>
                        </div>
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => handleSaveToVaultAsNewDoc(res.dataUrl, `${activeDoc.title} - ${res.label}`, res.sizeBytes)}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 font-semibold rounded-lg text-[11px]"
                          >
                            Save to Vault
                          </button>
                          <button
                            onClick={() => downloadFile(res.dataUrl, `${activeDoc.title}_${res.label}.pdf`)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-[11px]"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PAGE MANAGEMENT */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                    Reorder, Rotate &amp; Remove Pages
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Click rotate to turn 90°, arrow buttons to reorder, or trash to exclude from the final PDF.
                  </p>
                </div>
                <button
                  disabled={isProcessing}
                  onClick={handleRunManagePages}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition"
                >
                  Export Updated PDF
                </button>
              </div>

              {/* Page Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {pageCards.map((card, idx) => (
                  <div
                    key={card.id}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col justify-between ${
                      card.isDeleted
                        ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 opacity-60'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                          Page {card.pageNumber}
                        </span>
                        {card.rotation > 0 && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1 rounded">
                            {card.rotation}°
                          </span>
                        )}
                      </div>

                      {/* Mock/Preview Tile */}
                      <div className="w-full h-28 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600 relative overflow-hidden">
                        <div
                          style={{ transform: `rotate(${card.rotation}deg)` }}
                          className="transition-transform duration-300 flex flex-col items-center"
                        >
                          <FileText className="w-8 h-8 text-blue-600/70" />
                          <span className="text-[9px] font-mono text-slate-500 mt-1">
                            Page {card.pageNumber}
                          </span>
                        </div>
                        {card.isDeleted && (
                          <div className="absolute inset-0 bg-rose-600/20 backdrop-blur-2xs flex items-center justify-center font-bold text-rose-700 text-xs">
                            EXCLUDED
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => {
                          const copy = [...pageCards];
                          copy[idx].rotation = (copy[idx].rotation + 90) % 360;
                          setPageCards(copy);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={idx === 0}
                        onClick={() => {
                          const copy = [...pageCards];
                          const temp = copy[idx - 1];
                          copy[idx - 1] = copy[idx];
                          copy[idx] = temp;
                          setPageCards(copy);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-30"
                        title="Move Left"
                      >
                        <ArrowUp className="w-3.5 h-3.5 rotate-[-90deg]" />
                      </button>
                      <button
                        disabled={idx === pageCards.length - 1}
                        onClick={() => {
                          const copy = [...pageCards];
                          const temp = copy[idx + 1];
                          copy[idx + 1] = copy[idx];
                          copy[idx] = temp;
                          setPageCards(copy);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-30"
                        title="Move Right"
                      >
                        <ArrowDown className="w-3.5 h-3.5 rotate-[-90deg]" />
                      </button>
                      <button
                        onClick={() => {
                          const copy = [...pageCards];
                          copy[idx].isDeleted = !copy[idx].isDeleted;
                          setPageCards(copy);
                        }}
                        className={`p-1.5 rounded-lg transition ${
                          card.isDeleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        }`}
                        title={card.isDeleted ? 'Restore Page' : 'Exclude Page'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {manageResult && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                    Updated PDF Ready ({manageResult.pageCount} Pages • {Math.round(manageResult.sizeBytes / 1024)} KB)
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSaveToVaultAsVersion(manageResult.dataUrl, 'Organized Pages', manageResult.sizeBytes)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs"
                    >
                      Save Version
                    </button>
                    <button
                      onClick={() => downloadFile(manageResult.dataUrl, `${activeDoc.title}_reordered.pdf`)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 rounded-xl font-bold text-xs border"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: IMAGES TO PDF */}
          {activeTab === 'imagesToPdf' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                  Create PDF from Images
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Select scanned certificate photos, receipts, or portraits and compile into a standardized multi-page PDF.
                </p>
              </div>

              {/* Image Selection Queue */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                    Selected Images ({selectedImages.length})
                  </span>
                  <select
                    onChange={(e) => {
                      const doc = documents.find((d) => d.id === e.target.value);
                      if (doc && doc.dataUrl) {
                        setSelectedImages((prev) => [
                          ...prev,
                          { id: doc.id, name: doc.title, dataUrl: doc.dataUrl },
                        ]);
                      }
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-semibold"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      + Add Image from Vault...
                    </option>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedImages.map((img, i) => (
                    <div
                      key={`${img.id}-${i}`}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative group"
                    >
                      <div className="w-full h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                        <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate mt-1">
                        {img.name}
                      </p>
                      <button
                        onClick={() => setSelectedImages(selectedImages.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formatting Options */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  Page Layout &amp; Margins
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">Page Size</label>
                    <select
                      value={imgPdfPageSize}
                      onChange={(e) => setImgPdfPageSize(e.target.value as any)}
                      className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border text-xs font-semibold"
                    >
                      <option value="A4">A4 (Standard)</option>
                      <option value="LETTER">US Letter</option>
                      <option value="FIT">Fit to Image Size</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">Fitting</label>
                    <select
                      value={imgPdfFitMode}
                      onChange={(e) => setImgPdfFitMode(e.target.value as any)}
                      className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border text-xs font-semibold"
                    >
                      <option value="contain">Contain (Keep Margins)</option>
                      <option value="cover">Fill Page (Cover)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">Margins</label>
                    <select
                      value={imgPdfMargin}
                      onChange={(e) => setImgPdfMargin(Number(e.target.value))}
                      className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border text-xs font-semibold"
                    >
                      <option value={0}>None (0mm)</option>
                      <option value={10}>Compact (10mm)</option>
                      <option value={20}>Standard (20mm)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                disabled={selectedImages.length === 0 || isProcessing}
                onClick={handleRunImagesToPdf}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-xs transition"
              >
                <FileText className="w-4 h-4" />
                <span>Generate PDF from {selectedImages.length} Images</span>
              </button>

              {imagesToPdfResult && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                    Generated PDF ({imagesToPdfResult.pageCount} Pages • {Math.round(imagesToPdfResult.sizeBytes / 1024)} KB)
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSaveToVaultAsNewDoc(imagesToPdfResult.dataUrl, 'Compiled Document Scan', imagesToPdfResult.sizeBytes)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs"
                    >
                      Save to Vault
                    </button>
                    <button
                      onClick={() => downloadFile(imagesToPdfResult.dataUrl, 'compiled_images.pdf')}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 rounded-xl font-bold text-xs border"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PDF TO IMAGES */}
          {activeTab === 'pdfToImages' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                  Render PDF Pages to High-Resolution Images
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Rasterize vector pages locally for form submissions, portals, or image editing.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Output Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border text-xs font-semibold"
                  >
                    <option value="image/png">PNG (Lossless &amp; Sharp)</option>
                    <option value="image/jpeg">JPEG (Compressed &amp; Compact)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Resolution (DPI)
                  </label>
                  <select
                    value={exportDpi}
                    onChange={(e) => setExportDpi(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border text-xs font-semibold"
                  >
                    <option value={72}>72 DPI (Web Screen Size)</option>
                    <option value={150}>150 DPI (Standard Print / Portal)</option>
                    <option value={300}>300 DPI (High-Res Archival)</option>
                  </select>
                </div>
              </div>

              <button
                disabled={isProcessing || !docMeta || docMeta.pageCount === 0}
                onClick={handleRunPdfToImages}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Render All {docMeta?.pageCount || 0} Pages to Images</span>
              </button>

              {/* Rendered Images Results */}
              {renderedPages.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      Rendered Images ({renderedPages.length})
                    </span>
                    <button
                      onClick={async () => {
                        const zip = new JSZip();
                        renderedPages.forEach((p) => {
                          const ext = exportFormat === 'image/png' ? 'png' : 'jpg';
                          const base64 = p.dataUrl.split(',')[1];
                          zip.file(`page_${p.pageNumber}.${ext}`, base64, { base64: true });
                        });
                        const blob = await zip.generateAsync({ type: 'blob' });
                        const url = URL.createObjectURL(blob);
                        downloadFile(url, `${activeDoc.title}_pages_images.zip`);
                      }}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold rounded-xl text-xs"
                    >
                      Download All as ZIP
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {renderedPages.map((pg) => (
                      <div
                        key={pg.pageNumber}
                        className="bg-white dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs"
                      >
                        <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center border">
                          <img src={pg.dataUrl} alt={`Page ${pg.pageNumber}`} className="max-h-full w-auto object-contain" />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Pg {pg.pageNumber} ({pg.width}x{pg.height})</span>
                          <span>{Math.round(pg.sizeBytes / 1024)} KB</span>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => downloadFile(pg.dataUrl, `page_${pg.pageNumber}.${exportFormat === 'image/png' ? 'png' : 'jpg'}`)}
                            className="flex-1 py-1 bg-slate-100 dark:bg-slate-700 font-semibold rounded-lg text-[10px] hover:bg-slate-200 transition"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => onSaveNewDocument({
                              title: `${activeDoc.title} - Page ${pg.pageNumber}`,
                              category: activeDoc.category,
                              originalFileName: `page_${pg.pageNumber}.${exportFormat === 'image/png' ? 'png' : 'jpg'}`,
                              mimeType: exportFormat,
                              fileSizeBytes: pg.sizeBytes,
                              dataUrl: pg.dataUrl,
                              notes: `Extracted page from ${activeDoc.title} at ${exportDpi} DPI.`,
                              tags: ['extracted-page', 'pdf-page'],
                            })}
                            className="px-2 py-1 bg-blue-600 text-white font-semibold rounded-lg text-[10px] hover:bg-blue-700 transition"
                          >
                            Vault
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: PDF OPTIMIZATION */}
          {activeTab === 'optimize' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                  Offline PDF Compression &amp; Optimization
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Re-encodes stream dictionaries and strips structural redundancies while strictly preserving vector texts.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">Current File: </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{activeDoc.title}</span>
                </div>
                <div className="font-mono font-bold text-blue-600">
                  {docMeta ? `${Math.round(docMeta.fileSizeBytes / 1024)} KB` : '...'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Optimization Profile
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    onClick={() => setOptimizeLevel('high')}
                    className={`p-3 rounded-xl border font-bold text-center transition ${
                      optimizeLevel === 'high'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    High
                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">Maximum byte strip</span>
                  </button>
                  <button
                    onClick={() => setOptimizeLevel('medium')}
                    className={`p-3 rounded-xl border font-bold text-center transition ${
                      optimizeLevel === 'medium'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Balanced
                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">Recommended</span>
                  </button>
                  <button
                    onClick={() => setOptimizeLevel('low')}
                    className={`p-3 rounded-xl border font-bold text-center transition ${
                      optimizeLevel === 'low'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Lossless
                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">Zero quality risk</span>
                  </button>
                </div>
              </div>

              <label className="flex items-center space-x-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={stripMetadata}
                  onChange={(e) => setStripMetadata(e.target.checked)}
                  className="rounded text-blue-600 accent-blue-600"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Strip author &amp; creator metadata tags to save extra bytes
                </span>
              </label>

              <button
                disabled={isProcessing || !activeDoc?.dataUrl}
                onClick={handleRunOptimize}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-xs transition"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Analyze &amp; Optimize PDF</span>
              </button>

              {/* Optimization Result Report */}
              {optimizeResult && (
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      Optimization Analysis
                    </span>
                    {optimizeResult.isReduced ? (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                        -{optimizeResult.percentReduction}% Size Reduction
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                        Already Optimal
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Original</span>
                      <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                        {Math.round(optimizeResult.originalSizeBytes / 1024)} KB
                      </span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Optimized</span>
                      <span className="font-bold font-mono text-emerald-600">
                        {Math.round(optimizeResult.optimizedSizeBytes / 1024)} KB
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {optimizeResult.notes}
                  </p>

                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => handleSaveToVaultAsVersion(optimizeResult.dataUrl, 'Optimized PDF', optimizeResult.optimizedSizeBytes)}
                      className="px-3.5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition"
                    >
                      Save Version
                    </button>
                    <button
                      onClick={() => downloadFile(optimizeResult.dataUrl, `${activeDoc.title}_optimized.pdf`)}
                      className="px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
