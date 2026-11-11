/**
 * FORMVAULT — Application Profiles & Preparation Engine
 * 100% Offline, on-device document requirement validation, transformation pipeline,
 * and structured ZIP export packaging.
 */

import JSZip from 'jszip';
import {
  ApplicationProfile,
  ProfileRequirement,
  PreparedDocumentItem,
  PreparationPackageResult,
  VaultDocument,
  AllowedFileFormat,
} from '../types';
import {
  compressImageIterative,
  resizeAndTransformImage,
  SupportedFormat,
} from './imageProcessor';
import {
  imagesToPdf,
  optimizePdf,
  renderPdfPageToCanvas,
} from './pdfProcessor';

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 600, height: 400 });
    img.src = dataUrl;
  });
}

// ==========================================
// 1. Built-in Application Profile Presets
// ==========================================

export interface ProfilePresetDefinition {
  id: string;
  title: string;
  targetOrganization: string;
  description: string;
  requirements: Omit<ProfileRequirement, 'id'>[];
}

export const PROFILE_PRESETS: ProfilePresetDefinition[] = [
  {
    id: 'preset-university',
    title: 'University Admission Application',
    targetOrganization: 'Global Admissions Portal',
    description:
      'Standard document specifications for university, college, and graduate program applications.',
    requirements: [
      {
        name: 'Passport Photograph',
        category: 'PHOTOS',
        allowedFormats: ['image/jpeg'],
        minSizeBytes: 10 * 1024,
        maxSizeBytes: 50 * 1024,
        requiredWidthPx: 413,
        requiredHeightPx: 531,
        notes: 'White background, 35mm x 45mm, clear face lighting.',
      },
      {
        name: 'Applicant Signature',
        category: 'SIGNATURES',
        allowedFormats: ['image/jpeg', 'image/png'],
        minSizeBytes: 4 * 1024,
        maxSizeBytes: 20 * 1024,
        requiredWidthPx: 600,
        requiredHeightPx: 250,
        notes: 'Black or dark blue ink on clean white background.',
      },
      {
        name: 'Academic Transcript & Degree',
        category: 'ACADEMIC',
        allowedFormats: ['application/pdf'],
        maxSizeBytes: 500 * 1024,
        notes: 'Combined multi-page PDF marksheet or degree certificate.',
      },
      {
        name: 'National Photo ID Card',
        category: 'ID_CARDS',
        allowedFormats: ['application/pdf', 'image/jpeg'],
        maxSizeBytes: 250 * 1024,
        notes: 'Clear copy of Passport, National ID, or Driving License.',
      },
    ],
  },
  {
    id: 'preset-competitive-exam',
    title: 'Competitive Examination Portal',
    targetOrganization: 'Public Service / Examination Board',
    description:
      'Strict dimension and byte size constraints commonly enforced by public service, civil services, and national exam boards (e.g. UPSC, GATE, SSC).',
    requirements: [
      {
        name: 'Official Passport Photo',
        category: 'PHOTOS',
        allowedFormats: ['image/jpeg'],
        minSizeBytes: 20 * 1024,
        maxSizeBytes: 50 * 1024,
        minWidthPx: 350,
        minHeightPx: 450,
        notes: 'Strictly between 20 KB and 50 KB in JPEG format only.',
      },
      {
        name: 'Candidate Signature',
        category: 'SIGNATURES',
        allowedFormats: ['image/jpeg'],
        minSizeBytes: 10 * 1024,
        maxSizeBytes: 20 * 1024,
        minWidthPx: 300,
        minHeightPx: 100,
        notes: 'Strictly between 10 KB and 20 KB, horizontal aspect ratio.',
      },
      {
        name: 'Identity & Age Proof',
        category: 'ID_CARDS',
        allowedFormats: ['application/pdf', 'image/jpeg'],
        maxSizeBytes: 300 * 1024,
        notes: 'Official government photo identification with date of birth.',
      },
      {
        name: 'Category or Qualification Certificate',
        category: 'CERTIFICATES',
        allowedFormats: ['application/pdf'],
        maxSizeBytes: 300 * 1024,
        notes: 'Signed and attested PDF certificate under 300 KB.',
      },
    ],
  },
  {
    id: 'preset-govt-job',
    title: 'Government Job Recruitment',
    targetOrganization: 'Civil Service & State Recruitment Board',
    description:
      'Comprehensive job applicant bundle with educational qualifications, NOC/experience proof, and identity documents.',
    requirements: [
      {
        name: 'Color Photograph',
        category: 'PHOTOS',
        allowedFormats: ['image/jpeg'],
        minSizeBytes: 20 * 1024,
        maxSizeBytes: 100 * 1024,
        requiredWidthPx: 413,
        requiredHeightPx: 531,
        notes: 'Recent front-facing color photo taken within the last 6 months.',
      },
      {
        name: 'Specimen Signature',
        category: 'SIGNATURES',
        allowedFormats: ['image/jpeg', 'image/png'],
        minSizeBytes: 5 * 1024,
        maxSizeBytes: 30 * 1024,
        notes: 'Unbroken signature on plain paper.',
      },
      {
        name: 'Educational Degree Marksheet',
        category: 'ACADEMIC',
        allowedFormats: ['application/pdf'],
        maxSizeBytes: 1024 * 1024, // 1 MB
        notes: 'Degree certificate or consolidated semester marksheets.',
      },
      {
        name: 'Experience / Employment Record',
        category: 'EMPLOYMENT',
        allowedFormats: ['application/pdf'],
        maxSizeBytes: 500 * 1024,
        notes: 'Prior appointment letter, service certificate or NOC.',
      },
    ],
  },
  {
    id: 'preset-internship',
    title: 'Internship & Fellowship Bundle',
    targetOrganization: 'Corporate & Research Lab Application',
    description:
      'Streamlined documentation for internships, university research fellowships, and student exchange programs.',
    requirements: [
      {
        name: 'Professional Headshot',
        category: 'PHOTOS',
        allowedFormats: ['image/jpeg', 'image/png'],
        maxSizeBytes: 200 * 1024,
        notes: 'Crisp professional profile picture.',
      },
      {
        name: 'College Student ID Card',
        category: 'ID_CARDS',
        allowedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
        maxSizeBytes: 400 * 1024,
        notes: 'Current institution enrollment ID card.',
      },
      {
        name: 'Latest Academic Transcript',
        category: 'ACADEMIC',
        allowedFormats: ['application/pdf'],
        maxSizeBytes: 1024 * 1024,
        notes: 'PDF grade card showing cumulative GPA.',
      },
    ],
  },
  {
    id: 'preset-scholarship',
    title: 'Scholarship & Financial Aid',
    targetOrganization: 'Academic Foundation / Trust',
    description:
      'Merit verification and financial documentation required for higher education scholarship awards.',
    requirements: [
      {
        name: 'Applicant Photograph',
        category: 'PHOTOS',
        allowedFormats: ['image/jpeg'],
        maxSizeBytes: 60 * 1024,
        notes: 'Passport style photo.',
      },
      {
        name: 'Income & Financial Statement',
        category: 'FINANCIAL',
        allowedFormats: ['application/pdf'],
        maxSizeBytes: 500 * 1024,
        notes: 'Salary slip, income certificate, or bank declaration.',
      },
      {
        name: 'Academic Merit Record',
        category: 'ACADEMIC',
        allowedFormats: ['application/pdf'],
        maxSizeBytes: 800 * 1024,
        notes: 'Competitive exam score card or ranking certificate.',
      },
    ],
  },
  {
    id: 'preset-custom',
    title: 'Custom Application Profile',
    targetOrganization: 'Custom Organization / Employer',
    description:
      'Customizable profile tailored to any specific online portal or organizational guideline.',
    requirements: [
      {
        name: 'Primary Photograph',
        category: 'PHOTOS',
        allowedFormats: ['image/jpeg'],
        maxSizeBytes: 100 * 1024,
        notes: 'Photo as per portal instructions.',
      },
      {
        name: 'Primary Document Proof',
        category: 'ID_CARDS',
        allowedFormats: ['application/pdf', 'image/jpeg'],
        maxSizeBytes: 500 * 1024,
        notes: 'Identity or qualifying certificate.',
      },
    ],
  },
];

