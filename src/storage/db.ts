import { VaultDocument, DocumentVersion, ApplicationProfile, DocumentCategory } from '../types';

const DB_NAME = 'FormVaultDB';
const DB_VERSION = 1;
const STORE_DOCUMENTS = 'documents';
const STORE_PROFILES = 'profiles';
const STORE_PREFS = 'preferences';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllDocuments(): Promise<VaultDocument[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const request = store.getAll();

    request.onsuccess = () => {
      const docs = (request.result as VaultDocument[]) || [];
      docs.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(docs);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getDocumentById(id: string): Promise<VaultDocument | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const request = store.get(id);

    request.onsuccess = () => resolve((request.result as VaultDocument) || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDocument(document: VaultDocument): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const request = store.put(document);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function recordAccess(id: string): Promise<void> {
  const doc = await getDocumentById(id);
  if (doc) {
    doc.lastAccessedAt = Date.now();
    await saveDocument(doc);
  }
}

export async function addDocumentVersion(documentId: string, version: DocumentVersion): Promise<void> {
  const doc = await getDocumentById(documentId);
  if (doc) {
    if (!doc.versions) doc.versions = [];
    doc.versions.unshift(version);
    doc.updatedAt = Date.now();
    await saveDocument(doc);
  }
}

export async function deleteDocumentVersion(documentId: string, versionId: string): Promise<void> {
  const doc = await getDocumentById(documentId);
  if (doc && doc.versions) {
    doc.versions = doc.versions.filter(v => v.id !== versionId);
    doc.updatedAt = Date.now();
    await saveDocument(doc);
  }
}

export async function getAllProfiles(): Promise<ApplicationProfile[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readonly');
    const store = tx.objectStore(STORE_PROFILES);
    const request = store.getAll();

    request.onsuccess = () => {
      const profiles = ((request.result as ApplicationProfile[]) || []).map((p) => ({
        ...p,
        requirements: p.requirements || [],
        documentIds: p.documentIds || [],
      }));
      resolve(profiles);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getProfileById(id: string): Promise<ApplicationProfile | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readonly');
    const store = tx.objectStore(STORE_PROFILES);
    const request = store.get(id);

    request.onsuccess = () => {
      const p = request.result as ApplicationProfile | undefined;
      if (!p) {
        resolve(null);
        return;
      }
      resolve({
        ...p,
        requirements: p.requirements || [],
        documentIds: p.documentIds || [],
      });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function duplicateProfile(id: string): Promise<ApplicationProfile | null> {
  const original = await getProfileById(id);
  if (!original) return null;

  const now = Date.now();
  const cloned: ApplicationProfile = {
    ...original,
    id: `profile-${now}-${Math.random().toString(36).substr(2, 6)}`,
    title: `${original.title} (Copy)`,
    createdAt: now,
    updatedAt: now,
    requirements: original.requirements.map((req) => ({
      ...req,
      id: `req-${now}-${Math.random().toString(36).substr(2, 5)}`,
    })),
  };

  await saveProfile(cloned);
  return cloned;
}

export async function saveProfile(profile: ApplicationProfile): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    const store = tx.objectStore(STORE_PROFILES);
    const request = store.put({
      ...profile,
      updatedAt: Date.now(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    const store = tx.objectStore(STORE_PROFILES);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getStorageUsageBytes(): Promise<{ totalBytes: number; count: number }> {
  const docs = await getAllDocuments();
  let totalBytes = 0;
  for (const doc of docs) {
    totalBytes += doc.fileSizeBytes || 0;
    if (doc.versions) {
      for (const ver of doc.versions) {
        totalBytes += ver.fileSizeBytes || 0;
      }
    }
  }
  return { totalBytes, count: docs.length };
}

export async function purgeCache(): Promise<void> {
  // Clear any temporary entries in localStorage/sessionStorage
  sessionStorage.clear();
}

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Creates realistic, valid base64 SVG data-URLs for sample documents.
 * 100% reliable across all browsers and image tag renderers.
 */
function createSampleSvgDataUrl(title: string, category: string, primaryColor: string, detailText: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="#f8fafc" rx="16"/>
    <rect x="24" y="24" width="752" height="552" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="12"/>
    <rect x="24" y="24" width="752" height="80" fill="${primaryColor}" rx="12"/>
    <text x="50" y="74" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#ffffff">${title.toUpperCase()}</text>
    <text x="750" y="72" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#e2e8f0" text-anchor="end">OFFICIAL DOCUMENT</text>
    
    <!-- Document details -->
    <rect x="60" y="140" width="160" height="200" fill="#e2e8f0" rx="8" stroke="#94a3b8" stroke-width="1"/>
    <circle cx="140" cy="210" r="40" fill="#cbd5e1"/>
    <path d="M 80 320 Q 140 260 200 320" fill="#94a3b8"/>
    <text x="140" y="325" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">OFFICIAL PHOTO</text>

    <text x="250" y="170" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#0f172a">${title}</text>
    <text x="250" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#64748b">Category: ${category}</text>
    <text x="250" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#64748b">ID / Reg No: FV-2026-984210</text>
    <text x="250" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#64748b">Issued: Nov 2024 • Status: Active &amp; Verified</text>
    <text x="250" y="290" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#64748b">${detailText}</text>

    <!-- Barcode / Seal -->
    <rect x="60" y="380" width="680" height="60" fill="#f1f5f9" rx="6"/>
    <text x="400" y="415" font-family="monospace" font-size="16" fill="#334155" text-anchor="middle">|||| | |||||| || | |||| |||||||| ||||| ||||| ||||</text>
    <text x="400" y="432" font-family="monospace" font-size="11" fill="#64748b" text-anchor="middle">*FV88492048590321*</text>

    <rect x="60" y="460" width="300" height="70" fill="#ffffff" stroke="#e2e8f0" rx="6"/>
    <text x="80" y="485" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">AUTHORIZED SIGNATURE</text>
    <path d="M 80 515 Q 120 480 160 510 T 240 500 T 300 520" fill="none" stroke="#1e40af" stroke-width="2.5" stroke-linecap="round"/>

    <circle cx="680" cy="500" r="45" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-dasharray="6,4"/>
    <text x="680" y="495" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="bold" fill="${primaryColor}" text-anchor="middle">VERIFIED</text>
    <text x="680" y="512" font-family="system-ui, -apple-system, sans-serif" font-size="9" fill="${primaryColor}" text-anchor="middle">SECURE VAULT</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function createSignatureSvgDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="250" viewBox="0 0 600 250">
    <rect width="600" height="250" fill="#fbfbfa"/>
    <line x1="40" y1="210" x2="560" y2="210" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="8,6"/>
    <text x="40" y="235" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#94a3b8">Specimen Signature</text>
    <path d="M 60 160 C 110 90, 130 50, 160 170 C 180 210, 200 80, 230 140 C 260 180, 280 120, 310 130 C 340 140, 380 90, 420 150 C 440 170, 490 80, 520 160 M 130 130 Q 300 120 540 140" 
          fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

async function createSamplePdfDataUrl(): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1
  const page1 = pdfDoc.addPage([595.28, 841.89]);
  page1.drawText('FORMVAULT ACADEMIC CREDENTIALS', { x: 50, y: 780, size: 18, font: boldFont, color: rgb(0.12, 0.31, 0.96) });
  page1.drawText('Official Offline Document Verification Record - Page 1', { x: 50, y: 755, size: 11, font, color: rgb(0.4, 0.45, 0.5) });
  page1.drawLine({ start: { x: 50, y: 740 }, end: { x: 545, y: 740 }, thickness: 1.5, color: rgb(0.85, 0.88, 0.92) });
  page1.drawText('Applicant: Alex Morgan', { x: 50, y: 700, size: 12, font: boldFont });
  page1.drawText('Registration ID: FV-2026-ENG-0941', { x: 50, y: 680, size: 11, font });
  page1.drawText('Degree: Bachelor of Science in Information Systems & Engineering', { x: 50, y: 660, size: 11, font });
  page1.drawText('Status: First Class with Distinction (Honors)', { x: 50, y: 640, size: 11, font });
  
  page1.drawRectangle({ x: 50, y: 520, width: 495, height: 90, color: rgb(0.96, 0.98, 1.0), borderColor: rgb(0.8, 0.88, 1.0), borderWidth: 1 });
  page1.drawText('Official Statement: All courses, laboratory certifications, and project evaluations', { x: 65, y: 575, size: 10, font });
  page1.drawText('have been successfully completed under offline encrypted verification protocols.', { x: 65, y: 555, size: 10, font });
  page1.drawText('Page 1 of 2 - FormVault Offline Document Vault', { x: 200, y: 50, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

  // Page 2
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  page2.drawText('SEMESTER GRADE TRANSCRIPT', { x: 50, y: 780, size: 18, font: boldFont, color: rgb(0.12, 0.31, 0.96) });
  page2.drawText('Academic Performance & Module Evaluations - Page 2', { x: 50, y: 755, size: 11, font, color: rgb(0.4, 0.45, 0.5) });
  page2.drawLine({ start: { x: 50, y: 740 }, end: { x: 545, y: 740 }, thickness: 1.5, color: rgb(0.85, 0.88, 0.92) });
  page2.drawText('Course Code        Course Description                            Credits    Grade', { x: 50, y: 700, size: 10, font: boldFont });
  page2.drawText('CS-401             Advanced Algorithms & Systems                 4.0        A+', { x: 50, y: 675, size: 10, font });
  page2.drawText('CS-405             Database Architecture & Security              4.0        A', { x: 50, y: 650, size: 10, font });
  page2.drawText('CS-412             Mobile Software Engineering (Android)         4.0        A+', { x: 50, y: 625, size: 10, font });
  page2.drawText('CS-499             Senior Engineering Capstone                   6.0        A+', { x: 50, y: 600, size: 10, font });
  page2.drawText('Cumulative GPA: 3.94 / 4.00 (Summa Cum Laude)', { x: 50, y: 550, size: 11, font: boldFont, color: rgb(0.05, 0.5, 0.2) });
  page2.drawText('Page 2 of 2 - FormVault Offline Document Vault', { x: 200, y: 50, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

  return await pdfDoc.saveAsBase64({ dataUri: true });
}

export async function seedInitialSamplesIfNeeded(): Promise<void> {
  const docs = await getAllDocuments();
  if (docs.length > 0) {
    const hasPdf = docs.some((d) => d.mimeType === 'application/pdf');
    if (!hasPdf) {
      const samplePdfDataUrl = await createSamplePdfDataUrl();
      const sample5: VaultDocument = {
        id: 'sample-doc-5',
        title: 'Academic Transcript & Degree (PDF)',
        category: 'ACADEMIC',
        originalFileName: 'official_academic_transcript_2026.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 104500,
        dataUrl: samplePdfDataUrl,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000,
        lastAccessedAt: Date.now() - 1800000,
        notes: 'Multi-page official verified transcript and convocation records in vector PDF format.',
        tags: ['pdf', 'transcript', 'academic', 'multi-page'],
        versions: [],
      };
      await saveDocument(sample5);
    }
    return;
  }

  const now = Date.now();

  const sample1: VaultDocument = {
    id: 'sample-doc-1',
    title: 'Passport Bio Page',
    category: 'ID_CARDS',
    originalFileName: 'passport_biopage_scan.png',
    mimeType: 'image/png',
    fileSizeBytes: 348160, // 340 KB
    dataUrl: createSampleSvgDataUrl('Passport Identity Page', 'ID & Identity', '#1e40af', 'Country of Issue: Global • Expiry: 2034'),
    createdAt: now - 86400000 * 3,
    updatedAt: now - 86400000 * 3,
    lastAccessedAt: now - 3600000,
    notes: 'Government issued passport primary photo and biographical data page.',
    tags: ['passport', 'identity', 'travel'],
    versions: [
      {
        id: 'ver-1-1',
        documentId: 'sample-doc-1',
        label: 'Passport Photo 35x45mm',
        mimeType: 'image/jpeg',
        fileSizeBytes: 42100, // 41 KB (<50KB spec)
        dataUrl: createSampleSvgDataUrl('Passport Photo 35x45mm', 'Photos & Portraits', '#0284c7', 'Spec: 35mm x 45mm • 300 DPI • Size: 41 KB'),
        widthPx: 413,
        heightPx: 531,
        targetSpec: '35x45mm (Target <50KB)',
        createdAt: now - 86400000 * 2
      }
    ]
  };

  const sample2: VaultDocument = {
    id: 'sample-doc-2',
    title: 'Bachelor Degree Certificate',
    category: 'ACADEMIC',
    originalFileName: 'degree_certificate_convocation.png',
    mimeType: 'image/png',
    fileSizeBytes: 614400, // 600 KB
    dataUrl: createSampleSvgDataUrl('Bachelor of Science Degree', 'Academic', '#059669', 'Major: Computer Science • Honors: Magna Cum Laude'),
    createdAt: now - 86400000 * 7,
    updatedAt: now - 86400000 * 5,
    lastAccessedAt: now - 7200000,
    notes: 'Official University Convocation Degree Certificate.',
    tags: ['degree', 'graduation', 'university', 'transcript'],
    versions: []
  };

  const sample3: VaultDocument = {
    id: 'sample-doc-3',
    title: 'Official Specimen Signature',
    category: 'SIGNATURES',
    originalFileName: 'handwritten_signature.png',
    mimeType: 'image/png',
    fileSizeBytes: 182400, // 178 KB
    dataUrl: createSignatureSvgDataUrl(),
    createdAt: now - 86400000 * 4,
    updatedAt: now - 86400000 * 4,
    lastAccessedAt: now - 1800000,
    notes: 'Standard black ink specimen signature for exam and job application forms.',
    tags: ['signature', 'ink', 'portal-upload'],
    versions: [
      {
        id: 'ver-3-1',
        documentId: 'sample-doc-3',
        label: 'Transparent PNG Signature',
        mimeType: 'image/png',
        fileSizeBytes: 19400, // 19 KB (<20KB portal limit)
        dataUrl: createSignatureSvgDataUrl(),
        widthPx: 600,
        heightPx: 250,
        targetSpec: 'Transparent PNG (<20KB)',
        createdAt: now - 86400000 * 1
      }
    ]
  };

  const sample4: VaultDocument = {
    id: 'sample-doc-4',
    title: 'National Identity Card (Aadhaar / SSN)',
    category: 'ID_CARDS',
    originalFileName: 'national_id_front.png',
    mimeType: 'image/png',
    fileSizeBytes: 420000,
    dataUrl: createSampleSvgDataUrl('National Identity Card', 'ID & Identity', '#4f46e5', 'ID Verified • Biometrics Registered'),
    createdAt: now - 86400000 * 10,
    updatedAt: now - 86400000 * 9,
    lastAccessedAt: now - 86400000,
    notes: 'Primary national photo ID card with resident number.',
    tags: ['id-card', 'national-id'],
    versions: []
  };

  const samplePdfDataUrl = await createSamplePdfDataUrl();
  const sample5: VaultDocument = {
    id: 'sample-doc-5',
    title: 'Academic Transcript & Degree (PDF)',
    category: 'ACADEMIC',
    originalFileName: 'official_academic_transcript_2026.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 104500, // ~102 KB
    dataUrl: samplePdfDataUrl,
    createdAt: now - 86400000 * 1,
    updatedAt: now - 86400000 * 1,
    lastAccessedAt: now - 1800000,
    notes: 'Multi-page official verified transcript and convocation records in vector PDF format.',
    tags: ['pdf', 'transcript', 'academic', 'multi-page'],
    versions: []
  };

  await saveDocument(sample1);
  await saveDocument(sample2);
  await saveDocument(sample3);
  await saveDocument(sample4);
  await saveDocument(sample5);

  // Seed sample Application Profiles with full editable requirements
  const profile1: ApplicationProfile = {
    id: 'profile-1',
    title: 'Civil Services / Govt Exam 2026',
    description: 'Required documents for online portal registration, photo upload (<50KB), and signature upload (<20KB).',
    targetOrganization: 'Public Service Commission',
    deadline: now + 86400000 * 25,
    documentIds: ['sample-doc-1', 'sample-doc-3', 'sample-doc-5', 'sample-doc-4'],
    requiredCategories: ['PHOTOS', 'SIGNATURES', 'ACADEMIC', 'ID_CARDS'],
    requirements: [
      {
        id: 'req-1-photo',
        name: 'Passport Photograph',
        category: 'PHOTOS',
        assignedDocumentId: 'sample-doc-1', // maps to passport doc
        allowedFormats: ['image/jpeg'],
        minSizeBytes: 20 * 1024,
        maxSizeBytes: 50 * 1024,
        requiredWidthPx: 413,
        requiredHeightPx: 531,
        notes: 'White background, exactly 35x45mm, JPEG between 20KB and 50KB.',
      },
      {
        id: 'req-1-sign',
        name: 'Candidate Signature',
        category: 'SIGNATURES',
        assignedDocumentId: 'sample-doc-3', // maps to signature doc
        allowedFormats: ['image/jpeg'],
        minSizeBytes: 10 * 1024,
        maxSizeBytes: 20 * 1024,
        requiredWidthPx: 600,
        requiredHeightPx: 250,
        notes: 'Black ink, clean white background, JPEG between 10KB and 20KB.',
      },
      {
        id: 'req-1-acad',
        name: 'Degree Transcript / Marksheet',
        category: 'ACADEMIC',
        assignedDocumentId: 'sample-doc-5', // maps to multi-page PDF
        allowedFormats: ['application/pdf'],
        maxSizeBytes: 300 * 1024,
        notes: 'Consolidated graduation transcript in PDF format under 300 KB.',
      },
      {
        id: 'req-1-id',
        name: 'National Photo ID Proof',
        category: 'ID_CARDS',
        assignedDocumentId: 'sample-doc-4', // maps to national ID
        allowedFormats: ['application/pdf', 'image/jpeg'],
        maxSizeBytes: 300 * 1024,
        notes: 'Aadhaar / National ID / Passport scan with clear birth date.',
      },
    ],
    createdAt: now - 86400000 * 5,
    updatedAt: now - 86400000 * 5,
  };

  const profile2: ApplicationProfile = {
    id: 'profile-2',
    title: 'University Graduate Admission',
    description: 'Degree credentials, identity verification, and specimen signatures for university admissions.',
    targetOrganization: 'Global Graduate Admissions',
    deadline: now + 86400000 * 45,
    documentIds: ['sample-doc-1', 'sample-doc-5'],
    requiredCategories: ['PHOTOS', 'ACADEMIC', 'ID_CARDS'],
    requirements: [
      {
        id: 'req-2-photo',
        name: 'Applicant Photograph',
        category: 'PHOTOS',
        assignedDocumentId: 'sample-doc-1',
        allowedFormats: ['image/jpeg', 'image/png'],
        maxSizeBytes: 100 * 1024,
        requiredWidthPx: 413,
        requiredHeightPx: 531,
        notes: 'Recent passport photo on neutral background.',
      },
      {
        id: 'req-2-transcript',
        name: 'Official Degree Transcript',
        category: 'ACADEMIC',
        assignedDocumentId: 'sample-doc-5',
        allowedFormats: ['application/pdf'],
        maxSizeBytes: 500 * 1024,
        notes: 'Consolidated semester transcript with grades.',
      },
    ],
    createdAt: now - 86400000 * 2,
    updatedAt: now - 86400000 * 2,
  };

  await saveProfile(profile1);
  await saveProfile(profile2);
}
