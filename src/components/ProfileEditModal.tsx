import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  Sparkles,
  Info,
  ChevronDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ApplicationProfile,
  ProfileRequirement,
  VaultDocument,
  DocumentCategory,
  CATEGORIES,
  AllowedFileFormat,
} from '../types';
import { PROFILE_PRESETS } from '../processing/preparationEngine';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: ApplicationProfile | null;
  documents: VaultDocument[];
  onSave: (profile: ApplicationProfile) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  documents,
  onSave,
}) => {
  const isEditing = Boolean(profile);

  const [title, setTitle] = useState(profile?.title || '');
  const [targetOrg, setTargetOrg] = useState(profile?.targetOrganization || '');
  const [description, setDescription] = useState(profile?.description || '');
  const [deadlineStr, setDeadlineStr] = useState(
    profile?.deadline
      ? new Date(profile.deadline).toISOString().split('T')[0]
      : new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]
  );

  const [requirements, setRequirements] = useState<ProfileRequirement[]>(
    profile?.requirements && profile.requirements.length > 0
      ? profile.requirements
      : [
          {
            id: `req-${Date.now()}-1`,
            name: 'Passport Photograph',
            category: 'PHOTOS',
            allowedFormats: ['image/jpeg'],
            maxSizeBytes: 50 * 1024,
            requiredWidthPx: 413,
            requiredHeightPx: 531,
            notes: 'White background, 35x45mm',
          },
          {
            id: `req-${Date.now()}-2`,
            name: 'Candidate Signature',
            category: 'SIGNATURES',
            allowedFormats: ['image/jpeg', 'image/png'],
            maxSizeBytes: 20 * 1024,
            requiredWidthPx: 600,
            requiredHeightPx: 250,
            notes: 'Black ink on white background',
          },
          {
            id: `req-${Date.now()}-3`,
            name: 'Academic Certificate / Marksheet',
            category: 'ACADEMIC',
            allowedFormats: ['application/pdf'],
            maxSizeBytes: 500 * 1024,
            notes: 'PDF format marksheet',
          },
        ]
  );

  const [activeReqIndex, setActiveReqIndex] = useState<number>(0);
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(!isEditing);

  if (!isOpen) return null;

  const handleApplyPreset = (presetId: string) => {
    const preset = PROFILE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setTitle(preset.title);
    setTargetOrg(preset.targetOrganization);
    setDescription(preset.description);

    const now = Date.now();
    const newReqs: ProfileRequirement[] = preset.requirements.map((r, i) => ({
      ...r,
      id: `req-${now}-${i}`,
      // Auto-assign matching document by category if possible
      assignedDocumentId: documents.find((d) => d.category === r.category)?.id,
    }));

    setRequirements(newReqs);
    setActiveReqIndex(0);
    setShowPresetsDropdown(false);
  };

  const handleAddRequirement = () => {
    const now = Date.now();
    const newReq: ProfileRequirement = {
      id: `req-${now}-${Math.random().toString(36).substr(2, 4)}`,
      name: 'New Document Requirement',
      category: 'ID_CARDS',
      allowedFormats: ['application/pdf', 'image/jpeg'],
      maxSizeBytes: 300 * 1024,
      notes: '',
    };
    setRequirements([...requirements, newReq]);
    setActiveReqIndex(requirements.length);
  };

  const handleRemoveRequirement = (index: number) => {
    if (requirements.length <= 1) {
      alert('A profile must have at least one requirement.');
      return;
    }
    const updated = requirements.filter((_, i) => i !== index);
    setRequirements(updated);
    if (activeReqIndex >= updated.length) {
      setActiveReqIndex(Math.max(0, updated.length - 1));
    }
  };

  const updateActiveReq = (partial: Partial<ProfileRequirement>) => {
    const updated = [...requirements];
    updated[activeReqIndex] = {
      ...updated[activeReqIndex],
      ...partial,
    };
    setRequirements(updated);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a profile title.');
      return;
    }

    const now = Date.now();
    const deadlineTimestamp = deadlineStr ? new Date(deadlineStr).getTime() : now + 86400000 * 30;

    // Extract mapped document IDs
    const docIds = requirements
      .map((r) => r.assignedDocumentId)
      .filter((id): id is string => Boolean(id));

    const finalProfile: ApplicationProfile = {
      id: profile?.id || `profile-${now}-${Math.random().toString(36).substr(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      targetOrganization: targetOrg.trim() || 'General Application',
      deadline: deadlineTimestamp,
      documentIds: Array.from(new Set(docIds)),
      requiredCategories: Array.from(new Set(requirements.map((r) => r.category))),
      requirements,
      createdAt: profile?.createdAt || now,
      updatedAt: now,
    };

    onSave(finalProfile);
    onClose();
  };

  const activeReq = requirements[activeReqIndex] || requirements[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>{isEditing ? 'Edit Application Profile' : 'New Application Profile'}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Configure target guidelines, document specifications, and mapped files
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Preset Selector Banner */}
          <div className="bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl p-3 border border-blue-200/80 dark:border-blue-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-blue-900 dark:text-blue-300">
                  Load Official Preset Template
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
              >
                <span>{showPresetsDropdown ? 'Hide Presets' : 'Choose Preset'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showPresetsDropdown ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {showPresetsDropdown && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/60">
                {PROFILE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-left hover:border-blue-500 dark:hover:border-blue-500 transition shadow-2xs group"
                  >
                    <span className="block font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600">
                      {preset.title}
                    </span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {preset.requirements.length} requirements
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Profile Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. UPSC Prelims 2026, MIT Graduate Admissions"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Organization / Portal
              </label>
              <input
                type="text"
                value={targetOrg}
                onChange={(e) => setTargetOrg(e.target.value)}
                placeholder="e.g. Union Public Service Commission, Harvard University"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Submission Deadline
              </label>
              <input
                type="date"
                value={deadlineStr}
                onChange={(e) => setDeadlineStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Purpose
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief notes regarding eligibility or portal link"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Requirements Section */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Checklist &amp; Document Requirements ({requirements.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Define exact format, KB, and dimension constraints for each document
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRequirement}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Requirement</span>
              </button>
            </div>

            {/* Requirement Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
              {requirements.map((req, idx) => {
                const isActive = idx === activeReqIndex;
                const isMapped = Boolean(req.assignedDocumentId);
                return (
                  <button
                    key={req.id || idx}
                    type="button"
                    onClick={() => setActiveReqIndex(idx)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isMapped
                          ? isActive
                            ? 'bg-emerald-300'
                            : 'bg-emerald-500'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span className="truncate max-w-[130px]">{req.name || `Req ${idx + 1}`}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Requirement Card */}
            {activeReq && (
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>Configuring Requirement #{activeReqIndex + 1}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRequirement(activeReqIndex)}
                    className="flex items-center space-x-1 text-[11px] text-rose-600 hover:text-rose-700 font-bold px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Requirement</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Requirement Label *
                    </label>
                    <input
                      type="text"
                      value={activeReq.name}
                      onChange={(e) => updateActiveReq({ name: e.target.value })}
                      placeholder="e.g. Passport Photograph, Marksheet"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Document Category
                    </label>
                    <select
                      value={activeReq.category}
                      onChange={(e) =>
                        updateActiveReq({ category: e.target.value as DocumentCategory })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    >
                      {CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assigned Vault Document */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Mapped Source Document from Vault:</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Will be transformed to match guidelines
                    </span>
                  </label>
                  <select
                    value={activeReq.assignedDocumentId || ''}
                    onChange={(e) =>
                      updateActiveReq({ assignedDocumentId: e.target.value || undefined })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none font-medium"
                  >
                    <option value="">-- No Document Assigned (Unmapped) --</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title} ({doc.mimeType.split('/')[1].toUpperCase()} •{' '}
                        {Math.round(doc.fileSizeBytes / 1024)} KB)
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Size Constraints */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Min File Size (KB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 20 (Optional)"
                      value={
                        activeReq.minSizeBytes
                          ? Math.round(activeReq.minSizeBytes / 1024)
                          : ''
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateActiveReq({
                          minSizeBytes: isNaN(val) || val <= 0 ? undefined : val * 1024,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Max File Size (KB)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 50 (Target <50KB)"
                      value={
                        activeReq.maxSizeBytes
                          ? Math.round(activeReq.maxSizeBytes / 1024)
                          : ''
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateActiveReq({
                          maxSizeBytes: isNaN(val) || val <= 0 ? undefined : val * 1024,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Allowed Formats */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Allowed File Formats:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'image/jpeg', label: 'JPEG / JPG' },
                        { id: 'image/png', label: 'PNG' },
                        { id: 'image/webp', label: 'WebP' },
                        { id: 'application/pdf', label: 'PDF Document' },
                      ] as { id: AllowedFileFormat; label: string }[]
                    ).map((fmt) => {
                      const allowed = activeReq.allowedFormats || [];
                      const isChecked = allowed.includes(fmt.id);
                      return (
                        <label
                          key={fmt.id}
                          className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl border cursor-pointer select-none font-semibold transition ${
                            isChecked
                              ? 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/60 dark:border-blue-600 dark:text-blue-300'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const curr = activeReq.allowedFormats || [];
                              if (e.target.checked) {
                                updateActiveReq({ allowedFormats: [...curr, fmt.id] });
                              } else {
                                if (curr.length <= 1) return; // preserve at least 1
                                updateActiveReq({
                                  allowedFormats: curr.filter((f) => f !== fmt.id),
                                });
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span>{fmt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Dimensions (Optional) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Required Width (px)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 413 (Optional)"
                      value={activeReq.requiredWidthPx || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateActiveReq({
                          requiredWidthPx: isNaN(val) || val <= 0 ? undefined : val,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Required Height (px)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 531 (Optional)"
                      value={activeReq.requiredHeightPx || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateActiveReq({
                          requiredHeightPx: isNaN(val) || val <= 0 ? undefined : val,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Specific Notes */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Special Portal Guidelines / Notes
                  </label>
                  <input
                    type="text"
                    value={activeReq.notes || ''}
                    onChange={(e) => updateActiveReq({ notes: e.target.value })}
                    placeholder="e.g. White background, ears visible, no sunglasses"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-95 flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isEditing ? 'Save Changes' : 'Create Profile'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
