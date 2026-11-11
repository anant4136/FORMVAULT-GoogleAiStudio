/**
 * FORMVAULT — Production Local Image Processing Engine
 * 100% offline, client-side, zero mock, measuring exact encoded byte sizes.
 * Supports JPEG, PNG, and WebP with transparency matting, progressive dimension scaling,
 * iterative quality binary search, rotation, aspect locking, and non-blocking batch execution.
 */

export type SupportedFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface CompressionOptions {
  targetBytes: number; // Target in bytes
  format: SupportedFormat;
  targetWidth?: number;
  targetHeight?: number;
  maintainAspectRatio?: boolean;
  rotationDegrees?: number; // 0, 90, 180, 270
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  minQuality?: number; // default 0.15
  matteColor?: string; // used when flattening transparent PNG to JPEG (default '#FFFFFF')
}

export interface DetailedCompressionResult {
  dataUrl: string;
  actualSizeBytes: number;
  originalSizeBytes: number;
  outputWidth: number;
  outputHeight: number;
  originalWidth: number;
  originalHeight: number;
  format: SupportedFormat;
  qualityUsed: number; // 0 to 100
  isTargetMet: boolean;
  compressionRatio: number; // e.g. 0.22 (22% of original)
  percentReduction: number; // e.g. 78% reduction
  explanation?: string;
  candidateCount: number;
}

export interface ResizeTransformOptions {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  rotationDegrees?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  cropPreset?: 'none' | '1:1' | '3:4' | '7:9' | '16:9';
  outputFormat: SupportedFormat;
  quality?: number;
  matteColor?: string;
}

export interface BatchItemProgress {
  index: number;
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: DetailedCompressionResult;
  error?: string;
}

/**
 * Loads image safely into HTMLImageElement with error handling.
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src || !src.trim()) {
      return reject(new Error('Source image data is empty or invalid'));
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error('Image decoded with zero dimensions'));
      } else {
        resolve(img);
      }
    };
    img.onerror = () => reject(new Error('Failed to decode image data'));
    img.src = src;
  });
}

/**
 * Accurately measures the byte size of a data URL or Blob.
 */
export function measureDataUrlSizeBytes(dataUrl: string): number {
  if (dataUrl.startsWith('data:')) {
    const base64Index = dataUrl.indexOf(',');
    if (base64Index !== -1) {
      const base64 = dataUrl.substring(base64Index + 1);
      // Base64 padding correction
      let padding = 0;
      if (base64.endsWith('==')) padding = 2;
      else if (base64.endsWith('=')) padding = 1;
      return Math.max(0, Math.round((base64.length * 3) / 4) - padding);
    }
  }
  return dataUrl.length;
}

/**
 * Checks if canvas or image has transparent pixels.
 */
function checkHasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  // Sample up to 10,000 pixels across canvas for performance
  const step = Math.max(1, Math.floor((width * height) / 10000));
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 3; i < data.length; i += 4 * step) {
    if (data[i] < 255) {
      return true;
    }
  }
  return false;
}

/**
 * Production iterative compression engine.
 * Never alters original. Iteratively searches quality and progressive dimension downsampling
 * to identify the optimal candidate output.
 */
