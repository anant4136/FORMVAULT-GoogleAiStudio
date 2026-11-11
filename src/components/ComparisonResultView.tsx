import React, { useState } from 'react';
import {
  Download,
  Save,
  Share2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Split,
  Eye,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DetailedCompressionResult } from '../processing/imageProcessor';

interface ComparisonResultViewProps {
  originalDataUrl: string;
  result: DetailedCompressionResult;
  documentTitle: string;
  onSaveAsVersion: () => void;
  isSaved?: boolean;
}

export const ComparisonResultView: React.FC<ComparisonResultViewProps> = ({
  originalDataUrl,
  result,
  documentTitle,
  onSaveAsVersion,
  isSaved = false,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side' | 'toggle'>('split');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage
  const [toggleState, setToggleState] = useState<'original' | 'processed'>('processed');
  const [sharedMessage, setSharedMessage] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${Math.round(kb)} KB`;
  };

  const getFormatLabel = (mime: string) => {
    if (mime.includes('jpeg')) return 'JPEG';
    if (mime.includes('png')) return 'PNG';
    if (mime.includes('webp')) return 'WebP';
    return 'BIN';
  };

  const handleDownload = () => {
    const ext = result.format === 'image/png' ? 'png' : result.format === 'image/webp' ? 'webp' : 'jpg';
    const a = document.createElement('a');
    a.href = result.dataUrl;
    a.download = `formvault_${documentTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_processed.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        // Convert to blob
        const res = await fetch(result.dataUrl);
        const blob = await res.blob();
        const ext = result.format === 'image/png' ? 'png' : result.format === 'image/webp' ? 'webp' : 'jpg';
        const file = new File([blob], `${documentTitle}.${ext}`, { type: result.format });
        await navigator.share({
          title: documentTitle,
          text: `Processed with FormVault: ${formatSize(result.actualSizeBytes)} (${result.percentReduction}% reduced)`,
          files: [file],
        });
      } else {
        // Fallback: download
        handleDownload();
        setSharedMessage('Saved to local storage');
        setTimeout(() => setSharedMessage(null), 2500);
      }
    } catch (e) {
      handleDownload();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-700/80 shadow-md space-y-4 text-xs animate-in fade-in duration-200">
      {/* Header status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {result.isTargetMet ? (
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {result.isTargetMet ? 'Target Constraint Achieved' : 'Best Candidate Result'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Evaluated {result.candidateCount} candidate encode runs
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('split')}
            className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition ${
              viewMode === 'side-by-side'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Side
          </button>
          <button
            onClick={() => setViewMode('toggle')}
            className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition ${
              viewMode === 'toggle'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Toggle
          </button>
        </div>
      </div>

      {/* Target unachievable explanation alert */}
      {result.explanation && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
            {result.explanation}
          </p>
        </div>
      )}

      {/* Comparison Visualizer Container */}
      <div className="w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-200 dark:border-slate-700 relative select-none">
        {viewMode === 'split' && (
          <div className="relative w-full h-64 overflow-hidden flex items-center justify-center">
            {/* Background original image */}
            <img
              src={originalDataUrl}
              alt="Original"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* Clipped foreground processed image */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
            >
              <img
                src={result.dataUrl}
                alt="Processed"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>

            {/* Split divider handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 cursor-ew-resize flex items-center justify-center"
              style={{ left: `${splitPos}%` }}
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg text-[10px] font-bold">
                <Split className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Range slider input overlaid */}
            <input
              type="range"
              min="0"
              max="100"
              value={splitPos}
              onChange={(e) => setSplitPos(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize z-20 w-full h-full"
            />

            {/* Labels */}
            <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
              Original ({formatSize(result.originalSizeBytes)})
            </div>
            <div className="absolute top-2 right-2 z-10 bg-blue-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
              Processed ({formatSize(result.actualSizeBytes)})
            </div>
          </div>
        )}

        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-2 divide-x divide-slate-800 h-64">
            <div className="relative p-2 flex flex-col items-center justify-center">
              <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                Original
              </span>
              <img
                src={originalDataUrl}
                alt="Original"
                className="max-h-52 w-auto object-contain"
              />
            </div>
            <div className="relative p-2 flex flex-col items-center justify-center">
              <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                Processed
              </span>
              <img
                src={result.dataUrl}
                alt="Processed"
                className="max-h-52 w-auto object-contain"
              />
            </div>
          </div>
        )}

        {viewMode === 'toggle' && (
          <div className="relative w-full h-64 flex items-center justify-center p-2">
            <img
              src={toggleState === 'original' ? originalDataUrl : result.dataUrl}
              alt={toggleState}
              className="max-h-56 w-auto object-contain"
            />
            <div className="absolute bottom-3 inset-x-0 flex justify-center space-x-2">
              <button
                onClick={() => setToggleState('original')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition shadow ${
                  toggleState === 'original'
                    ? 'bg-white text-slate-900'
                    : 'bg-black/60 text-slate-300 hover:bg-black/80'
                }`}
              >
                Show Original
              </button>
              <button
                onClick={() => setToggleState('processed')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition shadow ${
                  toggleState === 'processed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-black/60 text-slate-300 hover:bg-black/80'
                }`}
              >
                Show Processed
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metrics breakdown grid */}
      <div className="grid grid-cols-4 gap-2 pt-1 text-center">
        <div className="bg-slate-50 dark:bg-slate-700/40 p-2 rounded-2xl border border-slate-100 dark:border-slate-700">
          <span className="block text-[10px] text-slate-400 font-medium">Original</span>
          <span className="block font-mono font-bold text-slate-800 dark:text-slate-200">
            {formatSize(result.originalSizeBytes)}
          </span>
          <span className="block text-[9px] text-slate-400 truncate">
            {result.originalWidth}x{result.originalHeight}
          </span>
        </div>

        <div className="bg-blue-50/60 dark:bg-blue-950/40 p-2 rounded-2xl border border-blue-100 dark:border-blue-900/50">
          <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-medium">
            Output Size
          </span>
          <span className="block font-mono font-bold text-blue-700 dark:text-blue-300">
            {formatSize(result.actualSizeBytes)}
          </span>
          <span className="block text-[9px] text-blue-500 font-mono">
            {result.outputWidth}x{result.outputHeight}
          </span>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-2 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            Reduction
          </span>
          <span className="block font-extrabold text-emerald-700 dark:text-emerald-300">
            -{result.percentReduction}%
          </span>
          <span className="block text-[9px] text-emerald-500">
            {getFormatLabel(result.format)}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-700/40 p-2 rounded-2xl border border-slate-100 dark:border-slate-700">
          <span className="block text-[10px] text-slate-400 font-medium">Quality</span>
          <span className="block font-bold text-slate-800 dark:text-slate-200">
            {result.qualityUsed}%
          </span>
          <span className="block text-[9px] text-slate-400">Optimal</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2 pt-1">
        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
          title="Share or Export"
        >
          <Share2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleDownload}
          className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center space-x-1.5 transition"
        >
          <Download className="w-4 h-4" />
          <span>Download Output</span>
        </button>

        <button
          onClick={onSaveAsVersion}
          disabled={isSaved}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 transition shadow-xs disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{isSaved ? 'Saved to Vault!' : 'Save as Version'}</span>
        </button>
      </div>

      {sharedMessage && (
        <p className="text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          {sharedMessage}
        </p>
      )}
    </div>
  );
};
