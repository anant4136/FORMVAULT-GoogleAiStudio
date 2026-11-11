import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Check, Sparkles } from 'lucide-react';
import { DocumentCategory, CATEGORIES, VaultDocument } from '../types';
import { DocumentThumbnail } from './DocumentThumbnail';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDocument: (doc: Omit<VaultDocument, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'versions'>) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSaveDocument }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('ID_CARDS');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [mimeType, setMimeType] = useState('image/png');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);
    setFileSize(file.size);
    setMimeType(file.type || 'application/octet-stream');
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
    };
    reader.onerror = () => {
      setError('Could not read the selected file.');
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSample = (sampleType: 'passport' | 'degree' | 'signature') => {
    if (sampleType === 'passport') {
      setTitle('Passport Biometric Page');
      setCategory('ID_CARDS');
      setFileName('passport_scan.png');
      setFileSize(284000);
      setMimeType('image/png');
      setNotes('Official passport copy for exam and job portal submissions.');
      setTagsInput('passport, id, travel');
      setFileDataUrl(createSampleDataUrl('Passport Identity Card', '#1e40af'));
    } else if (sampleType === 'degree') {
      setTitle('University Degree Certificate');
      setCategory('ACADEMIC');
      setFileName('degree_certificate.png');
      setFileSize(512000);
      setMimeType('image/png');
      setNotes('Degree in Engineering with Magna Cum Laude honors.');
      setTagsInput('degree, education, bachelors');
      setFileDataUrl(createSampleDataUrl('Degree Certificate', '#059669'));
    } else {
      setTitle('Official Black Ink Signature');
      setCategory('SIGNATURES');
      setFileName('specimen_signature.png');
      setFileSize(142000);
      setMimeType('image/png');
      setNotes('Standard signature on plain white paper for portal upload.');
      setTagsInput('signature, portal, auth');
      setFileDataUrl(createSampleSignatureDataUrl());
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError('Please provide a document title.');
      return;
    }
    if (!fileDataUrl) {
      setError('Please choose a file to import or pick a sample.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSaveDocument({
      title: title.trim(),
      category,
      originalFileName: fileName || 'imported_document',
      mimeType,
      fileSizeBytes: fileSize || 102400,
      dataUrl: fileDataUrl,
      notes: notes.trim(),
      tags,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Import to Local Vault
              </h2>
              <p className="text-[11px] text-slate-500">Safely saved to private app storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* File Picker Zone */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf"
            className="hidden"
          />

          {fileDataUrl ? (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3 truncate">
                <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-600 flex-shrink-0">
                  <DocumentThumbnail
                    dataUrl={fileDataUrl}
                    mimeType={mimeType}
                    title={fileName || title || 'Document'}
                    className="w-full h-full object-contain"
                    iconClassName="w-5 h-5"
                  />
                </div>
                <div className="truncate">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{fileName}</p>
                  <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {Math.round(fileSize / 1024)} KB • {mimeType}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 ml-2"
              >
                Change
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition cursor-pointer"
            >
              <Upload className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Choose file from your device
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Supports Images (JPG, PNG, WebP) and PDFs
              </p>
            </div>
          )}

          {/* Quick Sample Selector */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Or use sample file:</span>
            </span>
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={() => handleLoadSample('passport')}
                className="px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-blue-50 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-600"
              >
                Passport
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('degree')}
                className="px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-blue-50 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-600"
              >
                Degree
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('signature')}
                className="px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-blue-50 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-600"
              >
                Signature
              </button>
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Passport Bio Page, SSC Marksheet"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1 ${
                    category === c.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {category === c.id && <Check className="w-3 h-3" />}
                  <span>{c.displayName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key numbers, roll numbers, or submission notes..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. upsc, exam, official, 2026"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition"
          >
            Save to Vault
          </button>
        </div>
      </div>
    </div>
  );
};

function createSampleDataUrl(title: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="#f8fafc" rx="12"/>
    <rect x="20" y="20" width="560" height="360" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="8"/>
    <rect x="20" y="20" width="560" height="60" fill="${color}" rx="8"/>
    <text x="40" y="58" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">${title.toUpperCase()}</text>
    <rect x="40" y="100" width="120" height="150" fill="#e2e8f0" rx="6"/>
    <circle cx="100" cy="150" r="30" fill="#cbd5e1"/>
    <path d="M 60 230 Q 100 190 140 230" fill="#94a3b8"/>
    <text x="180" y="130" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${title}</text>
    <text x="180" y="160" font-family="sans-serif" font-size="13" fill="#64748b">Verified Official Document</text>
    <text x="180" y="185" font-family="sans-serif" font-size="13" fill="#64748b">Document ID: FV-${Math.floor(100000 + Math.random() * 900000)}</text>
    <text x="180" y="210" font-family="sans-serif" font-size="13" fill="#64748b">Issued: Nov 2024 • FormVault Verified</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createSampleSignatureDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="200" viewBox="0 0 500 200">
    <rect width="500" height="200" fill="#ffffff"/>
    <path d="M 50 130 C 90 70, 110 40, 140 140 C 160 170, 180 60, 200 110 C 230 150, 250 90, 270 100 C 300 110, 330 70, 370 120 C 390 140, 430 70, 460 130 M 110 100 Q 250 90 450 110" 
          fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