export async function compressImageIterative(
  src: string,
  originalSizeBytes: number,
  options: CompressionOptions
): Promise<DetailedCompressionResult> {
  const img = await loadImageElement(src);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  // 1. Calculate base target dimensions
  let targetW = options.targetWidth || origW;
  let targetH = options.targetHeight || origH;

  if (options.maintainAspectRatio !== false) {
    if (options.targetWidth && !options.targetHeight) {
      targetH = Math.round((origH / origW) * targetW);
    } else if (options.targetHeight && !options.targetWidth) {
      targetW = Math.round((origW / origH) * targetH);
    } else if (options.targetWidth && options.targetHeight) {
      // Fit within bounding box while preserving aspect
      const scale = Math.min(options.targetWidth / origW, options.targetHeight / origH);
      targetW = Math.max(1, Math.round(origW * scale));
      targetH = Math.max(1, Math.round(origH * scale));
    }
  }

  // Account for 90 or 270 degree rotation swapping dimensions
  const rot = (options.rotationDegrees || 0) % 360;
  const isRotated90or270 = rot === 90 || rot === 270;
  const canvasW = isRotated90or270 ? targetH : targetW;
  const canvasH = isRotated90or270 ? targetW : targetH;

  let workingCanvas = document.createElement('canvas');
  workingCanvas.width = canvasW;
  workingCanvas.height = canvasH;
  let ctx = workingCanvas.getContext('2d')!;

  // Handle transparency flattening if converting to JPEG
  const isTargetJpeg = options.format === 'image/jpeg';
  if (isTargetJpeg) {
    ctx.fillStyle = options.matteColor || '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Draw with transformations
  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  if (rot !== 0) {
    ctx.rotate((rot * Math.PI) / 180);
  }
  const scaleX = options.flipHorizontal ? -1 : 1;
  const scaleY = options.flipVertical ? -1 : 1;
  ctx.scale(scaleX, scaleY);
  ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();

  // If PNG format was requested, test if original can meet target
  if (options.format === 'image/png') {
    const pngDataUrl = workingCanvas.toDataURL('image/png');
    const pngSize = measureDataUrlSizeBytes(pngDataUrl);

    if (pngSize <= options.targetBytes) {
      const reduction = Math.max(0, Math.round(((originalSizeBytes - pngSize) / originalSizeBytes) * 100));
      return {
        dataUrl: pngDataUrl,
        actualSizeBytes: pngSize,
        originalSizeBytes,
        outputWidth: canvasW,
        outputHeight: canvasH,
        originalWidth: origW,
        originalHeight: origH,
        format: 'image/png',
        qualityUsed: 100,
        isTargetMet: true,
        compressionRatio: pngSize / originalSizeBytes,
        percentReduction: reduction,
        candidateCount: 1,
      };
    }
  }

  // Iterative binary candidate search on quality and progressive downscaling
  let bestCandidateDataUrl: string = '';
  let bestCandidateSize = Infinity;
  let bestQuality = 85;
  let candidateCount = 0;
  let currentResolutionW = canvasW;
  let currentResolutionH = canvasH;

  const minQ = options.minQuality || 0.15;
  const maxIterations = 4; // Up to 4 progressive downscale attempts

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let lowQ = minQ;
    let highQ = 0.98;

    // Binary search on quality (6 iterations provides ~1% quality precision)
    for (let step = 0; step < 6; step++) {
      const midQ = (lowQ + highQ) / 2;
      const testDataUrl = workingCanvas.toDataURL(options.format, midQ);
      const testSize = measureDataUrlSizeBytes(testDataUrl);
      candidateCount++;

      if (testSize <= options.targetBytes) {
        // Meets requirement! Save as best valid candidate and test if we can achieve higher quality
        bestCandidateDataUrl = testDataUrl;
        bestCandidateSize = testSize;
        bestQuality = Math.round(midQ * 100);
        lowQ = midQ + 0.05;
      } else {
        // Too large, try lower quality
        if (!bestCandidateDataUrl || testSize < bestCandidateSize) {
          bestCandidateDataUrl = testDataUrl;
          bestCandidateSize = testSize;
          bestQuality = Math.round(midQ * 100);
        }
        highQ = midQ - 0.05;
      }

      if (highQ < lowQ) break;
    }

    // If target met or resolution is already very small (< 180px), stop downscaling
    if (bestCandidateSize <= options.targetBytes || currentResolutionW < 180 || currentResolutionH < 180) {
      break;
    }

    // Target not met: progressively scale down dimensions by 20% to achieve byte size constraint
    currentResolutionW = Math.max(120, Math.round(currentResolutionW * 0.8));
    currentResolutionH = Math.max(120, Math.round(currentResolutionH * 0.8));

    const downscaledCanvas = document.createElement('canvas');
    downscaledCanvas.width = currentResolutionW;
    downscaledCanvas.height = currentResolutionH;
    const dCtx = downscaledCanvas.getContext('2d')!;

    if (isTargetJpeg) {
      dCtx.fillStyle = options.matteColor || '#FFFFFF';
      dCtx.fillRect(0, 0, currentResolutionW, currentResolutionH);
    }
    dCtx.drawImage(workingCanvas, 0, 0, currentResolutionW, currentResolutionH);
    workingCanvas = downscaledCanvas;
  }

  const isTargetMet = bestCandidateSize <= options.targetBytes;
  const targetKb = Math.round(options.targetBytes / 1024);
  const achievedKb = Math.round(bestCandidateSize / 1024);

  let explanation: string | undefined;
  if (!isTargetMet) {
    explanation = `The requested target of ${targetKb} KB could not be achieved without causing extreme compression distortion. The best legible candidate reached is ${achievedKb} KB (${bestQuality}% quality at ${currentResolutionW}x${currentResolutionH}px).`;
  }

  const reduction = Math.max(
    0,
    Math.round(((originalSizeBytes - bestCandidateSize) / originalSizeBytes) * 100)
  );

  return {
    dataUrl: bestCandidateDataUrl,
    actualSizeBytes: bestCandidateSize,
    originalSizeBytes,
    outputWidth: currentResolutionW,
    outputHeight: currentResolutionH,
    originalWidth: origW,
    originalHeight: origH,
    format: options.format,
    qualityUsed: bestQuality,
    isTargetMet,
    compressionRatio: bestCandidateSize / originalSizeBytes,
    percentReduction: reduction,
    explanation,
    candidateCount,
  };
}

