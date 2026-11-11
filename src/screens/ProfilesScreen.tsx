import React, { useState } from 'react';
import {
  Layers,
  Plus,
  CheckCircle2,
  AlertCircle,
  Building2,
  Trash2,
  Copy,
  Edit3,
  Sparkles,
  Calendar,
  FileCheck,
  ChevronRight,
  FolderArchive,
  ArrowRight,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { ApplicationProfile, VaultDocument, DocumentVersion } from '../types';
import { ProfileEditModal } from '../components/ProfileEditModal';
import { ApplicationPreparationModal } from '../components/ApplicationPreparationModal';
import { checkRequirementDiagnostic } from '../processing/preparationEngine';

interface ProfilesScreenProps {
  profiles: ApplicationProfile[];
  documents: VaultDocument[];
  onSaveProfile: (profile: ApplicationProfile) => void;
  onDeleteProfile: (id: string) => void;
  onDuplicateProfile?: (id: string) => void;
  onSelectDocument: (doc: VaultDocument) => void;
  onSaveVersion: (docId: string, version: DocumentVersion) => void;
}

export const ProfilesScreen: React.FC<ProfilesScreenProps> = ({
  profiles,
  documents,
  onSaveProfile,
  onDeleteProfile,
  onDuplicateProfile,
  onSelectDocument,
  onSaveVersion,
}) => {
  // Modal states
  const [editingProfile, setEditingProfile] = useState<ApplicationProfile | null | undefined>(
    undefined
  ); // undefined = closed, null = new profile, object = editing
  const [preparingProfile, setPreparingProfile] = useState<ApplicationProfile | null>(null);

  const handleDuplicate = (profile: ApplicationProfile) => {
    if (onDuplicateProfile) {
      onDuplicateProfile(profile.id);
      return;
    }

    const now = Date.now();
    const cloned: ApplicationProfile = {
      ...profile,
      id: `profile-${now}-${Math.random().toString(36).substr(2, 6)}`,
      title: `${profile.title} (Copy)`,
      createdAt: now,
      updatedAt: now,
      requirements: (profile.requirements || []).map((req) => ({
        ...req,
        id: `req-${now}-${Math.random().toString(36).substr(2, 5)}`,
      })),
    };
    onSaveProfile(cloned);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Top Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Application Profiles</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              {profiles.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Automate dimension resizing, compression, and format compliance for portals
          </p>
        </div>
        <button
          onClick={() => setEditingProfile(null)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Profile</span>
        </button>
      </div>

      {/* Profile Cards */}
      <div className="space-y-4">
        {profiles.map((profile) => {
          const reqs = profile.requirements || [];
          const mappedCount = reqs.filter((r) => Boolean(r.assignedDocumentId)).length;
          const isFullyMapped = reqs.length > 0 && mappedCount === reqs.length;

          // Diagnostics tally
          let readyCount = 0;
          let needsPrepCount = 0;
          reqs.forEach((r) => {
            const doc = documents.find((d) => d.id === r.assignedDocumentId);
            const diag = checkRequirementDiagnostic(r, doc);
            if (diag.status === 'ready') readyCount++;
            else if (diag.status === 'needs_processing') needsPrepCount++;
          });

          const deadlineFormatted = profile.deadline
            ? new Date(profile.deadline).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : null;

          return (
            <div
              key={profile.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-3.5 transition hover:border-slate-300 dark:hover:border-slate-600"
            >
              {/* Profile Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {profile.title}
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        isFullyMapped
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {mappedCount}/{reqs.length} Documents Mapped
                    </span>
                  </div>

                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{profile.targetOrganization}</span>
                    {deadlineFormatted && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-slate-500 font-normal flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Deadline: {deadlineFormatted}</span>
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* Profile Action Icons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDuplicate(profile)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    title="Duplicate Profile"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingProfile(profile)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    title="Edit Requirements"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete application profile "${profile.title}"?`)) {
                        onDeleteProfile(profile.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Delete Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {profile.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {profile.description}
                </p>
              )}

              {/* Requirement Checklist List */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Document Specifications &amp; Mappings:</span>
                  <span>
                    {readyCount > 0 && `${readyCount} compliant `}
                    {needsPrepCount > 0 && `• ${needsPrepCount} auto-prepared`}
                  </span>
                </div>

                {reqs.map((req, rIdx) => {
                  const assignedDoc = documents.find((d) => d.id === req.assignedDocumentId);
                  const diag = checkRequirementDiagnostic(req, assignedDoc);

                  return (
                    <div
                      key={req.id || rIdx}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            diag.status === 'ready'
                              ? 'bg-emerald-500'
                              : diag.status === 'needs_processing'
                              ? 'bg-blue-500'
                              : 'bg-amber-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {req.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {assignedDoc ? (
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                Source: {assignedDoc.title} (
                                {Math.round(assignedDoc.fileSizeBytes / 1024)} KB)
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                Unmapped — Click Prepare to assign
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-right flex-shrink-0">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${diag.badgeColor}`}
                        >
                          {diag.badgeLabel}
                        </span>
                        {assignedDoc && (
                          <button
                            onClick={() => onSelectDocument(assignedDoc)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="View source document"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setEditingProfile(profile)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center space-x-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Configure Rules</span>
                </button>

                <button
                  onClick={() => setPreparingProfile(profile)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Prepare &amp; Export Package</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {profiles.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-700 space-y-3">
          <Layers className="w-12 h-12 text-blue-500 mx-auto" />
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            No Application Profiles Created Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create profiles with portal requirements (e.g. UPSC, University Admission, Job Application).
            FormVault will automatically convert, crop, compress, and package your documents into a
            ready-to-upload ZIP.
          </p>
          <button
            onClick={() => setEditingProfile(null)}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
          >
            Create First Profile from Template
          </button>
        </div>
      )}

      {/* Profile Create / Edit Modal */}
      {editingProfile !== undefined && (
        <ProfileEditModal
          isOpen={true}
          onClose={() => setEditingProfile(undefined)}
          profile={editingProfile}
          documents={documents}
          onSave={onSaveProfile}
        />
      )}

      {/* Automatic Preparation Pipeline Modal */}
      {preparingProfile && (
        <ApplicationPreparationModal
          isOpen={true}
          onClose={() => setPreparingProfile(null)}
          profile={preparingProfile}
          documents={documents}
          onUpdateProfile={onSaveProfile}
          onSaveVersion={onSaveVersion}
        />
      )}
    </div>
  );
};
