import React, { useState, useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  Maximize2,
  RefreshCw,
  Layers,
  FileDown,
  Upload,
  Check,
  RotateCw,
  FlipHorizontal,
  Lock,
  Unlock,
  AlertCircle,
  X,
  Sparkles,
  Download,
  Share2,
  CheckCircle2,
  UserCheck,
  PenTool,
  FileText,
  Scissors,
  FilePlus2,
  Eye,
} from 'lucide-react';
import { VaultDocument, DocumentVersion } from '../types';
import {
  SupportedFormat,
  CompressionOptions,
  DetailedCompressionResult,
  ResizeTransformOptions,
  BatchItemProgress,
  compressImageIterative,
  resizeAndTransformImage,
  executeBatchProcessing,
  DIMENSION_PRESETS,
  SIZE_PRESETS,
  measureDataUrlSizeBytes,
} from '../processing/imageProcessor';
import { ComparisonResultView } from '../components/ComparisonResultView';
import { DocumentThumbnail } from '../components/DocumentThumbnail';
import { PdfStudioTab } from '../components/PdfStudioModal';

interface ToolsScreenProps {
  documents: VaultDocument[];
  activeToolId?: string | null;
  selectedDocForTool?: VaultDocument | null;
  onSaveVersion: (docId: string, version: DocumentVersion) => void;
  onClearToolSelection: () => void;
  onOpenPassportStudio?: () => void;
  onOpenSignatureStudio?: () => void;
  onOpenPdfStudio?: (tab?: PdfStudioTab) => void;
}