/**
 * Resizes, crops, and transforms an image with rotation and aspect locking.
 */
export async function resizeAndTransformImage(
  src: string,
  originalSizeBytes: number,
  options: ResizeTransformOptions
): Promise<DetailedCompressionResult> {
  const img = await loadImageElement(src);
  let srcX = 0;
  let srcY = 0;
  let srcW = img.naturalWidth;
  let srcH = img.naturalHeight;

  // Apply crop preset if requested
  if (options.cropPreset && options.cropPreset !== 'none') {
    let targetRatio = 1;
    if (options.cropPreset === '1:1') targetRatio = 1;
    else if (options.cropPreset === '3:4') targetRatio = 3 / 4;
    else if (options.cropPreset === '7:9') targetRatio = 35 / 45; // Standard passport
    else if (options.cropPreset === '16:9') targetRatio = 16 / 9;

    const currentRatio = srcW / srcH;
    if (currentRatio > targetRatio) {
      // Image is wider than crop target
      const newW = srcH * targetRatio;
      srcX = (srcW - newW) / 2;
      srcW = newW;
    } else {
      // Image is taller than crop target
      const newH = srcW / targetRatio;
      srcY = (srcH - newH) / 2;
      srcH = newH;
    }
  }

  let finalW = options.width;
  let finalH = options.height;

  if (options.maintainAspectRatio) {
    const cropRatio = srcW / srcH;
    if (finalW > 0 && (!finalH || finalH <= 0)) {
      finalH = Math.round(finalW / cropRatio);
    } else if (finalH > 0 && (!finalW || finalW <= 0)) {
      finalW = Math.round(finalH * cropRatio);
    }
  }

  const rot = (options.rotationDegrees || 0) % 360;
  const isRotated = rot === 90 || rot === 270;
  const canvasW = isRotated ? finalH : finalW;
  const canvasH = isRotated ? finalW : finalH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // Handle transparent image flattening when converting to JPEG
  if (options.outputFormat === 'image/jpeg') {
    ctx.fillStyle = options.matteColor || '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  if (rot !== 0) ctx.rotate((rot * Math.PI) / 180);
  const scaleX = options.flipHorizontal ? -1 : 1;
  const scaleY = options.flipVertical ? -1 : 1;
  ctx.scale(scaleX, scaleY);
  ctx.drawImage(img, srcX, srcY, srcW, srcH, -finalW / 2, -finalH / 2, finalW, finalH);
  ctx.restore();

  const quality = (options.quality || 90) / 100;
  const dataUrl = canvas.toDataURL(options.outputFormat, quality);
  const actualSizeBytes = measureDataUrlSizeBytes(dataUrl);

  const reduction = Math.max(
    0,
    Math.round(((originalSizeBytes - actualSizeBytes) / originalSizeBytes) * 100)
  );

  return {
    dataUrl,
    actualSizeBytes,
    originalSizeBytes,
    outputWidth: canvasW,
    outputHeight: canvasH,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    format: options.outputFormat,
    qualityUsed: Math.round(quality * 100),
    isTargetMet: true,
    compressionRatio: actualSizeBytes / originalSizeBytes,
    percentReduction: reduction,
    candidateCount: 1,
  };
}

/**
 * Executes batch processing of multiple images non-blockingly using requestAnimationFrame.
 */
export async function executeBatchProcessing(
  items: { id: string; title: string; dataUrl: string; sizeBytes: number }[],
  options: CompressionOptions,
  onProgress: (progress: BatchItemProgress[]) => void
): Promise<BatchItemProgress[]> {
  const progressList: BatchItemProgress[] = items.map((item, idx) => ({
    index: idx,
    id: item.id,
    title: item.title,
    status: 'pending',
  }));

  onProgress([...progressList]);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    progressList[i].status = 'processing';
    onProgress([...progressList]);

    // Yield control to the browser event loop so UI does not freeze
    await new Promise((resolve) => setTimeout(resolve, 30));

    try {
      const res = await compressImageIterative(item.dataUrl, item.sizeBytes, options);
      progressList[i].status = 'completed';
      progressList[i].result = res;
    } catch (err: any) {
      progressList[i].status = 'failed';
      progressList[i].error = err?.message || 'Processing failed';
    }

    onProgress([...progressList]);
  }

  return progressList;
}

