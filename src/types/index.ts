export type DocumentCategory =
  | 'ALL'
  | 'ID_CARDS'
  | 'ACADEMIC'
  | 'EMPLOYMENT'
  | 'PHOTOS'
  | 'SIGNATURES'
  | 'CERTIFICATES'
  | 'FINANCIAL';

export interface CategoryInfo {
  id: DocumentCategory;
  displayName: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'ALL', displayName: 'All Documents', icon: 'Folder', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400' },
  { id: 'ID_CARDS', displayName: 'ID & Identity', icon: 'CreditCard', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400' },
  { id: 'ACADEMIC', displayName: 'Academic', icon: 'GraduationCap', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' },
  { id: 'EMPLOYMENT', displayName: 'Employment', icon: 'Briefcase', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400' },
  { id: 'PHOTOS', displayName: 'Photos & Portraits', icon: 'Camera', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' },
  { id: 'SIGNATURES', displayName: 'Signatures', icon: 'PenTool', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400' },
  { id: 'CERTIFICATES', displayName: 'Certificates', icon: 'Award', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-400' },
  { id: 'FINANCIAL', displayName: 'Financial', icon: 'Landmark', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400' },
];

export interface DocumentVersion {
  id: string;
  documentId: string;
  label: string;
  mimeType: string;
  fileSizeBytes: number;
  dataUrl: string; // Base64 or Blob URL for client-side rendering
  widthPx?: number;
  heightPx?: number;
  targetSpec?: string;
  createdAt: number;
}

export interface VaultDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  dataUrl: string; // Private local storage representation
  thumbnailDataUrl?: string;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  notes: string;
  tags: string[];
  versions: DocumentVersion[];
}

export interface ApplicationProfile {
  id: string;
  title: string;
  description: string;
  targetOrganization: string;
  deadline?: number;
  documentIds: string[];
  requiredCategories: DocumentCategory[];
  createdAt: number;
}

export type NavScreen = 'home' | 'vault' | 'tools' | 'profiles' | 'settings';
