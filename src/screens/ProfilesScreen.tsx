import React, { useState } from 'react';
import {
  Users,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Building2,
  Trash2,
  X,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { ApplicationProfile, VaultDocument, DocumentCategory, CATEGORIES } from '../types';

interface ProfilesScreenProps {
  profiles: ApplicationProfile[];
  documents: VaultDocument[];
  onSaveProfile: (profile: ApplicationProfile) => void;
  onDeleteProfile: (id: string) => void;
  onSelectDocument: (doc: VaultDocument) => void;
}

export const ProfilesScreen: React.FC<ProfilesScreenProps> = ({
  profiles,
  documents,
  onSaveProfile,
  onDeleteProfile,
  onSelectDocument,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetOrg, setTargetOrg] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const handleCreate = () => {
    if (!title.trim()) return;

    const newProfile: ApplicationProfile = {
      id: `profile-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      targetOrganization: targetOrg.trim() || 'General Application',
      deadline: Date.now() + 86400000 * 30,
      documentIds: selectedDocIds,
      requiredCategories: ['ID_CARDS', 'ACADEMIC', 'SIGNATURES', 'PHOTOS'],
      createdAt: Date.now(),
    };

    onSaveProfile(newProfile);
    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setTargetOrg('');
    setSelectedDocIds([]);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Application Bundles</h2>
          <p className="text-xs text-slate-500">
            Group your documents and checklist requirements for specific targets
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Profile</span>
        </button>
      </div>

      {/* Profiles list */}
      <div className="space-y-4">
        {profiles.map((profile) => {
          const attachedDocs = documents.filter((d) => profile.documentIds.includes(d.id));
          const totalDocsCount = profile.documentIds.length;

          return (
            <div
              key={profile.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {profile.title}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      {attachedDocs.length} files attached
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center space-x-1 mt-0.5">
                    <Building2 className="w-3 h-3" />
                    <span>{profile.targetOrganization}</span>
                  </p>
                </div>
                <button
                  onClick={() => onDeleteProfile(profile.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition"
                  title="Delete Profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {profile.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {profile.description}
                </p>
              )}

              {/* Attached documents list */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Checklist &amp; Attached Files:
                </p>
                {attachedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDocument(doc)}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50/50 dark:hover:bg-slate-700 transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {doc.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {Math.round(doc.fileSizeBytes / 1024)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Profile Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Create Application Profile
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Profile Title *
              </label>
              <input
                type="text"
                placeholder="e.g. UPSC Prelims 2026, Google Interview"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Organization
              </label>
              <input
                type="text"
                placeholder="e.g. Union Public Service Commission, Harvard"
                value={targetOrg}
                onChange={(e) => setTargetOrg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Attach Existing Vault Documents:
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-700 p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                {documents.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.id);
                  return (
                    <label
                      key={doc.id}
                      className="flex items-center space-x-2 text-xs cursor-pointer p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedDocIds([...selectedDocIds, doc.id]);
                          else setSelectedDocIds(selectedDocIds.filter((id) => id !== doc.id));
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="truncate">{doc.title}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                Create Bundle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