/**
 * Standard preset dimension options for quick selection in exams/visas/forms.
 */
export const DIMENSION_PRESETS = [
  { label: 'Passport (35x45 mm)', width: 413, height: 531, spec: '300 DPI Official' },
  { label: 'US Visa / Square (2x2 in)', width: 600, height: 600, spec: 'Square ID' },
  { label: 'Small ID (30x40 mm)', width: 354, height: 472, spec: 'European / Asian ID' },
  { label: 'Signature Specimen', width: 560, height: 200, spec: '2.8:1 Aspect' },
  { label: 'Document Scan Standard', width: 1200, height: 1600, spec: '3:4 Aspect' },
  { label: 'Full HD (1080p)', width: 1920, height: 1080, spec: '16:9 Landscape' },
];

/**
 * Preset target file sizes commonly required by portals.
 */
export const SIZE_PRESETS = [
  { label: '20 KB', bytes: 20 * 1024, desc: 'Exam Signatures' },
  { label: '50 KB', bytes: 50 * 1024, desc: 'Government Photos' },
  { label: '100 KB', bytes: 100 * 1024, desc: 'ID Documents' },
  { label: '200 KB', bytes: 200 * 1024, desc: 'Certificates' },
  { label: '500 KB', bytes: 500 * 1024, desc: 'High Res Dossier' },
];

export interface PassportPresetItem {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  widthPx300Dpi: number;
  heightPx300Dpi: number;
  description: string;
}

