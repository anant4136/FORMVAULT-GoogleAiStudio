import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  UserCheck,
  RotateCw,
  ZoomIn,
  Move,
  Printer,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { VaultDocument, DocumentVersion } from '../types';
import {
  PASSPORT_PRESETS,
  PassportPresetItem,
  processPassportStudioPhoto,
  generatePrintablePhotoSheet,
  DetailedCompressionResult,
} from '../processing/imageProcessor';

interface PassportPhotoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: VaultDocument[];
  initialDocument?: VaultDocument | null;
  onSaveVersion: (docId: string, version: DocumentVersion) => void;
  onSaveNewDocument: (doc: Omit<VaultDocument, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'versions'>) => void;
}

export const PassportPhotoStudioModal: React.FC<PassportPhotoStudioModalProps> = ({
  isOpen,
  onClose,
  documents,
  initialDocument = null,
  onSaveVersion,
  onSaveNewDocument,
}) => {
  // Step navigation: 1: Source -> 2: Biometric Crop & Background -> 3: Result & Print Sheet
  const [activeStep, setActiveStep] = useState<'source' | 'adjust' | 'sheet'>('source');

  // Photo Source
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDocument?.id || (documents[0]?.id ?? '')
  );
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(
    initialDocument?.dataUrl || null
  );
  const [uploadedTitle, setUploadedTitle] = useState<string>(
    initialDocument?.title || 'Passport Photo'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Biometric & Preset Settings
  const [selectedPreset, setSelectedPreset] = useState<PassportPresetItem>(PASSPORT_PRESETS[0]);
  const [customWidthMm, setCustomWidthMm] = useState<number>(35);
  const [customHeightMm, setCustomHeightMm] = useState<number>(45);
  const [unitMode, setUnitMode] = useState<'mm' | 'inches' | 'pixels'>('mm');

  // Background Color
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');

  // Transform controls
  const [zoom, setZoom] = useState<number>(1.1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);

  // Compression
  const [targetKb, setTargetKb] = useState<number>(50);
  const [applyCompression, setApplyCompression] = useState<boolean>(true);
  const [outputFormat, setOutputFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');

  // Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedResult, setProcessedResult] = useState<DetailedCompressionResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Printable Photo Sheet State
  const [sheetPageSize, setSheetPageSize] = useState<'4x6' | 'a4' | '5x7' | 'letter'>('4x6');
  const [sheetCopies, setSheetCopies] = useState<number>(6);
  const [sheetSpacing, setSheetSpacing] = useState<number>(4);
  const [sheetGuidelines, setSheetGuidelines] = useState<boolean>(true);
  const [sheetResult, setSheetResult] = useState<{
    dataUrl: string;
    sizeBytes: number;
    widthPx: number;
    heightPx: number;
  } | null>(null);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState<boolean>(false);

  // Set initial document when modal opens
  useEffect(() => {
    if (initialDocument) {
      setSelectedDocId(initialDocument.id);
      setUploadedDataUrl(initialDocument.dataUrl);
      setUploadedTitle(initialDocument.title);
      setActiveStep('adjust');
    }
  }, [initialDocument]);

  if (!isOpen) return null;

  const currentSourceDataUrl = uploadedDataUrl || documents.find((d) => d.id === selectedDocId)?.dataUrl || '';

  // File / Camera Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedDataUrl(reader.result as string);
      setUploadedTitle(file.name.replace(/\.[^/.]+$/, ''));
      setActiveStep('adjust');
      setProcessedResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Execute Passport Generation
  const handleGeneratePassport = async () => {
    if (!currentSourceDataUrl) return;

    setIsProcessing(true);
    setProcessedResult(null);
    setIsSaved(false);

    try {
      const widthMm = selectedPreset.id === 'custom' ? customWidthMm : selectedPreset.widthMm;
      const heightMm = selectedPreset.id === 'custom' ? customHeightMm : selectedPreset.heightMm;

      const res = await processPassportStudioPhoto(currentSourceDataUrl, currentSourceDataUrl.length, {
        widthMm,
        heightMm,
        dpi: 300,
        backgroundColor: bgColor,
        zoom,
        panX,
        panY,
        rotation,
        outputFormat,
        targetKb: applyCompression ? targetKb : undefined,
      });

      setProcessedResult(res);
      setActiveStep('adjust');
    } catch (err) {
      console.error('Passport photo processing failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate Printable Photo Sheet
  const handleGenerateSheet = async () => {
    if (!processedResult) return;
    setIsGeneratingSheet(true);

    try {
      const sheet = await generatePrintablePhotoSheet(processedResult.dataUrl, {
        pageSize: sheetPageSize,
        copiesCount: sheetCopies,
        spacingMm: sheetSpacing,
        drawCutGuidelines: sheetGuidelines,
        dpi: 300,
      });
      setSheetResult(sheet);
      setActiveStep('sheet');
    } catch (err) {
      console.error('Failed to generate printable photo sheet', err);
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  // Save to vault as version or new document
  const handleSaveToVault = () => {
    if (!processedResult) return;

    const matchedDoc = documents.find((d) => d.id === selectedDocId);
    if (matchedDoc) {
      // Save as version
      const version: DocumentVersion = {
        id: `ver-passport-${Date.now()}`,
        documentId: matchedDoc.id,
        label: `Passport Photo (${selectedPreset.widthMm}x${selectedPreset.heightMm}mm)`,
        mimeType: processedResult.format,
        fileSizeBytes: processedResult.actualSizeBytes,
        dataUrl: processedResult.dataUrl,
        widthPx: processedResult.outputWidth,
        heightPx: processedResult.outputHeight,
        targetSpec: `${selectedPreset.name} • 300 DPI • ${Math.round(processedResult.actualSizeBytes / 1024)} KB`,
        createdAt: Date.now(),
      };
      onSaveVersion(matchedDoc.id, version);
    } else {
      // Save as new independent Vault Document
      onSaveNewDocument({
        title: `${uploadedTitle} (Passport 35x45mm)`,
        category: 'PHOTOS',
        originalFileName: 'passport_photo.jpg',
        mimeType: processedResult.format,
        fileSizeBytes: processedResult.actualSizeBytes,
        dataUrl: processedResult.dataUrl,
        notes: `Biometric passport photo generated via FormVault Studio. Spec: ${selectedPreset.name}`,
        tags: ['passport', 'photo', 'biometric', 'official'],
      });
    }

    setIsSaved(true);
  };

  // Download Single Photo
  const handleDownloadSingle = () => {
    if (!processedResult) return;
    const a = document.createElement('a');
    a.href = processedResult.dataUrl;
    a.download = `formvault_passport_${selectedPreset.id}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download Printable Sheet
  const handleDownloadSheet = () => {
    if (!sheetResult) return;
    const a = document.createElement('a');
    a.href = sheetResult.dataUrl;
    a.download = `formvault_photosheet_${sheetPageSize}_${sheetCopies}copies.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-xs">
        {/* Hidden inputs for camera capture & file storage */}
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
          capture="user"
          className="hidden"
        />

        {/* Studio Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Passport Photo Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-mono">
                  300 DPI Biometric Engine
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Crop, replace background, compress to exact KB limits, and print sheets
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Step navigation tabs */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveStep('source')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activeStep === 'source' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                1. Source
              </button>
              <button
                onClick={() => setActiveStep('adjust')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activeStep === 'adjust' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                2. Studio Align
              </button>
              <button
                onClick={() => {
                  if (processedResult) handleGenerateSheet();
                }}
                disabled={!processedResult}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition disabled:opacity-40 ${
                  activeStep === 'sheet' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                3. Print Sheet
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* STEP 1: PHOTO SOURCE SELECTION */}
          {activeStep === 'source' && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  Choose Portrait Photo Source
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Import an existing photo from My Vault, pick from device storage, or capture directly with camera
                </p>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 rounded-2xl border-2 border-dashed border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 transition text-center group flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow group-hover:scale-105 transition">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">Camera Capture</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Take selfie / portrait</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 transition text-center group flex flex-col items-center justify-center shadow-xs"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">Device Storage</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Upload gallery photo</span>
                </button>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white mb-1">
                      From My Vault:
                    </span>
                    <select
                      value={selectedDocId}
                      onChange={(e) => {
                        setSelectedDocId(e.target.value);
                        setUploadedDataUrl(null);
                      }}
                      className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                    >
                      {documents.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({Math.round(d.fileSizeBytes / 1024)} KB)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setActiveStep('adjust')}
                    className="mt-3 w-full py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition"
                  >
                    Use Selected Doc
                  </button>
                </div>
              </div>

              {/* Sample Photo Guide */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Biometric Photo Tips
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Look directly into the camera with a neutral facial expression. Ensure even lighting across both sides of the face without strong shadows or reflections.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BIOMETRIC CROP, BACKGROUND & SIZE ALIGNMENT */}
          {activeStep === 'adjust' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Visual Head-Oval Alignment Canvas */}
              <div className="md:col-span-6 flex flex-col items-center">
                <div className="relative w-64 h-80 rounded-2xl overflow-hidden border-2 border-blue-500/80 shadow-lg bg-slate-950 flex items-center justify-center select-none group">
                  {/* Background layer */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: bgColor === 'original' ? 'transparent' : bgColor,
                    }}
                  />

                  {/* Transformed user photo */}
                  {currentSourceDataUrl ? (
                    <img
                      src={currentSourceDataUrl}
                      alt="Portrait"
                      className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-75"
                      style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`,
                      }}
                    />
                  ) : (
                    <div className="text-slate-400">No image loaded</div>
                  )}

                  {/* Biometric Head & Chin Oval Overlay Guide */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    {/* Head oval silhouette */}
                    <div className="w-40 h-52 border-2 border-dashed border-amber-400/90 rounded-[50%/60%] relative flex items-center justify-center shadow-xs">
                      {/* Eye horizontal alignment guideline */}
                      <div className="absolute top-[42%] left-0 right-0 border-t border-dashed border-amber-400/60" />
                      {/* Nose/mouth vertical alignment guideline */}
                      <div className="absolute top-0 bottom-0 border-l border-dashed border-amber-400/60" />

                      <span className="absolute top-1 text-[9px] font-bold text-amber-300 bg-black/60 px-1.5 py-0.2 rounded">
                        TOP OF HEAD
                      </span>
                      <span className="absolute bottom-1 text-[9px] font-bold text-amber-300 bg-black/60 px-1.5 py-0.2 rounded">
                        CHIN LEVEL
                      </span>
                    </div>

                    <span className="text-[10px] text-amber-200 bg-black/75 px-2 py-0.5 rounded-full mt-2 font-semibold">
                      Align face within golden oval
                    </span>
                  </div>
                </div>

                {/* Direct pan / zoom controls */}
                <div className="w-64 mt-3 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold flex items-center space-x-1">
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Zoom:</span>
                    </span>
                    <span className="font-mono font-bold text-blue-600">{zoom.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="2.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Pan Horizontal</span>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={panX}
                        onChange={(e) => setPanX(parseInt(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Pan Vertical</span>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={panY}
                        onChange={(e) => setPanY(parseInt(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setRotation((rotation + 90) % 360)}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border text-[10px] font-bold flex items-center space-x-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Rotate 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1.1);
                        setPanX(0);
                        setPanY(0);
                        setRotation(0);
                      }}
                      className="px-2 py-1 rounded text-slate-400 hover:text-slate-600 text-[10px] font-semibold"
                    >
                      Reset Alignment
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Biometric Presets, Backgrounds, and Size Controls */}
              <div className="md:col-span-6 space-y-3.5">
                {/* Authority Presets */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Biometric Dimension Preset:
                  </label>
                  <div className="space-y-1.5">
                    {PASSPORT_PRESETS.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPreset(p)}
                        className={`p-2 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          selectedPreset.id === p.id
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block text-xs truncate">{p.name}</span>
                          <span className="block text-[10px] text-slate-500 font-normal truncate">
                            {p.description}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {p.widthMm}x{p.heightMm} mm
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Background color selection */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Official Background Color:
                  </label>
                  <div className="flex gap-2">
                    {[
                      { color: '#FFFFFF', label: 'Pure White' },
                      { color: '#F8FAFC', label: 'Off-White' },
                      { color: '#DCEAFE', label: 'Light Blue' },
                      { color: '#1E3A8A', label: 'Navy Blue' },
                      { color: 'original', label: 'Original' },
                    ].map((bg) => (
                      <button
                        key={bg.color}
                        type="button"
                        onClick={() => setBgColor(bg.color)}
                        className={`flex-1 py-1.5 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center transition ${
                          bgColor === bg.color
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-slate-300 mb-1"
                          style={{
                            backgroundColor: bg.color === 'original' ? 'transparent' : bg.color,
                          }}
                        />
                        <span>{bg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target KB limit */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyCompression}
                        onChange={(e) => setApplyCompression(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Enforce Government Portal Size Limit</span>
                    </label>
                    <span className="font-mono font-bold text-blue-600">&lt;{targetKb} KB</span>
                  </div>

                  {applyCompression && (
                    <div className="flex gap-1.5">
                      {[30, 50, 100, 200].map((kb) => (
                        <button
                          key={kb}
                          type="button"
                          onClick={() => setTargetKb(kb)}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold border ${
                            targetKb === kb
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          &lt;{kb}KB
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Biometric verification disclaimer notice */}
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <span className="font-bold">Important Notice: </span>
                  Standard common presets are provided for convenience. Official biometric requirements vary by government authority and embassy. Please verify specific submission portal criteria before applying.
                </div>

                {/* Action button */}
                <button
                  onClick={handleGeneratePassport}
                  disabled={isProcessing}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessing ? 'Generating Biometric Passport...' : 'Generate Biometric Photo'}</span>
                </button>
              </div>
            </div>
          )}

          {/* GENERATED PASSPORT PREVIEW & ACTIONS */}
          {processedResult && activeStep === 'adjust' && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Passport Photo Rendered at 300 DPI</span>
                </div>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {Math.round(processedResult.actualSizeBytes / 1024)} KB • {processedResult.outputWidth}x{processedResult.outputHeight} px
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-24 h-32 rounded-xl border-2 border-slate-300 dark:border-slate-600 overflow-hidden shadow-sm flex-shrink-0 bg-white">
                  <img
                    src={processedResult.dataUrl}
                    alt="Passport result"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {selectedPreset.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Physical Size: {selectedPreset.widthMm} x {selectedPreset.heightMm} mm at 300 DPI
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Portal Size: {Math.round(processedResult.actualSizeBytes / 1024)} KB ({applyCompression ? `Passed <${targetKb}KB threshold` : 'High-Res'})
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={handleDownloadSingle}
                  className="py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center space-x-1 hover:bg-slate-300 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>

                <button
                  onClick={handleSaveToVault}
                  disabled={isSaved}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center space-x-1 hover:bg-blue-700 transition disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaved ? 'Saved to Vault!' : 'Save Version'}</span>
                </button>

                <button
                  onClick={handleGenerateSheet}
                  className="py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center space-x-1 hover:bg-indigo-700 transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PRINTABLE PHOTO SHEET WORKBENCH */}
          {activeStep === 'sheet' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Printer className="w-4 h-4 text-indigo-600" />
                    <span>Printable Passport Photo Sheet</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    High-resolution printable sheet with multiple copies and scissor cut guidelines
                  </p>
                </div>
                <button
                  onClick={() => setActiveStep('adjust')}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Back to Adjust
                </button>
              </div>

              {/* Sheet Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">
                    Page Paper Size:
                  </label>
                  <select
                    value={sheetPageSize}
                    onChange={(e) => setSheetPageSize(e.target.value as any)}
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                  >
                    <option value="4x6">4x6 inch (Photo Paper)</option>
                    <option value="a4">A4 Standard (210x297mm)</option>
                    <option value="5x7">5x7 inch</option>
                    <option value="letter">US Letter (8.5x11in)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">
                    Number of Copies:
                  </label>
                  <select
                    value={sheetCopies}
                    onChange={(e) => setSheetCopies(parseInt(e.target.value))}
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                  >
                    <option value={2}>2 Copies</option>
                    <option value={4}>4 Copies</option>
                    <option value={6}>6 Copies</option>
                    <option value={8}>8 Copies</option>
                    <option value={12}>12 Copies</option>
                    <option value={16}>16 Copies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">
                    Spacing Between (mm):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={sheetSpacing}
                    onChange={(e) => setSheetSpacing(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer pb-1.5">
                    <input
                      type="checkbox"
                      checked={sheetGuidelines}
                      onChange={(e) => setSheetGuidelines(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Scissor Cut Lines</span>
                  </label>
                </div>
              </div>

              {/* Sheet preview container */}
              {sheetResult && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-full max-h-72 rounded-2xl bg-slate-900 p-2 overflow-auto flex items-center justify-center border border-slate-300 dark:border-slate-700 shadow-inner">
                    <img
                      src={sheetResult.dataUrl}
                      alt="Printable Photo Sheet"
                      className="max-h-68 w-auto object-contain rounded shadow"
                    />
                  </div>

                  <div className="flex items-center justify-between w-full text-[11px] text-slate-500">
                    <span>
                      Sheet Dimensions: {sheetResult.widthPx}x{sheetResult.heightPx} px (300 DPI)
                    </span>
                    <span>Output Size: {Math.round(sheetResult.sizeBytes / 1024)} KB</span>
                  </div>

                  <div className="w-full flex space-x-2">
                    <button
                      onClick={handleGenerateSheet}
                      disabled={isGeneratingSheet}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-50 transition"
                    >
                      Regenerate Sheet
                    </button>
                    <button
                      onClick={handleDownloadSheet}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download 300 DPI Printable Sheet</span>
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
