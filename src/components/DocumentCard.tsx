import React from 'react';
import { FileText, Image as ImageIcon, ChevronRight, Layers } from 'lucide-react';
import { VaultDocument, CATEGORIES } from '../types';
import { DocumentThumbnail } from './DocumentThumbnail';

interface DocumentCardProps {
  document: VaultDocument;
  viewMode?: 'list' | 'grid';
  onClick: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  viewMode = 'list',
  onClick,
}) => {
  const categoryInfo = CATEGORIES.find((c) => c.id === document.category) || CATEGORIES[0];
  const isPdf = document.mimeType.includes('pdf');
  const sizeKb = (document.fileSizeBytes / 1024);
  const formattedSize =
    sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;

  if (viewMode === 'grid') {
    return (
      <div
        onClick={onClick}
        className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-3 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
      >
        <div>
          {/* Thumbnail preview */}
          <div className="w-full h-28 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center overflow-hidden mb-2.5 relative border border-slate-100 dark:border-slate-700">
            <DocumentThumbnail
              dataUrl={document.dataUrl}
              mimeType={document.mimeType}
              title={document.title}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
            />
            {document.versions && document.versions.length > 0 && (
              <span className="absolute bottom-1.5 right-1.5 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs flex items-center space-x-1">
                <Layers className="w-2.5 h-2.5" />
                <span>{document.versions.length}</span>
              </span>
            )}
          </div>

          <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {document.title}
          </h3>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
          <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${categoryInfo.color}`}>
            {categoryInfo.displayName.split(' ')[0]}
          </span>
          <span className="text-slate-500 dark:text-slate-400 font-medium font-mono">
            {formattedSize}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-200/60 dark:border-slate-700 relative">
          <DocumentThumbnail
            dataUrl={document.dataUrl}
            mimeType={document.mimeType}
            title={document.title}
            className="w-full h-full object-cover object-top"
            iconClassName="w-5 h-5"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {document.title}
            </h3>
            {document.versions && document.versions.length > 0 && (
              <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                {document.versions.length} {document.versions.length === 1 ? 'ver' : 'vers'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${categoryInfo.color}`}>
              {categoryInfo.displayName}
            </span>
            <span>•</span>
            <span className="font-mono text-[11px]">{formattedSize}</span>
          </div>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors ml-2 flex-shrink-0" />
    </div>
  );
};