export const PASSPORT_PRESETS: PassportPresetItem[] = [
  {
    id: '35x45mm',
    name: 'India / UK / Europe (35x45 mm)',
    widthMm: 35,
    heightMm: 45,
    widthPx300Dpi: 413,
    heightPx300Dpi: 531,
    description: 'Standard biometric passport & visa for Europe, UK, India, Australia',
  },
  {
    id: '2x2inch',
    name: 'US Visa / Passport (2x2 inch / 51x51 mm)',
    widthMm: 50.8,
    heightMm: 50.8,
    widthPx300Dpi: 600,
    heightPx300Dpi: 600,
    description: 'United States DS-160 visa, US passport, India OCI square specification',
  },
  {
    id: '30x40mm',
    name: 'Regional ID (30x40 mm)',
    widthMm: 30,
    heightMm: 40,
    widthPx300Dpi: 354,
    heightPx300Dpi: 472,
    description: 'European, Asian driving licenses and civil student identity cards',
  },
  {
    id: '35x35mm',
    name: 'Square ID (35x35 mm)',
    widthMm: 35,
    heightMm: 35,
    widthPx300Dpi: 413,
    heightPx300Dpi: 413,
    description: 'Special exam admit cards and municipal identification cards',
  },
];

export interface PassportStudioRequest {
  widthMm: number;
  heightMm: number;
  dpi?: number;
  backgroundColor: string; // '#FFFFFF', '#DCEAFE', '#F8FAFC', '#1E3A8A', 'original'
  zoom: number; // 0.8 to 2.5
  panX: number; // -100 to 100
  panY: number; // -100 to 100
  rotation: number; // 0, 90, 180, 270
  outputFormat: 'image/jpeg' | 'image/png';
  targetKb?: number;
}