type ToolMode = 'compressor' | 'resizer' | 'converter' | 'batch' | null;

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
  documents,
  activeToolId = null,
  selectedDocForTool = null,
  onSaveVersion,
  onClearToolSelection,
  onOpenPassportStudio,
  onOpenSignatureStudio,
  onOpenPdfStudio,
}) => {
  // Map incoming activeToolId to ToolMode
  const initialMode: ToolMode =
    activeToolId === 'compress'
      ? 'compressor'
      : activeToolId === 'passport' || activeToolId === 'resizer'
      ? 'resizer'
      : activeToolId === 'convert' || activeToolId === 'signature'
      ? 'converter'
      : activeToolId === 'batch'
      ? 'batch'
      : 'compressor';

  const [currentTool, setCurrentTool] = useState<ToolMode>(initialMode);

  // Selected document from vault or external file upload
  const [selectedDocId, setSelectedDocId] = useState<string>(
    selectedDocForTool?.id || (documents[0]?.id ?? '')
  );
  const [customUploadedImage, setCustomUploadedImage] = useState<{
    dataUrl: string;
    title: string;
    sizeBytes: number;
    mimeType: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Compressor State
  const [targetSizeVal, setTargetSizeVal] = useState<number>(50);
  const [targetSizeUnit, setTargetSizeUnit] = useState<'KB' | 'MB'>('KB');
  const [targetFormat, setTargetFormat] = useState<SupportedFormat>('image/jpeg');
  const [compCustomW, setCompCustomW] = useState<string>('');
  const [compCustomH, setCompCustomH] = useState<string>('');
  const [compMaintainAspect, setCompMaintainAspect] = useState<boolean>(true);
  const [compMatteColor, setCompMatteColor] = useState<string>('#FFFFFF');

  // 2. Resizer State
  const [resizeW, setResizeW] = useState<number>(activeToolId === 'passport' ? 413 : 600);
  const [resizeH, setResizeH] = useState<number>(activeToolId === 'passport' ? 531 : 600);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [originalAspect, setOriginalAspect] = useState<number>(1);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [cropPreset, setCropPreset] = useState<'none' | '1:1' | '3:4' | '7:9' | '16:9'>(
    activeToolId === 'passport' ? '7:9' : 'none'
  );
  const [resizerFormat, setResizerFormat] = useState<SupportedFormat>('image/jpeg');
  const [resizerQuality, setResizerQuality] = useState<number>(90);

  // 3. Converter State
  const [convTargetFormat, setConvTargetFormat] = useState<SupportedFormat>('image/png');
  const [convQuality, setConvQuality] = useState<number>(92);
  const [convMatteColor, setConvMatteColor] = useState<string>('#FFFFFF');

  // 4. Batch State
  const [batchSelectedDocIds, setBatchSelectedDocIds] = useState<string[]>(
    documents.slice(0, 3).map((d) => d.id)
  );
  const [batchProgressList, setBatchProgressList] = useState<BatchItemProgress[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);

  // Results State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeResult, setActiveResult] = useState<DetailedCompressionResult | null>(null);
  const [isVersionSaved, setIsVersionSaved] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Active document data resolution
  const vaultDoc = documents.find((d) => d.id === selectedDocId) || documents[0];
  const activeImage = customUploadedImage || (vaultDoc ? {
    dataUrl: vaultDoc.dataUrl,
    title: vaultDoc.title,
    sizeBytes: vaultDoc.fileSizeBytes,
    mimeType: vaultDoc.mimeType,
  } : null);

  // Update original aspect ratio when active image changes
  useEffect(() => {
    if (activeImage?.dataUrl) {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const ratio = img.naturalWidth / img.naturalHeight;
          setOriginalAspect(ratio);
          setResizeW(img.naturalWidth);
          setResizeH(img.naturalHeight);
        }
      };
      img.src = activeImage.dataUrl;
    }
  }, [activeImage?.dataUrl]);

  // Handle external file upload for immediate processing
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomUploadedImage({
        dataUrl,
        title: file.name.replace(/\.[^/.]+$/, ''),
        sizeBytes: file.size,
        mimeType: file.type || 'image/jpeg',
      });
      setActiveResult(null);
      setProcessingError(null);
    };
    reader.readAsDataURL(file);
  };

  // Run Compression Engine
  const handleRunCompressor = async () => {
    if (!activeImage) return;
    setIsProcessing(true);
    setProcessingError(null);
    setActiveResult(null);
    setIsVersionSaved(false);

    try {
      const targetBytes =
        targetSizeUnit === 'MB' ? targetSizeVal * 1024 * 1024 : targetSizeVal * 1024;

      const opts: CompressionOptions = {
        targetBytes,
        format: targetFormat,
        targetWidth: compCustomW ? parseInt(compCustomW) : undefined,
        targetHeight: compCustomH ? parseInt(compCustomH) : undefined,
        maintainAspectRatio: compMaintainAspect,
        matteColor: compMatteColor,
      };

      const res = await compressImageIterative(activeImage.dataUrl, activeImage.sizeBytes, opts);
      setActiveResult(res);
    } catch (err: any) {
      setProcessingError(err?.message || 'Compression engine encountered an error.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Resizer Engine
  const handleRunResizer = async () => {
    if (!activeImage) return;
    setIsProcessing(true);
    setProcessingError(null);
    setActiveResult(null);
    setIsVersionSaved(false);

    try {
      const opts: ResizeTransformOptions = {
        width: resizeW,
        height: resizeH,
        maintainAspectRatio: lockAspect,
        rotationDegrees,
        flipHorizontal: flipH,
        cropPreset,
        outputFormat: resizerFormat,
        quality: resizerQuality,
      };

      const res = await resizeAndTransformImage(activeImage.dataUrl, activeImage.sizeBytes, opts);
      setActiveResult(res);
    } catch (err: any) {
      setProcessingError(err?.message || 'Resize transformation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Converter Engine
  const handleRunConverter = async () => {
    if (!activeImage) return;
    setIsProcessing(true);
    setProcessingError(null);
    setActiveResult(null);
    setIsVersionSaved(false);

    try {
      const opts: ResizeTransformOptions = {
        width: 0, // original width
        height: 0,
        maintainAspectRatio: true,
        outputFormat: convTargetFormat,
        quality: convQuality,
        matteColor: convMatteColor,
      };

      const res = await resizeAndTransformImage(activeImage.dataUrl, activeImage.sizeBytes, opts);
      setActiveResult(res);
    } catch (err: any) {
      setProcessingError(err?.message || 'Format conversion failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Batch Processing Engine
  const handleRunBatch = async () => {
    const selectedDocs = documents.filter((d) => batchSelectedDocIds.includes(d.id));
    if (selectedDocs.length === 0) return;

    setIsBatchRunning(true);
    const targetBytes = targetSizeUnit === 'MB' ? targetSizeVal * 1024 * 1024 : targetSizeVal * 1024;

    const opts: CompressionOptions = {
      targetBytes,
      format: targetFormat,
      maintainAspectRatio: true,
      matteColor: compMatteColor,
    };

    const items = selectedDocs.map((d) => ({
      id: d.id,
      title: d.title,
      dataUrl: d.dataUrl,
      sizeBytes: d.fileSizeBytes,
    }));

    await executeBatchProcessing(items, opts, (progress) => {
      setBatchProgressList([...progress]);
    });

    setIsBatchRunning(false);
  };

  // Save current activeResult as a document version
  const handleSaveResultAsVersion = () => {
    if (!activeResult || !vaultDoc) return;
    const version: DocumentVersion = {
      id: `ver-${Date.now()}`,
      documentId: vaultDoc.id,
      label: `${currentTool?.toUpperCase()} (${Math.round(activeResult.actualSizeBytes / 1024)}KB)`,
      mimeType: activeResult.format,
      fileSizeBytes: activeResult.actualSizeBytes,
      dataUrl: activeResult.dataUrl,
      widthPx: activeResult.outputWidth,
      heightPx: activeResult.outputHeight,
      targetSpec: `${activeResult.outputWidth}x${activeResult.outputHeight}px • ${activeResult.format.split('/')[1].toUpperCase()} • Q${activeResult.qualityUsed}`,
      createdAt: Date.now(),
    };

    onSaveVersion(vaultDoc.id, version);
    setIsVersionSaved(true);
  };

  return (
    <div className="space-y-4 pb-24 text-xs">
      {/* Hidden file input for direct device storage picking */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadFile}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Header and Tool Mode Switcher */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {currentTool === 'compressor' && 'Image Compressor'}
            {currentTool === 'resizer' && 'Dimension Resizer & Cropper'}
            {currentTool === 'converter' && 'Image Format Converter'}
            {currentTool === 'batch' && 'Batch Processing Engine'}
            {!currentTool && 'Production Image Engine'}
          </h2>
          <p className="text-[11px] text-slate-500">
            Iterative candidate search • Preserves transparency • 100% On-Device
          </p>
        </div>

        {currentTool && (
          <button
            onClick={() => {
              setCurrentTool(null);
              setActiveResult(null);
              setProcessingError(null);
              onClearToolSelection();
            }}
            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            title="Return to Toolkit Catalog"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Featured Studios: Passport Photo Studio & Signature Studio */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          onClick={() => onOpenPassportStudio?.()}
          className="bg-gradient-to-br from-blue-50 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/30 p-3.5 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 hover:border-blue-500 transition cursor-pointer flex flex-col justify-between group shadow-2xs"
        >
          <div>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
              <UserCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-blue-950 dark:text-blue-200">
              Passport Photo Studio
            </h3>
            <p className="text-[10px] text-blue-800/80 dark:text-blue-300/80 mt-0.5 line-clamp-2">
              Biometric oval guide, 35x45mm specs, &amp; 300 DPI printable sheets
            </p>
          </div>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-2 flex items-center space-x-0.5">
            <span>Launch Studio</span>
            <span>→</span>
          </span>
        </div>

        <div
          onClick={() => onOpenSignatureStudio?.()}
          className="bg-gradient-to-br from-rose-50 to-pink-50/80 dark:from-rose-950/40 dark:to-pink-950/30 p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 hover:border-rose-500 transition cursor-pointer flex flex-col justify-between group shadow-2xs"
        >
          <div>
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
              <PenTool className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-rose-950 dark:text-rose-200">
              Signature Studio
            </h3>
            <p className="text-[10px] text-rose-800/80 dark:text-rose-300/80 mt-0.5 line-clamp-2">
              Draw live, auto-trim whitespace, &amp; export transparent PNG
            </p>
          </div>
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-2 flex items-center space-x-0.5">
            <span>Launch Studio</span>
            <span>→</span>
          </span>
        </div>
      </div>

      {/* Offline PDF Processing Suite Card */}
      <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/30 p-4 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/60 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                  Offline PDF Studio
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200">
                  7 TOOLS
                </span>
              </div>
              <p className="text-[10px] text-indigo-800/80 dark:text-indigo-300/80">
                Merge, split, manage pages, convert to images, and optimize PDFs
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenPdfStudio?.('viewer')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Open Studio
          </button>
        </div>

        {/* Quick Tool Action Chips */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
          <button
            onClick={() => onOpenPdfStudio?.('merge')}
            className="p-2 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-200 font-semibold transition"
          >
            <FilePlus2 className="w-3.5 h-3.5 mx-auto mb-1 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] block truncate">Merge PDFs</span>
          </button>
          <button
            onClick={() => onOpenPdfStudio?.('split')}
            className="p-2 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-200 font-semibold transition"
          >
            <Scissors className="w-3.5 h-3.5 mx-auto mb-1 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] block truncate">Split Pages</span>
          </button>
          <button
            onClick={() => onOpenPdfStudio?.('manage')}
            className="p-2 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-200 font-semibold transition"
          >
            <Layers className="w-3.5 h-3.5 mx-auto mb-1 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] block truncate">Reorder/Rotate</span>
          </button>
          <button
            onClick={() => onOpenPdfStudio?.('optimize')}
            className="p-2 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-200 font-semibold transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mx-auto mb-1 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] block truncate">Optimize</span>
          </button>
        </div>
      </div>

      {/* Tool Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
        <button
          onClick={() => {
            setCurrentTool('compressor');
            setActiveResult(null);
          }}
          className={`py-2 px-1 rounded-xl font-bold text-[11px] transition text-center truncate ${
            currentTool === 'compressor'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Compress
        </button>
        <button
          onClick={() => {
            setCurrentTool('resizer');
            setActiveResult(null);
          }}
          className={`py-2 px-1 rounded-xl font-bold text-[11px] transition text-center truncate ${
            currentTool === 'resizer'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Resize &amp; Crop
        </button>
        <button
          onClick={() => {
            setCurrentTool('converter');
            setActiveResult(null);
          }}
          className={`py-2 px-1 rounded-xl font-bold text-[11px] transition text-center truncate ${
            currentTool === 'converter'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Convert
        </button>
        <button
          onClick={() => {
            setCurrentTool('batch');
            setActiveResult(null);
          }}
          className={`py-2 px-1 rounded-xl font-bold text-[11px] transition text-center truncate ${
            currentTool === 'batch'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Batch (Multi)
        </button>
      </div>

      {/* Source Image Selector (For non-batch modes) */}
      {currentTool !== 'batch' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-700/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Source Image Selection:
            </label>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
            >
              <Upload className="w-3 h-3" />
              <span>Pick from Device Storage</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {activeImage && (
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0 flex items-center justify-center">
                <DocumentThumbnail
                  dataUrl={activeImage.dataUrl}
                  mimeType={activeImage.mimeType}
                  title={activeImage.title}
                  className="w-full h-full object-contain"
                  iconClassName="w-5 h-5"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <select
                value={customUploadedImage ? 'custom-upload' : selectedDocId}
                onChange={(e) => {
                  if (e.target.value === 'custom-upload') return;
                  setCustomUploadedImage(null);
                  setSelectedDocId(e.target.value);
                  setActiveResult(null);
                }}
                className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white focus:outline-none"
              >
                {customUploadedImage && (
                  <option value="custom-upload">
                    Device File: {customUploadedImage.title} ({Math.round(customUploadedImage.sizeBytes / 1024)} KB)
                  </option>
                )}
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    Vault: {d.title} ({Math.round(d.fileSizeBytes / 1024)} KB • {d.mimeType.split('/')[1].toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 1. COMPRESSOR WORKBENCH */}
      {currentTool === 'compressor' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 space-y-4">
          {/* Target File Size Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Target Maximum File Size:
              </span>
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTargetSizeUnit('KB')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    targetSizeUnit === 'KB' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  KB
                </button>
                <button
                  type="button"
                  onClick={() => setTargetSizeUnit('MB')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    targetSizeUnit === 'MB' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  MB
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-1.5">
              {SIZE_PRESETS.map((preset) => {
                const kbVal = preset.bytes / 1024;
                const isSelected = targetSizeUnit === 'KB' && targetSizeVal === kbVal;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setTargetSizeUnit('KB');
                      setTargetSizeVal(kbVal);
                    }}
                    className={`py-1.5 rounded-xl text-center border transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="block text-[11px]">{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom target input & slider */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="range"
                min={targetSizeUnit === 'MB' ? '0.1' : '10'}
                max={targetSizeUnit === 'MB' ? '10' : '1000'}
                step={targetSizeUnit === 'MB' ? '0.1' : '5'}
                value={targetSizeVal}
                onChange={(e) => setTargetSizeVal(parseFloat(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <div className="flex items-center space-x-1 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 bg-slate-50 dark:bg-slate-900">
                <input
                  type="number"
                  value={targetSizeVal}
                  onChange={(e) => setTargetSizeVal(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-14 text-center font-bold text-xs bg-transparent focus:outline-none"
                />
                <span className="text-slate-400 font-bold">{targetSizeUnit}</span>
              </div>
            </div>
          </div>

          {/* Format selection */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Target Output Format:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'image/jpeg' as SupportedFormat, label: 'JPEG (.jpg)', desc: 'Best compression' },
                { id: 'image/png' as SupportedFormat, label: 'PNG (.png)', desc: 'Lossless & transparent' },
                { id: 'image/webp' as SupportedFormat, label: 'WebP (.webp)', desc: 'Modern high-efficiency' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setTargetFormat(fmt.id)}
                  className={`p-2 rounded-xl text-left border transition ${
                    targetFormat === fmt.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="block font-bold text-xs">{fmt.label}</span>
                  <span className="block text-[10px] text-slate-500">{fmt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Transparency matte setting for JPEG */}
          {targetFormat === 'image/jpeg' && (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="block font-bold text-slate-700 dark:text-slate-300">
                  Transparency Matte Color:
                </span>
                <span className="block text-[10px] text-slate-400">
                  Replaces transparent pixels when converting to JPEG
                </span>
              </div>
              <div className="flex space-x-1.5">
                {[
                  { color: '#FFFFFF', label: 'White' },
                  { color: '#F8FAFC', label: 'Off-White' },
                  { color: '#0F172A', label: 'Dark' },
                ].map((m) => (
                  <button
                    key={m.color}
                    type="button"
                    onClick={() => setCompMatteColor(m.color)}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      compMatteColor === m.color ? 'border-blue-600 scale-110' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: m.color }}
                    title={m.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Optional Dimension Bounds */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Optional Output Dimensions:
              </span>
              <label className="flex items-center space-x-1 text-[11px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compMaintainAspect}
                  onChange={(e) => setCompMaintainAspect(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Preserve Aspect Ratio</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Max Width (px)</label>
                <input
                  type="number"
                  placeholder="Auto"
                  value={compCustomW}
                  onChange={(e) => setCompCustomW(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Max Height (px)</label>
                <input
                  type="number"
                  placeholder="Auto"
                  value={compCustomH}
                  onChange={(e) => setCompCustomH(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Execute Compression Button */}
          <button
            onClick={handleRunCompressor}
            disabled={isProcessing || !activeImage}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Running Iterative Candidate Search...'
                : `Compress to <${targetSizeVal} ${targetSizeUnit}`}
            </span>
          </button>
        </div>
      )}

      {/* 2. RESIZER & CROPPER WORKBENCH */}
      {currentTool === 'resizer' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 space-y-4">
          {/* Dimension Presets */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Standard Dimension Presets:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {DIMENSION_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setResizeW(p.width);
                    setResizeH(p.height);
                  }}
                  className="p-2 rounded-xl text-left border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 transition"
                >
                  <span className="block font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                    {p.label}
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono">
                    {p.width}x{p.height} px
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Width & Height Inputs with Lock */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Custom Target Resolution:
              </span>
              <button
                type="button"
                onClick={() => setLockAspect(!lockAspect)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                  lockAspect
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border-slate-300 text-slate-500'
                }`}
              >
                {lockAspect ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{lockAspect ? 'Aspect Locked' : 'Aspect Free'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Width (px)</label>
                <input
                  type="number"
                  value={resizeW}
                  onChange={(e) => {
                    const newW = parseInt(e.target.value) || 0;
                    setResizeW(newW);
                    if (lockAspect && originalAspect > 0 && newW > 0) {
                      setResizeH(Math.round(newW / originalAspect));
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Height (px)</label>
                <input
                  type="number"
                  value={resizeH}
                  onChange={(e) => {
                    const newH = parseInt(e.target.value) || 0;
                    setResizeH(newH);
                    if (lockAspect && originalAspect > 0 && newH > 0) {
                      setResizeW(Math.round(newH * originalAspect));
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Aspect Crop Presets */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Crop Aspect Ratio:
            </label>
            <div className="flex gap-1.5">
              {[
                { id: 'none', label: 'Original' },
                { id: '1:1', label: '1:1 Square' },
                { id: '7:9', label: '35:45 Passport' },
                { id: '3:4', label: '3:4 Document' },
                { id: '16:9', label: '16:9 Wide' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCropPreset(c.id as any)}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-[10px] border transition ${
                    cropPreset === c.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation & Flip Controls */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Transform &amp; Orientation:
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setRotationDegrees((rotationDegrees + 90) % 360)}
                className="flex-1 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold flex items-center justify-center space-x-1.5 hover:bg-slate-100"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate 90° ({rotationDegrees}°)</span>
              </button>
              <button
                type="button"
                onClick={() => setFlipH(!flipH)}
                className={`flex-1 py-2 rounded-xl border font-bold flex items-center justify-center space-x-1.5 transition ${
                  flipH
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Flip Horizontal</span>
              </button>
            </div>
          </div>

          {/* Execute Resize Button */}
          <button
            onClick={handleRunResizer}
            disabled={isProcessing || !activeImage}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <Maximize2 className="w-4 h-4" />
            <span>
              {isProcessing ? 'Processing Transformations...' : `Resize to ${resizeW}x${resizeH} px`}
            </span>
          </button>
        </div>
      )}

      {/* 3. FORMAT CONVERTER WORKBENCH */}
      {currentTool === 'converter' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 space-y-4">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Destination Format:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'image/jpeg' as SupportedFormat, title: 'JPEG / JPG', desc: 'Widely accepted for exams' },
                { id: 'image/png' as SupportedFormat, title: 'PNG (Lossless)', desc: 'Full alpha transparency' },
                { id: 'image/webp' as SupportedFormat, title: 'WebP', desc: 'Highest compression efficiency' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setConvTargetFormat(fmt.id)}
                  className={`p-2.5 rounded-xl text-left border transition ${
                    convTargetFormat === fmt.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                  }`}
                >
                  <span className="block font-bold text-xs">{fmt.title}</span>
                  <span className="block text-[10px] text-slate-500">{fmt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider */}
          <div>
            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
              <span>Encoding Quality:</span>
              <span className="font-mono text-blue-600">{convQuality}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="100"
              value={convQuality}
              onChange={(e) => setConvQuality(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {/* Transparency matte setting */}
          {convTargetFormat === 'image/jpeg' && (
            <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-2">
              <span className="block font-bold text-amber-900 dark:text-amber-200 text-xs">
                JPEG does not support transparency
              </span>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Transparent areas in your original image will be filled with a solid background
                color rather than turning black:
              </p>
              <div className="flex space-x-2">
                {[
                  { color: '#FFFFFF', label: 'Solid White' },
                  { color: '#F1F5F9', label: 'Soft Gray' },
                  { color: '#000000', label: 'Solid Black' },
                ].map((m) => (
                  <button
                    key={m.color}
                    type="button"
                    onClick={() => setConvMatteColor(m.color)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                      convMatteColor === m.color
                        ? 'border-blue-600 bg-white dark:bg-slate-800 text-blue-600'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900'
                    }`}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: m.color }}
                    />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Convert button */}
          <button
            onClick={handleRunConverter}
            disabled={isProcessing || !activeImage}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Converting Format...'
                : `Convert to ${convTargetFormat.split('/')[1].toUpperCase()}`}
            </span>
          </button>
        </div>
      )}

      {/* 4. BATCH PROCESSING WORKBENCH */}
      {currentTool === 'batch' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Select Documents for Batch Execution ({batchSelectedDocIds.length} chosen):
              </span>
              <button
                type="button"
                onClick={() => {
                  if (batchSelectedDocIds.length === documents.length) {
                    setBatchSelectedDocIds([]);
                  } else {
                    setBatchSelectedDocIds(documents.map((d) => d.id));
                  }
                }}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                {batchSelectedDocIds.length === documents.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900">
              {documents.map((doc) => {
                const isSelected = batchSelectedDocIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'border-blue-500 bg-white dark:bg-slate-800 font-semibold'
                        : 'border-transparent text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) setBatchSelectedDocIds([...batchSelectedDocIds, doc.id]);
                        else setBatchSelectedDocIds(batchSelectedDocIds.filter((id) => id !== doc.id));
                      }}
                      className="rounded text-blue-600"
                    />
                    <span className="truncate">{doc.title}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Shared Batch Compression Settings */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Target Limit per File:
              </label>
              <select
                value={targetSizeVal}
                onChange={(e) => setTargetSizeVal(parseInt(e.target.value))}
                className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5"
              >
                <option value={20}>&lt;20 KB (Signatures)</option>
                <option value={50}>&lt;50 KB (Photos)</option>
                <option value={100}>&lt;100 KB (ID Cards)</option>
                <option value={200}>&lt;200 KB (Certificates)</option>
                <option value={500}>&lt;500 KB (Documents)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Output Format:
              </label>
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value as any)}
                className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5"
              >
                <option value="image/jpeg">JPEG (.jpg)</option>
                <option value="image/png">PNG (.png)</option>
                <option value="image/webp">WebP (.webp)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRunBatch}
            disabled={isBatchRunning || batchSelectedDocIds.length === 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <Layers className="w-4 h-4" />
            <span>
              {isBatchRunning
                ? 'Processing Batch Non-Blockingly...'
                : `Process ${batchSelectedDocIds.length} Images in Batch`}
            </span>
          </button>

          {/* Batch Progress & Individual Results List */}
          {batchProgressList.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Batch Execution Progress:
              </span>
              <div className="space-y-2">
                {batchProgressList.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.title}
                      </p>
                      {item.result && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                          {Math.round(item.result.originalSizeBytes / 1024)} KB →{' '}
                          {Math.round(item.result.actualSizeBytes / 1024)} KB (
                          -{item.result.percentReduction}%)
                        </p>
                      )}
                      {item.error && (
                        <p className="text-[10px] text-rose-600 font-medium">{item.error}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {item.status === 'pending' && (
                        <span className="text-[10px] text-slate-400">Waiting</span>
                      )}
                      {item.status === 'processing' && (
                        <span className="text-[10px] font-bold text-blue-600 animate-pulse">
                          Encoding...
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center space-x-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Done</span>
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="text-[10px] font-bold text-rose-600">Failed</span>
                      )}

                      {item.result && (
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = item.result!.dataUrl;
                            a.download = `formvault_${item.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${item.result!.format.split('/')[1]}`;
                            a.click();
                          }}
                          className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-blue-600 hover:text-white transition"
                          title="Download file"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error alert banner */}
      {processingError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center space-x-2 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{processingError}</span>
        </div>
      )}

      {/* 5. DEDICATED RESULTS SCREEN & COMPARISON VIEWER */}
      {activeResult && activeImage && (
        <ComparisonResultView
          originalDataUrl={activeImage.dataUrl}
          result={activeResult}
          documentTitle={activeImage.title}
          onSaveAsVersion={handleSaveResultAsVersion}
          isSaved={isVersionSaved}
        />
      )}
    </div>
  );
};
