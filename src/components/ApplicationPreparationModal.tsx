import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  FolderArchive,
  Download,
  Save,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  ChevronRight,
  Eye,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ApplicationProfile,
  ProfileRequirement,
  VaultDocument,
  PreparedDocumentItem,
  PreparationPackageResult,
  DocumentVersion,
} from '../types';
import {
  checkRequirementDiagnostic,
  prepareApplicationProfile,
  generateApplicationZip,
} from '../processing/preparationEngine';
import { DocumentThumbnail } from './DocumentThumbnail';

interface ApplicationPreparationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ApplicationProfile;
  documents: VaultDocument[];
  onUpdateProfile: (updated: ApplicationProfile) => void;
  onSaveVersion: (docId: string, version: DocumentVersion) => void;
}

type Step = 'mapping' | 'processing' | 'results';

export const ApplicationPreparationModal: React.FC<ApplicationPreparationModalProps> = ({
  isOpen,
  onClose,
  profile,
  documents,
  onUpdateProfile,
  onSaveVersion,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('mapping');
  const [editableReqs, setEditableReqs] = useState<ProfileRequirement[]>(profile.requirements || []);

  // Processing state
  const [progressMsg, setProgressMsg] = useState('Initializing pipeline...');
  const [progressPercent, setProgressPercent] = useState(0);

  // Result state
  const [result, setResult] = useState<PreparationPackageResult | null>(null);
  const [previewItem, setPreviewItem] = useState<PreparedDocumentItem | null>(null);
  const [isSavingVersions, setIsSavingVersions] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState('');
  const [isZipping, setIsZipping] = useState(false);

  useEffect(() => {
    setEditableReqs(profile.requirements || []);
    setCurrentStep('mapping');
    setResult(null);
    setSavedSuccessMsg('');
  }, [profile]);

  if (!isOpen) return null;

  const handleDocumentChange = (reqId: string, docId: string) => {
    const updated = editableReqs.map((r) =>
      r.id === reqId ? { ...r, assignedDocumentId: docId || undefined } : r
    );
    setEditableReqs(updated);

    // Sync back to profile
    const updatedProfile: ApplicationProfile = {
      ...profile,
      requirements: updated,
      documentIds: Array.from(
        new Set(
          updated
            .map((r) => r.assignedDocumentId)
            .filter((id): id is string => Boolean(id))
        )
      ),
      updatedAt: Date.now(),
    };
    onUpdateProfile(updatedProfile);
  };

  const mappedCount = editableReqs.filter((r) => Boolean(r.assignedDocumentId)).length;
  const totalCount = editableReqs.length;

  const handleStartPreparation = async () => {
    if (mappedCount === 0) {
      alert('Please map at least one document from your vault to prepare.');
      return;
    }

    setCurrentStep('processing');
    setProgressPercent(10);
    setProgressMsg('Scanning profile requirements and source documents...');

    try {
      const activeProfile: ApplicationProfile = {
        ...profile,
        requirements: editableReqs,
      };

      const prepResult = await prepareApplicationProfile(
        activeProfile,
        documents,
        (idx, total, msg) => {
          setProgressPercent(Math.round(((idx + 0.5) / Math.max(1, total)) * 100));
          setProgressMsg(msg);
        }
      );

      setProgressPercent(100);
      setProgressMsg('Validation and audit checklist complete.');
      setTimeout(() => {
        setResult(prepResult);
        setCurrentStep('results');
      }, 400);
    } catch (err: any) {
      alert(`Preparation encountered an error: ${err?.message || err}`);
      setCurrentStep('mapping');
    }
  };

  const handleDownloadZip = async () => {
    if (!result) return;
    setIsZipping(true);
    try {
      const { blob, fileName } = await generateApplicationZip(
        profile,
        result.preparedItems,
        result.summaryText
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err: any) {
      alert(`Failed to package zip: ${err?.message || err}`);
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadAuditReport = () => {
    if (!result) return;
    const blob = new Blob([result.summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.title.replace(/\s+/g, '_')}_Audit_Report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleSaveVersionsToVault = async () => {
    if (!result) return;
    setIsSavingVersions(true);
    try {
      const now = Date.now();
      for (const item of result.preparedItems) {
        if (!item.outputDataUrl || !item.sourceDocument) continue;

        const version: DocumentVersion = {
          id: `prep-ver-${now}-${Math.random().toString(36).substr(2, 5)}`,
          documentId: item.sourceDocument.id,
          label: `Prepared: ${item.requirementName}`,
          mimeType: item.outputMimeType,
          fileSizeBytes: item.outputSizeBytes,
          dataUrl: item.outputDataUrl,
          widthPx: item.outputWidthPx,
          heightPx: item.outputHeightPx,
          targetSpec: `${item.outputMimeType.split('/')[1].toUpperCase()} • ${Math.round(
            item.outputSizeBytes / 1024
          )} KB (${item.status})`,
          createdAt: now,
        };

        await onSaveVersion(item.sourceDocument.id, version);
      }
      setSavedSuccessMsg(
        `Successfully saved ${result.preparedItems.length} prepared versions directly into your vault documents!`
      );
    } catch (err: any) {
      alert(`Failed to save versions: ${err?.message || err}`);
    } finally {
      setIsSavingVersions(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                {profile.title}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
                Automatic Preparation
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              Target: {profile.targetOrganization} • 100% On-Device Engine
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workflow Breadcrumb Indicator */}
        <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-center bg-white dark:bg-slate-900">
          <div
            className={`py-2 px-1 border-b-2 transition ${
              currentStep === 'mapping'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400'
            }`}
          >
            1. Document Mapping
          </div>
          <div
            className={`py-2 px-1 border-b-2 transition ${
              currentStep === 'processing'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400'
            }`}
          >
            2. Offline Pipeline
          </div>
          <div
            className={`py-2 px-1 border-b-2 transition ${
              currentStep === 'results'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400'
            }`}
          >
            3. Validation &amp; Export
          </div>
        </div>

        {/* Step 1: Mapping & Diagnostic Checklist */}
        {currentStep === 'mapping' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Requirement Mapping Checklist
                </h4>
                <p className="text-[11px] text-slate-500">
                  Assign source documents from your vault. FormVault will transform each to match
                  official specifications.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {mappedCount} of {totalCount} Mapped
              </span>
            </div>

            {/* Checklist items */}
            <div className="space-y-3">
              {editableReqs.map((req, idx) => {
                const assignedDoc = documents.find((d) => d.id === req.assignedDocumentId);
                const diagnostic = checkRequirementDiagnostic(req, assignedDoc);

                return (
                  <div
                    key={req.id || idx}
                    className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {idx + 1}. {req.name}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${diagnostic.badgeColor}`}
                          >
                            {diagnostic.badgeLabel}
                          </span>
                        </div>
                        {req.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Guidelines: {req.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-right text-[10px] text-slate-400 font-mono">
                        {req.allowedFormats?.map((f) => f.split('/')[1].toUpperCase()).join('/') ||
                          'ANY'}{' '}
                        {req.maxSizeBytes && `• <${Math.round(req.maxSizeBytes / 1024)}KB`}
                        {req.requiredWidthPx && ` • ${req.requiredWidthPx}x${req.requiredHeightPx}`}
                      </div>
                    </div>

                    {/* Mapped Document Selector & Thumbnail */}
                    <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {assignedDoc ? (
                          <DocumentThumbnail
                            dataUrl={assignedDoc.dataUrl}
                            mimeType={assignedDoc.mimeType}
                            title={assignedDoc.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-slate-300 font-bold text-xs">?</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          Assigned Vault Document:
                        </label>
                        <select
                          value={req.assignedDocumentId || ''}
                          onChange={(e) => handleDocumentChange(req.id, e.target.value)}
                          className="w-full text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer truncate"
                        >
                          <option value="">-- Choose document from My Vault --</option>
                          {documents.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.title} ({d.mimeType.split('/')[1].toUpperCase()} •{' '}
                              {Math.round(d.fileSizeBytes / 1024)} KB)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Diagnostic Actions Preview */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-1.5 rounded-xl flex items-center justify-between">
                      <span className="font-medium truncate">
                        {diagnostic.actionsNeeded.length > 0 ? (
                          <>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              Transformations:{' '}
                            </span>
                            {diagnostic.actionsNeeded.join(' • ')}
                          </>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✓ Ready for packaging without alteration
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Live Offline Processing Pipeline */}
        {currentStep === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 dark:border-blue-950/60 border-t-blue-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="space-y-2 max-w-sm">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                Executing Preparation Engine
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Processing, compressing, and validating documents 100% locally on your device.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-sm space-y-1.5">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400">
                {progressMsg}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Validation & Output Audit Results */}
        {currentStep === 'results' && result && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Status Card */}
            <div
              className={`rounded-2xl p-4 border flex items-center justify-between ${
                result.allValid
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    result.allValid
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {result.allValid ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4
                    className={`font-extrabold text-xs ${
                      result.allValid
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : 'text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    {result.allValid
                      ? 'All Application Requirements Satisfied!'
                      : 'Package Prepared with Validation Notices'}
                  </h4>
                  <p
                    className={`text-[11px] ${
                      result.allValid
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {result.preparedItems.length} files ready •{' '}
                    {(result.totalSizeBytes / 1024).toFixed(1)} KB package size
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified</span>
              </div>
            </div>

            {savedSuccessMsg && (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 p-3 rounded-2xl text-[11px] font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{savedSuccessMsg}</span>
              </div>
            )}

            {/* Prepared Items List */}
            <div className="space-y-3">
              <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Prepared Document Audit ({result.preparedItems.length})
              </h5>

              {result.preparedItems.map((item, idx) => (
                <div
                  key={item.requirementId || idx}
                  className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 border border-slate-300 dark:border-slate-600">
                        {item.outputMimeType.startsWith('image/') ? (
                          <img
                            src={item.outputDataUrl}
                            alt={item.requirementName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50 text-rose-600 font-bold text-[10px]">
                            <FileText className="w-5 h-5 mb-0.5" />
                            <span>PDF</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h6 className="font-bold text-slate-900 dark:text-white">
                            {item.outputFileName}
                          </h6>
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                              item.status === 'ready'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {item.status === 'ready' ? 'PASS' : 'WARNING'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          For: {item.requirementName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">
                        {Math.round(item.outputSizeBytes / 1024)} KB
                      </span>
                      {item.outputWidthPx && item.outputHeightPx && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {item.outputWidthPx} × {item.outputHeightPx} px
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Applied transformations */}
                  <div className="space-y-1 bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700 text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Pipeline Transformations Applied:
                    </span>
                    {item.transformationsApplied.map((t, tIdx) => (
                      <div
                        key={tIdx}
                        className="text-slate-600 dark:text-slate-400 flex items-center space-x-1.5"
                      >
                        <span className="text-emerald-500">✓</span>
                        <span>{t}</span>
                      </div>
                    ))}
                    {item.warnings.map((w, wIdx) => (
                      <div
                        key={wIdx}
                        className="text-amber-600 dark:text-amber-400 flex items-center space-x-1.5 font-medium"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions per item */}
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 font-bold text-slate-700 dark:text-slate-200 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview File</span>
                    </button>
                    <a
                      href={item.outputDataUrl}
                      download={item.outputFileName}
                      className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          {currentStep === 'mapping' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mappedCount === 0}
                onClick={handleStartPreparation}
                className="px-5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-xs transition active:scale-95 flex items-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run Automatic Preparation ({mappedCount})</span>
              </button>
            </>
          )}

          {currentStep === 'results' && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep('mapping')}
                className="flex items-center space-x-1 px-3 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Adjust Mappings</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSaveVersionsToVault}
                  disabled={isSavingVersions}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingVersions ? 'Saving...' : 'Save to Vault'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAuditReport}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Download Checklist Audit"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Audit Report</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-95"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>{isZipping ? 'Packaging...' : 'Download ZIP Package'}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Full Preview Modal for single prepared item */}
        {previewItem && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                    {previewItem.outputFileName}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    {Math.round(previewItem.outputSizeBytes / 1024)} KB •{' '}
                    {previewItem.outputMimeType}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950 rounded-2xl p-4 min-h-[250px]">
                {previewItem.outputMimeType.startsWith('image/') ? (
                  <img
                    src={previewItem.outputDataUrl}
                    alt={previewItem.outputFileName}
                    className="max-h-[50vh] max-w-full object-contain rounded shadow"
                  />
                ) : (
                  <iframe
                    src={previewItem.outputDataUrl}
                    title={previewItem.outputFileName}
                    className="w-full h-80 rounded border-0"
                  />
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-xl font-bold text-xs"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
