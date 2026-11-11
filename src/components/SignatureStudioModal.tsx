import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  PenTool,
  Upload,
  Camera,
  Scissors,
  CheckCircle2,
  Sparkles,
  Download,
  Save,
  RotateCcw,
  Sliders,
  Sun,
  Contrast,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { VaultDocument, DocumentVersion } from '../types';
import {
  processSignatureStudio,
  DetailedCompressionResult,
} from '../processing/imageProcessor';

interface SignatureStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: VaultDocument[];
  initialDocument?: VaultDocument | null;
  onSaveVersion: (docId: string, version: DocumentVersion) => void;
  onSaveNewDocument: (doc: Omit<VaultDocument, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'versions'>) => void;
}

export const SignatureStudioModal: React.FC<SignatureStudioModalProps> = ({
  isOpen,
  onClose,
  documents,
  initialDocument = null,
  onSaveVersion,
  onSaveNewDocument,
}) => {
  // Input mode: 'vault' | 'upload' | 'draw'
  const [sourceMode, setSourceMode] = useState<'vault' | 'upload' | 'draw'>('vault');

  // Selected document
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDocument?.id || (documents[0]?.id ?? '')
  );
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(
    initialDocument?.dataUrl || null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Live Digital Signature Pad ref & state
  const padCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawnStroke, setHasDrawnStroke] = useState<boolean>(false);

  // Enhancement controls
  const [threshold, setThreshold] = useState<number>(185);
  const [contrastBoost, setContrastBoost] = useState<number>(1.3);
  const [brightnessAdjustment, setBrightnessAdjustment] = useState<number>(0);
  const [autoTrim, setAutoTrim] = useState<boolean>(true);
  const [makeTransparent, setMakeTransparent] = useState<boolean>(true);
  const [targetKb, setTargetKb] = useState<number>(20);
  const [applyTargetKb, setApplyTargetKb] = useState<boolean>(true);
  const [outputFormat, setOutputFormat] = useState<'image/png' | 'image/jpeg'>('image/png');

  // Custom Dimensions
  const [customW, setCustomW] = useState<string>('');
  const [customH, setCustomH] = useState<string>('');

  // Processing state & Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedResult, setProcessedResult] = useState<DetailedCompressionResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Initialize with initialDocument if provided
  useEffect(() => {
    if (initialDocument) {
      setSelectedDocId(initialDocument.id);
      setUploadedDataUrl(initialDocument.dataUrl);
    }
  }, [initialDocument]);

  // Setup drawing pad when switching to 'draw' mode
  useEffect(() => {
    if (sourceMode === 'draw' && padCanvasRef.current) {
      const canvas = padCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0F172A';
      }
    }
  }, [sourceMode]);

  if (!isOpen) return null;

  const currentSource = uploadedDataUrl || documents.find((d) => d.id === selectedDocId)?.dataUrl || '';

  // File Upload / Camera snapshot handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedDataUrl(reader.result as string);
      setSourceMode('upload');
      setProcessedResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Live Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawnStroke(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawStroke = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (padCanvasRef.current) {
      setUploadedDataUrl(padCanvasRef.current.toDataURL('image/png'));
    }
  };

  const clearDrawingPad = () => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasDrawnStroke(false);
      setUploadedDataUrl(null);
      setProcessedResult(null);
    }
  };

  // Run Signature Studio Enhancement Engine
  const handleProcessSignature = async () => {
    if (!currentSource) return;

    setIsProcessing(true);
    setProcessedResult(null);
    setIsSaved(false);

    try {
      const res = await processSignatureStudio(currentSource, currentSource.length, {
        threshold,
        contrastBoost,
        brightnessAdjustment,
        autoTrim,
        makeTransparent,
        backgroundColor: '#FFFFFF',
        targetWidthPx: customW ? parseInt(customW) : undefined,
        targetHeightPx: customH ? parseInt(customH) : undefined,
        targetKb: applyTargetKb ? targetKb : undefined,
        outputFormat,
      });

      setProcessedResult(res);
    } catch (err) {
      console.error('Signature processing failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save as version or new reusable document
  const handleSaveVariant = () => {
    if (!processedResult) return;

    const matchedDoc = documents.find((d) => d.id === selectedDocId);
    if (matchedDoc && sourceMode !== 'draw') {
      const version: DocumentVersion = {
        id: `ver-sig-${Date.now()}`,
        documentId: matchedDoc.id,
        label: `Clean Signature (${makeTransparent ? 'Transparent PNG' : 'White JPG'})`,
        mimeType: processedResult.format,
        fileSizeBytes: processedResult.actualSizeBytes,
        dataUrl: processedResult.dataUrl,
        widthPx: processedResult.outputWidth,
        heightPx: processedResult.outputHeight,
        targetSpec: `Signature • ${Math.round(processedResult.actualSizeBytes / 1024)} KB • ${processedResult.outputWidth}x${processedResult.outputHeight}px`,
        createdAt: Date.now(),
      };
      onSaveVersion(matchedDoc.id, version);
    } else {
      onSaveNewDocument({
        title: 'Specimen Signature (Cleaned)',
        category: 'SIGNATURES',
        originalFileName: 'specimen_signature.png',
        mimeType: processedResult.format,
        fileSizeBytes: processedResult.actualSizeBytes,
        dataUrl: processedResult.dataUrl,
        notes: 'Official cleaned specimen signature generated via FormVault Signature Studio.',
        tags: ['signature', 'specimen', 'clean', 'transparent'],
      });
    }

    setIsSaved(true);
  };

  const handleDownload = () => {
    if (!processedResult) return;
    const a = document.createElement('a');
    a.href = processedResult.dataUrl;
    a.download = `formvault_signature_${makeTransparent ? 'transparent' : 'white'}_${Date.now()}.${processedResult.format.includes('png') ? 'png' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-xs">
        {/* Hidden inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Signature Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-mono">
                  Ink Extraction &amp; Auto-Trim
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Remove shadowed paper, extract transparent ink, and hit strict portal limits (&lt;20KB)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Source Mode Toggle: Vault Document / Device Upload / Live Draw Pad */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSourceMode('vault')}
              className={`py-2 rounded-xl font-bold text-xs transition ${
                sourceMode === 'vault' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              From Vault
            </button>
            <button
              onClick={() => {
                setSourceMode('upload');
                fileInputRef.current?.click();
              }}
              className={`py-2 rounded-xl font-bold text-xs transition ${
                sourceMode === 'upload' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Upload / Camera
            </button>
            <button
              onClick={() => setSourceMode('draw')}
              className={`py-2 rounded-xl font-bold text-xs transition ${
                sourceMode === 'draw' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Draw Live on Screen
            </button>
          </div>

          {/* Mode 1: Vault Selection */}
          {sourceMode === 'vault' && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
              <span className="font-bold text-slate-700 dark:text-slate-300">Select Signature:</span>
              <select
                value={selectedDocId}
                onChange={(e) => {
                  setSelectedDocId(e.target.value);
                  setUploadedDataUrl(null);
                  setProcessedResult(null);
                }}
                className="flex-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({Math.round(d.fileSizeBytes / 1024)} KB)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mode 2: Live Signature Drawing Canvas Pad */}
          {sourceMode === 'draw' && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Draw Signature with Finger or Mouse:
                </span>
                <button
                  type="button"
                  onClick={clearDrawingPad}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border text-[11px] font-bold flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Pad</span>
                </button>
              </div>

              <div className="w-full flex justify-center">
                <canvas
                  ref={padCanvasRef}
                  width={560}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={drawStroke}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={drawStroke}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 bg-white rounded-xl border border-slate-300 dark:border-slate-600 cursor-crosshair touch-none shadow-inner"
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Sign inside the box. Strokes are captured in high resolution.
              </p>
            </div>
          )}

          {/* Enhancement Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            {/* Paper Threshold Slider */}
            <div>
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>Paper Luminance Threshold:</span>
                <span className="font-mono text-rose-600">{threshold}</span>
              </div>
              <input
                type="range"
                min="100"
                max="235"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full accent-rose-600"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Increase to eliminate faint paper texture and shadows into pure transparency.
              </p>
            </div>

            {/* Ink Contrast Boost Slider */}
            <div>
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>Ink Contrast &amp; Depth:</span>
                <span className="font-mono text-rose-600">{contrastBoost.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={contrastBoost}
                onChange={(e) => setContrastBoost(parseFloat(e.target.value))}
                className="w-full accent-rose-600"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Strengthens faint ballpoint pen or blue ink strokes into sharp black.
              </p>
            </div>

            {/* Brightness Adjustment Slider */}
            <div>
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>Brightness Fine-Tuning:</span>
                <span className="font-mono text-rose-600">{brightnessAdjustment > 0 ? `+${brightnessAdjustment}` : brightnessAdjustment}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={brightnessAdjustment}
                onChange={(e) => setBrightnessAdjustment(parseInt(e.target.value))}
                className="w-full accent-rose-600"
              />
            </div>

            {/* Background Style: Transparent PNG vs Solid White */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Output Background Style:
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setMakeTransparent(true);
                    setOutputFormat('image/png');
                  }}
                  className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition ${
                    makeTransparent
                      ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  Transparent PNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMakeTransparent(false);
                    setOutputFormat('image/jpeg');
                  }}
                  className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition ${
                    !makeTransparent
                      ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  Clean Solid White
                </button>
              </div>
            </div>

            {/* Auto-Trim Whitespace Checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="autotrim"
                checked={autoTrim}
                onChange={(e) => setAutoTrim(e.target.checked)}
                className="rounded text-rose-600"
              />
              <label htmlFor="autotrim" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                Auto-Trim Excess Empty Whitespace (Bounding Box)
              </label>
            </div>

            {/* Portal File Limit */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="targetkb"
                checked={applyTargetKb}
                onChange={(e) => setApplyTargetKb(e.target.checked)}
                className="rounded text-rose-600"
              />
              <label htmlFor="targetkb" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                Portal Max Limit: &lt;{targetKb} KB
              </label>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleProcessSignature}
            disabled={isProcessing || !currentSource}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isProcessing ? 'Extracting Clean Ink Strokes...' : 'Process & Clean Signature'}
            </span>
          </button>

          {/* Output Preview & Actions */}
          {processedResult && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-rose-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-rose-600 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Clean Specimen Signature Ready</span>
                </div>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {Math.round(processedResult.actualSizeBytes / 1024)} KB • {processedResult.outputWidth}x{processedResult.outputHeight} px
                </span>
              </div>

              {/* Checkerboard transparency preview container */}
              <div
                className="w-full h-32 rounded-2xl flex items-center justify-center p-3 border border-slate-300 dark:border-slate-700 overflow-hidden shadow-inner"
                style={{
                  backgroundImage: makeTransparent
                    ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)'
                    : 'none',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: makeTransparent ? '#f8fafc' : '#FFFFFF',
                }}
              >
                <img
                  src={processedResult.dataUrl}
                  alt="Extracted Signature"
                  className="max-h-28 w-auto object-contain"
                />
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center space-x-1 hover:bg-slate-300 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>

                <button
                  onClick={handleSaveVariant}
                  disabled={isSaved}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center space-x-1 hover:bg-rose-700 transition disabled:opacity-60 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaved ? 'Saved to Vault!' : 'Save Variant in Vault'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