export function createProfileFromPreset(
  presetKey: string,
  overrides?: Partial<ApplicationProfile>
): ApplicationProfile {
  const preset =
    PROFILE_PRESETS.find((p) => p.id === presetKey) || PROFILE_PRESETS[0];
  const now = Date.now();

  const requirements: ProfileRequirement[] = preset.requirements.map(
    (req, idx) => ({
      ...req,
      id: `req-${now}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
    })
  );

  return {
    id: `profile-${now}-${Math.random().toString(36).substr(2, 6)}`,
    title: overrides?.title || preset.title,
    description: overrides?.description || preset.description,
    targetOrganization:
      overrides?.targetOrganization || preset.targetOrganization,
    deadline: overrides?.deadline || now + 86400000 * 30, // 30 days default
    documentIds: [],
    requiredCategories: Array.from(new Set(requirements.map((r) => r.category))),
    requirements,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ==========================================
// 2. Requirement Diagnostic & Pre-flight
// ==========================================

export interface RequirementDiagnostic {
  status: 'ready' | 'needs_processing' | 'unmapped' | 'incompatible';
  badgeLabel: string;
  badgeColor: string;
  actionsNeeded: string[];
  summaryNote: string;
}

export function checkRequirementDiagnostic(
  requirement: ProfileRequirement,
  doc?: VaultDocument
): RequirementDiagnostic {
  if (!doc) {
    return {
      status: 'unmapped',
      badgeLabel: 'Unmapped',
      badgeColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      actionsNeeded: ['Assign a document from My Vault'],
      summaryNote: 'No document assigned to this requirement yet.',
    };
  }

  const actions: string[] = [];
  const allowed = requirement.allowedFormats && requirement.allowedFormats.length > 0
    ? requirement.allowedFormats
    : (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as AllowedFileFormat[]);

  // Format check
  const formatMatches = allowed.includes(doc.mimeType as AllowedFileFormat);
  if (!formatMatches) {
    const targetFmt = allowed[0].replace('image/', '').replace('application/', '').toUpperCase();
    actions.push(`Convert from ${doc.mimeType.split('/')[1]?.toUpperCase()} to ${targetFmt}`);
  }

  // File size check
  if (requirement.maxSizeBytes && doc.fileSizeBytes > requirement.maxSizeBytes) {
    const currKb = Math.round(doc.fileSizeBytes / 1024);
    const maxKb = Math.round(requirement.maxSizeBytes / 1024);
    actions.push(`Compress file from ${currKb} KB to under ${maxKb} KB`);
  }

  // Specific dimensions check
  if (requirement.requiredWidthPx && requirement.requiredHeightPx) {
    actions.push(`Adjust dimensions to ${requirement.requiredWidthPx} × ${requirement.requiredHeightPx} px`);
  } else if (requirement.minWidthPx || requirement.minHeightPx) {
    actions.push(`Ensure dimensions meet minimum limits`);
  }

  if (actions.length === 0) {
    return {
      status: 'ready',
      badgeLabel: 'Compliant',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
      actionsNeeded: [],
      summaryNote: 'Source file already meets all format and size requirements.',
    };
  }

  return {
    status: 'needs_processing',
    badgeLabel: 'Needs Preparation',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    actionsNeeded: actions,
    summaryNote: actions.join(', '),
  };
}

// ==========================================
// 3. Automated Preparation Pipeline
// ==========================================

function getCleanSafeFilename(name: string, ext: string): string {
  const safe = name
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return `${safe || 'Document'}.${ext}`;
}

export async function prepareSingleRequirement(
  requirement: ProfileRequirement,
  sourceDoc: VaultDocument,
  onProgress?: (message: string) => void
): Promise<PreparedDocumentItem> {
  const transformations: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  let currentDataUrl = sourceDoc.dataUrl;
  let currentMimeType = sourceDoc.mimeType;
  let currentSizeBytes = sourceDoc.fileSizeBytes;
  let currentWidth = 0;
  let currentHeight = 0;

  const allowedFormats = requirement.allowedFormats && requirement.allowedFormats.length > 0
    ? requirement.allowedFormats
    : (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as AllowedFileFormat[]);

  const prefersPdf = allowedFormats.length === 1 && allowedFormats[0] === 'application/pdf';
  const prefersImage = !allowedFormats.includes('application/pdf');

  // STEP 1: CROSS-MODAL CONVERSION (PDF <-> Image) if necessary
  if (sourceDoc.mimeType === 'application/pdf' && prefersImage) {
    onProgress?.(`Extracting first page of PDF for image requirement...`);
    try {
      const { canvas, width, height } = await renderPdfPageToCanvas(currentDataUrl, 1, 2.0);
      const targetImgFormat = allowedFormats[0] as SupportedFormat;
      currentDataUrl = canvas.toDataURL(targetImgFormat, 0.92);
      currentMimeType = targetImgFormat;
      currentWidth = width;
      currentHeight = height;
      currentSizeBytes = Math.round((currentDataUrl.length * 3) / 4);
      transformations.push(`Extracted first page from PDF as ${targetImgFormat.split('/')[1].toUpperCase()}`);
    } catch (err: any) {
      errors.push(`Failed to render PDF page as image: ${err?.message || err}`);
    }
  } else if (sourceDoc.mimeType.startsWith('image/') && prefersPdf) {
    onProgress?.(`Packaging image into standard PDF container...`);
    try {
      const pdfRes = await imagesToPdf(
        [{ dataUrl: currentDataUrl, name: requirement.name }],
        { pageSize: 'A4', marginMm: 10, fitMode: 'contain', quality: 0.9 }
      );
      currentDataUrl = pdfRes.dataUrl;
      currentMimeType = 'application/pdf';
      currentSizeBytes = pdfRes.sizeBytes;
      transformations.push(`Converted image into A4 PDF document`);
    } catch (err: any) {
      errors.push(`Failed to convert image to PDF: ${err?.message || err}`);
    }
  }

  // STEP 2: PROCESSING FOR IMAGE TARGETS
  if (currentMimeType.startsWith('image/')) {
    // 2A: Dimension / Aspect Ratio Transformation
    if (requirement.requiredWidthPx && requirement.requiredHeightPx) {
      onProgress?.(`Resizing to required ${requirement.requiredWidthPx} × ${requirement.requiredHeightPx} px...`);
      try {
        const resizeRes = await resizeAndTransformImage(currentDataUrl, currentSizeBytes, {
          width: requirement.requiredWidthPx,
          height: requirement.requiredHeightPx,
          maintainAspectRatio: false,
          outputFormat: (allowedFormats[0] as SupportedFormat) || 'image/jpeg',
          quality: 0.92,
        });
        currentDataUrl = resizeRes.dataUrl;
        currentSizeBytes = resizeRes.actualSizeBytes;
        currentWidth = resizeRes.outputWidth;
        currentHeight = resizeRes.outputHeight;
        currentMimeType = resizeRes.format;
        transformations.push(`Resized to exact ${resizeRes.outputWidth} × ${resizeRes.outputHeight} px`);
      } catch (err: any) {
        warnings.push(`Could not apply exact dimension resize: ${err?.message || err}`);
      }
    } else {
      try {
        const dims = await getImageDimensions(currentDataUrl);
        currentWidth = dims.width;
        currentHeight = dims.height;

        // Check if bounds exceeded
        if (requirement.maxWidthPx && dims.width > requirement.maxWidthPx) {
          const scaledH = Math.round(dims.height * (requirement.maxWidthPx / dims.width));
          const resizeRes = await resizeAndTransformImage(currentDataUrl, currentSizeBytes, {
            width: requirement.maxWidthPx,
            height: scaledH,
            maintainAspectRatio: true,
            outputFormat: (allowedFormats[0] as SupportedFormat) || 'image/jpeg',
            quality: 0.9,
          });
          currentDataUrl = resizeRes.dataUrl;
          currentSizeBytes = resizeRes.actualSizeBytes;
          currentWidth = resizeRes.outputWidth;
          currentHeight = resizeRes.outputHeight;
          transformations.push(`Scaled down to max width ${requirement.maxWidthPx} px`);
        }
      } catch {
        currentWidth = currentWidth || 600;
        currentHeight = currentHeight || 400;
      }
    }

    // 2B: Compression & Format Target
    const targetImgFmt: SupportedFormat = allowedFormats.includes(currentMimeType as AllowedFileFormat)
      ? (currentMimeType as SupportedFormat)
      : (allowedFormats[0] as SupportedFormat) || 'image/jpeg';

    if (requirement.maxSizeBytes && currentSizeBytes > requirement.maxSizeBytes) {
      onProgress?.(`Compressing image to target under ${Math.round(requirement.maxSizeBytes / 1024)} KB...`);
      try {
        const compRes = await compressImageIterative(currentDataUrl, currentSizeBytes, {
          targetBytes: requirement.maxSizeBytes,
          format: targetImgFmt,
          matteColor: '#FFFFFF',
          minQuality: 0.15,
        });
        currentDataUrl = compRes.dataUrl;
        currentSizeBytes = compRes.actualSizeBytes;
        currentWidth = compRes.outputWidth;
        currentHeight = compRes.outputHeight;
        currentMimeType = compRes.format;
        transformations.push(
          `Compressed from ${Math.round(sourceDoc.fileSizeBytes / 1024)} KB to ${Math.round(
            compRes.actualSizeBytes / 1024
          )} KB (Quality: ${compRes.qualityUsed}%)`
        );

        if (!compRes.isTargetMet) {
          warnings.push(
            `Could not compress below ${Math.round(requirement.maxSizeBytes / 1024)} KB without excessive quality loss. Best achieved: ${Math.round(
              compRes.actualSizeBytes / 1024
            )} KB.`
          );
        }
      } catch (err: any) {
        warnings.push(`Compression error: ${err?.message || err}`);
      }
    } else if (currentMimeType !== targetImgFmt) {
      // Just convert format
      onProgress?.(`Converting format to ${targetImgFmt.split('/')[1].toUpperCase()}...`);
      try {
        const resizeRes = await resizeAndTransformImage(currentDataUrl, currentSizeBytes, {
          width: currentWidth || 600,
          height: currentHeight || 600,
          maintainAspectRatio: true,
          outputFormat: targetImgFmt,
          quality: 0.9,
          matteColor: '#FFFFFF',
        });
        currentDataUrl = resizeRes.dataUrl;
        currentSizeBytes = resizeRes.actualSizeBytes;
        currentMimeType = resizeRes.format;
        transformations.push(`Converted format to ${targetImgFmt.split('/')[1].toUpperCase()}`);
      } catch (err: any) {
        warnings.push(`Format conversion note: ${err?.message || err}`);
      }
    }
  }

  // STEP 3: PROCESSING FOR PDF TARGETS
  if (currentMimeType === 'application/pdf') {
    if (requirement.maxSizeBytes && currentSizeBytes > requirement.maxSizeBytes) {
      onProgress?.(`Optimizing and compressing PDF document...`);
      try {
        const optRes = await optimizePdf(currentDataUrl, {
          level: 'medium',
          compressImages: true,
          stripMetadata: true,
        });
        if (optRes.optimizedSizeBytes < currentSizeBytes) {
          currentDataUrl = optRes.dataUrl;
          currentSizeBytes = optRes.optimizedSizeBytes;
          transformations.push(
            `Optimized PDF from ${Math.round(optRes.originalSizeBytes / 1024)} KB to ${Math.round(
              optRes.optimizedSizeBytes / 1024
            )} KB`
          );
        } else {
          transformations.push(`PDF was already highly compressed; preserved original fidelity`);
        }

        if (currentSizeBytes > requirement.maxSizeBytes) {
          warnings.push(
            `PDF output is ${Math.round(currentSizeBytes / 1024)} KB, exceeding the requested ${Math.round(
              requirement.maxSizeBytes / 1024
            )} KB limit. Document contains vector text or high-resolution graphics that could not be downsized further.`
          );
        }
      } catch (err: any) {
        warnings.push(`PDF optimization note: ${err?.message || err}`);
      }
    }
  }

  // STEP 4: FINAL STRICT VALIDATION
  if (requirement.maxSizeBytes && currentSizeBytes > requirement.maxSizeBytes) {
    if (!warnings.some((w) => w.includes('exceeding'))) {
      warnings.push(
        `Final size (${Math.round(currentSizeBytes / 1024)} KB) exceeds required limit of ${Math.round(
          requirement.maxSizeBytes / 1024
        )} KB`
      );
    }
  }

  if (requirement.minSizeBytes && currentSizeBytes < requirement.minSizeBytes) {
    warnings.push(
      `File size (${Math.round(currentSizeBytes / 1024)} KB) is below required minimum of ${Math.round(
        requirement.minSizeBytes / 1024
      )} KB`
    );
  }

  if (requirement.minWidthPx && currentWidth > 0 && currentWidth < requirement.minWidthPx) {
    warnings.push(`Width (${currentWidth} px) is smaller than required minimum (${requirement.minWidthPx} px)`);
  }

  if (requirement.minHeightPx && currentHeight > 0 && currentHeight < requirement.minHeightPx) {
    warnings.push(`Height (${currentHeight} px) is smaller than required minimum (${requirement.minHeightPx} px)`);
  }

  // Determine file extension
  let extension = 'bin';
  if (currentMimeType === 'image/jpeg') extension = 'jpg';
  else if (currentMimeType === 'image/png') extension = 'png';
  else if (currentMimeType === 'image/webp') extension = 'webp';
  else if (currentMimeType === 'application/pdf') extension = 'pdf';

  const outputFileName = getCleanSafeFilename(requirement.name, extension);

  const status: 'ready' | 'warning' | 'error' = errors.length > 0
    ? 'error'
    : warnings.length > 0
    ? 'warning'
    : 'ready';

  return {
    requirementId: requirement.id,
    requirementName: requirement.name,
    category: requirement.category,
    sourceDocument: sourceDoc,
    status,
    outputFileName,
    outputMimeType: currentMimeType,
    outputSizeBytes: currentSizeBytes,
    outputDataUrl: currentDataUrl,
    outputWidthPx: currentWidth > 0 ? currentWidth : undefined,
    outputHeightPx: currentHeight > 0 ? currentHeight : undefined,
    transformationsApplied: transformations.length > 0 ? transformations : ['Fulfills specifications without modification'],
    warnings,
    errors,
  };
}

export async function prepareApplicationProfile(
  profile: ApplicationProfile,
  allDocuments: VaultDocument[],
  onProgress?: (index: number, total: number, message: string) => void
): Promise<PreparationPackageResult> {
  const preparedItems: PreparedDocumentItem[] = [];
  const reqs = profile.requirements || [];
  let totalBytes = 0;

  for (let i = 0; i < reqs.length; i++) {
    const req = reqs[i];
    const assignedDoc = allDocuments.find((d) => d.id === req.assignedDocumentId);

    if (!assignedDoc) {
      continue;
    }

    onProgress?.(i, reqs.length, `Preparing "${req.name}" from "${assignedDoc.title}"...`);

    const item = await prepareSingleRequirement(req, assignedDoc, (msg) => {
      onProgress?.(i, reqs.length, msg);
    });

    preparedItems.push(item);
    totalBytes += item.outputSizeBytes;
  }

  const allValid = preparedItems.length > 0 && preparedItems.every((item) => item.status === 'ready');

  // Summary audit text
  const dateStr = new Date().toLocaleString();
  let summary = `========================================================================\n`;
  summary += `FORMVAULT — APPLICATION SUBMISSION AUDIT & PREPARATION REPORT\n`;
  summary += `Generated Offline on: ${dateStr}\n`;
  summary += `Profile: ${profile.title}\n`;
  summary += `Target Organization: ${profile.targetOrganization}\n`;
  summary += `Total Items Prepared: ${preparedItems.length} of ${reqs.length} requirements\n`;
  summary += `Total Package Size: ${(totalBytes / 1024).toFixed(1)} KB\n`;
  summary += `Overall Compliance Status: ${allValid ? 'PASSED (ALL REQUIREMENTS SATISFIED)' : 'COMPLETED WITH WARNINGS'}\n`;
  summary += `========================================================================\n\n`;

  preparedItems.forEach((item, idx) => {
    summary += `[Item ${idx + 1}] ${item.requirementName}\n`;
    summary += `   • Output File: ${item.outputFileName} (${item.outputMimeType})\n`;
    summary += `   • Size: ${Math.round(item.outputSizeBytes / 1024)} KB (${item.outputSizeBytes} bytes)\n`;
    if (item.outputWidthPx && item.outputHeightPx) {
      summary += `   • Dimensions: ${item.outputWidthPx} × ${item.outputHeightPx} px\n`;
    }
    summary += `   • Source: ${item.sourceDocument.title} (${item.sourceDocument.originalFileName})\n`;
    summary += `   • Compliance: ${item.status.toUpperCase()}\n`;
    summary += `   • Transformations Applied:\n`;
    item.transformationsApplied.forEach((t) => {
      summary += `       - ${t}\n`;
    });
    if (item.warnings.length > 0) {
      summary += `   • Warnings / Notice:\n`;
      item.warnings.forEach((w) => {
        summary += `       ! ${w}\n`;
      });
    }
    if (item.errors.length > 0) {
      summary += `   • Errors:\n`;
      item.errors.forEach((e) => {
        summary += `       X ${e}\n`;
      });
    }
    summary += `\n`;
  });

  summary += `========================================================================\n`;
  summary += `NOTE: This application package was generated 100% locally on your device\n`;
  summary += `using FormVault offline privacy-first architecture.\n`;
  summary += `No documents or metadata were transmitted over the network.\n`;
  summary += `========================================================================\n`;

  return {
    profileId: profile.id,
    profileTitle: profile.title,
    targetOrganization: profile.targetOrganization,
    preparedItems,
    allValid,
    totalSizeBytes: totalBytes,
    summaryText: summary,
    generatedAt: Date.now(),
  };
}

// ==========================================
// 4. ZIP Package & Download
// ==========================================

export async function generateApplicationZip(
  profile: ApplicationProfile,
  preparedItems: PreparedDocumentItem[],
  summaryText: string
): Promise<{ blob: Blob; fileName: string }> {
  const zip = new JSZip();

  // Root folder named after profile
  const folderName = profile.title
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const folder = zip.folder(folderName) || zip;

  // Add all files
  for (const item of preparedItems) {
    if (!item.outputDataUrl) continue;
    // DataURL to base64 binary
    const base64Index = item.outputDataUrl.indexOf(';base64,');
    if (base64Index !== -1) {
      const base64Data = item.outputDataUrl.substring(base64Index + 8);
      folder.file(item.outputFileName, base64Data, { base64: true });
    }
  }

  // Add the official text audit checklist
  folder.file('Application_Checklist_Summary.txt', summaryText);

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const fileName = `${folderName}_Package.zip`;
  return { blob, fileName };
}