export async function processPassportStudioPhoto(
  src: string,
  originalSizeBytes: number,
  request: PassportStudioRequest
): Promise<DetailedCompressionResult> {
  const img = await loadImageElement(src);
  const dpi = request.dpi || 300;
  const targetW = Math.round((request.widthMm / 25.4) * dpi);
  const targetH = Math.round((request.heightMm / 25.4) * dpi);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;

  // Fill solid background if not 'original'
  if (request.backgroundColor !== 'original') {
    ctx.fillStyle = request.backgroundColor;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  // Draw image centered with zoom, pan, and rotation
  ctx.save();
  ctx.translate(targetW / 2 + (request.panX / 100) * targetW, targetH / 2 + (request.panY / 100) * targetH);

  if (request.rotation !== 0) {
    ctx.rotate((request.rotation * Math.PI) / 180);
  }

  // Compute base cover scale
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const targetAspect = targetW / targetH;
  let baseScale = 1;
  if (imgAspect > targetAspect) {
    baseScale = targetH / img.naturalHeight;
  } else {
    baseScale = targetW / img.naturalWidth;
  }

  const finalScale = baseScale * request.zoom;
  const drawW = img.naturalWidth * finalScale;
  const drawH = img.naturalHeight * finalScale;

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // If target KB was specified, iteratively compress
  if (request.targetKb && request.targetKb > 0) {
    return await compressImageIterative(canvas.toDataURL(request.outputFormat, 0.95), originalSizeBytes, {
      targetBytes: request.targetKb * 1024,
      format: request.outputFormat,
      targetWidth: targetW,
      targetHeight: targetH,
      maintainAspectRatio: true,
      matteColor: request.backgroundColor !== 'original' ? request.backgroundColor : '#FFFFFF',
    });
  }

  const quality = request.outputFormat === 'image/jpeg' ? 0.92 : 1.0;
  const dataUrl = canvas.toDataURL(request.outputFormat, quality);
  const actualSize = measureDataUrlSizeBytes(dataUrl);
  const reduction = Math.max(0, Math.round(((originalSizeBytes - actualSize) / originalSizeBytes) * 100));

  return {
    dataUrl,
    actualSizeBytes: actualSize,
    originalSizeBytes,
    outputWidth: targetW,
    outputHeight: targetH,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    format: request.outputFormat,
    qualityUsed: 92,
    isTargetMet: true,
    compressionRatio: actualSize / originalSizeBytes,
    percentReduction: reduction,
    candidateCount: 1,
  };
}

export interface PhotoSheetRequest {
  pageSize: '4x6' | 'a4' | '5x7' | 'letter';
  copiesCount: number;
  spacingMm?: number;
  marginMm?: number;
  dpi?: number;
  drawCutGuidelines?: boolean;
}

export async function generatePrintablePhotoSheet(
  photoDataUrl: string,
  request: PhotoSheetRequest
): Promise<{ dataUrl: string; sizeBytes: number; widthPx: number; heightPx: number }> {
  const photo = await loadImageElement(photoDataUrl);
  const dpi = request.dpi || 300;

  // Sheet sizes in mm
  let sheetWidthMm = 101.6;
  let sheetHeightMm = 152.4; // 4x6 inch default

  if (request.pageSize === 'a4') {
    sheetWidthMm = 210;
    sheetHeightMm = 297;
  } else if (request.pageSize === '5x7') {
    sheetWidthMm = 127;
    sheetHeightMm = 177.8;
  } else if (request.pageSize === 'letter') {
    sheetWidthMm = 215.9;
    sheetHeightMm = 279.4;
  }

  const sheetWPx = Math.round((sheetWidthMm / 25.4) * dpi);
  const sheetHPx = Math.round((sheetHeightMm / 25.4) * dpi);

  const canvas = document.createElement('canvas');
  canvas.width = sheetWPx;
  canvas.height = sheetHPx;
  const ctx = canvas.getContext('2d')!;

  // Fill sheet background with clean white paper
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, sheetWPx, sheetHPx);

  const marginMm = request.marginMm ?? 6;
  const spacingMm = request.spacingMm ?? 4;

  const marginPx = Math.round((marginMm / 25.4) * dpi);
  const spacingPx = Math.round((spacingMm / 25.4) * dpi);

  const photoWPx = photo.naturalWidth;
  const photoHPx = photo.naturalHeight;

  const usableW = sheetWPx - marginPx * 2;
  const usableH = sheetHPx - marginPx * 2;

  const cols = Math.max(1, Math.floor((usableW + spacingPx) / (photoWPx + spacingPx)));
  const rows = Math.max(1, Math.floor((usableH + spacingPx) / (photoHPx + spacingPx)));

  const countToDraw = Math.min(request.copiesCount, cols * rows);

  // Center the grid on page
  const totalGridW = cols * photoWPx + (cols - 1) * spacingPx;
  const totalGridH = rows * photoHPx + (rows - 1) * spacingPx;
  const startX = Math.max(marginPx, Math.round((sheetWPx - totalGridW) / 2));
  const startY = Math.max(marginPx, Math.round((sheetHPx - totalGridH) / 2));

  let drawn = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (drawn >= countToDraw) break;

      const x = startX + c * (photoWPx + spacingPx);
      const y = startY + r * (photoHPx + spacingPx);

      ctx.drawImage(photo, x, y, photoWPx, photoHPx);

      // Draw dashed scissor cut guidelines
      if (request.drawCutGuidelines !== false) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(x, y, photoWPx, photoHPx);
        ctx.setLineDash([]);
      }

      drawn++;
    }
    if (drawn >= countToDraw) break;
  }

  // Add subtle footer watermark
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.round(dpi * 0.04)}px sans-serif`;
  ctx.fillText(`FormVault • 300 DPI High-Resolution Printable Sheet • ${drawn} copies`, marginPx, sheetHPx - 20);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const sizeBytes = measureDataUrlSizeBytes(dataUrl);

  return {
    dataUrl,
    sizeBytes,
    widthPx: sheetWPx,
    heightPx: sheetHPx,
  };
}

export interface SignatureStudioRequest {
  threshold: number; // 80 to 240
  contrastBoost: number; // 0.8 to 2.5
  brightnessAdjustment: number; // -50 to 50
  autoTrim: boolean;
  makeTransparent: boolean;
  backgroundColor: string; // '#FFFFFF'
  targetWidthPx?: number;
  targetHeightPx?: number;
  targetKb?: number;
  outputFormat: 'image/png' | 'image/jpeg';
}

export async function processSignatureStudio(
  src: string,
  originalSizeBytes: number,
  request: SignatureStudioRequest
): Promise<DetailedCompressionResult> {
  const img = await loadImageElement(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let inkCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % canvas.width;
    const y = Math.floor((i / 4) / canvas.width);

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    gray = Math.min(255, Math.max(0, gray + request.brightnessAdjustment));

    if (request.contrastBoost !== 1.0) {
      gray = Math.min(255, Math.max(0, (gray - 128) * request.contrastBoost + 128));
    }

    if (gray > request.threshold) {
      // Paper background
      if (request.makeTransparent && request.outputFormat === 'image/png') {
        data[i + 3] = 0; // Transparent
      } else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    } else {
      // Ink stroke
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      inkCount++;

      if (request.makeTransparent && request.outputFormat === 'image/png') {
        const alpha = Math.min(255, Math.max(0, Math.round((1.0 - gray / request.threshold) * 255 * request.contrastBoost)));
        data[i] = 15;
        data[i + 1] = 23;
        data[i + 2] = 42; // Rich slate ink
        data[i + 3] = alpha;
      } else {
        // Deep black ink
        const inkVal = Math.round(gray * 0.4);
        data[i] = inkVal;
        data[i + 1] = inkVal;
        data[i + 2] = inkVal;
        data[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Auto-trim excess whitespace around signature strokes
  let finalCanvas = canvas;
  if (request.autoTrim && inkCount > 0 && maxX > minX && maxY > minY) {
    const padding = 16;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropW = Math.min(canvas.width - cropX, maxX - minX + padding * 2);
    const cropH = Math.min(canvas.height - cropY, maxY - minY + padding * 2);

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = cropW;
    trimmedCanvas.height = cropH;
    const tCtx = trimmedCanvas.getContext('2d')!;

    if (!request.makeTransparent || request.outputFormat === 'image/jpeg') {
      tCtx.fillStyle = '#FFFFFF';
      tCtx.fillRect(0, 0, cropW, cropH);
    }
    tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    finalCanvas = trimmedCanvas;
  }

  // Resize if exact target dimensions requested
  if (request.targetWidthPx && request.targetHeightPx &&
    (finalCanvas.width !== request.targetWidthPx || finalCanvas.height !== request.targetHeightPx)
  ) {
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = request.targetWidthPx;
    resizedCanvas.height = request.targetHeightPx;
    const rCtx = resizedCanvas.getContext('2d')!;
    if (!request.makeTransparent || request.outputFormat === 'image/jpeg') {
      rCtx.fillStyle = '#FFFFFF';
      rCtx.fillRect(0, 0, request.targetWidthPx, request.targetHeightPx);
    }
    rCtx.drawImage(finalCanvas, 0, 0, request.targetWidthPx, request.targetHeightPx);
    finalCanvas = resizedCanvas;
  }

  // Target KB compression
  if (request.targetKb && request.targetKb > 0) {
    return await compressImageIterative(
      finalCanvas.toDataURL(request.outputFormat, 0.95),
      originalSizeBytes,
      {
        targetBytes: request.targetKb * 1024,
        format: request.outputFormat,
        matteColor: '#FFFFFF',
      }
    );
  }

  const quality = request.outputFormat === 'image/jpeg' ? 0.92 : 1.0;
  const dataUrl = finalCanvas.toDataURL(request.outputFormat, quality);
  const actualSize = measureDataUrlSizeBytes(dataUrl);
  const reduction = Math.max(0, Math.round(((originalSizeBytes - actualSize) / originalSizeBytes) * 100));

  return {
    dataUrl,
    actualSizeBytes: actualSize,
    originalSizeBytes,
    outputWidth: finalCanvas.width,
    outputHeight: finalCanvas.height,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    format: request.outputFormat,
    qualityUsed: 92,
    isTargetMet: true,
    compressionRatio: actualSize / originalSizeBytes,
    percentReduction: reduction,
    candidateCount: 1,
  };
}

