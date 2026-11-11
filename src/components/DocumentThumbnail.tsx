import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, FileCheck, Layers } from 'lucide-react';
import { generatePdfPageThumbnail } from '../processing/pdfProcessor';

interface DocumentThumbnailProps {
  dataUrl?: string;
  mimeType: string;
  title: string;
  className?: string;
  iconClassName?: string;
}

export const DocumentThumbnail: React.FC<DocumentThumbnailProps> = ({
  dataUrl,
  mimeType,
  title,
  className = 'w-full h-full object-cover',
  iconClassName = 'w-6 h-6',
}) => {
  const [hasError, setHasError] = useState(false);
  const [pdfThumbnail, setPdfThumbnail] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const isPdf = mimeType.includes('pdf') || dataUrl?.startsWith('data:application/pdf');

  useEffect(() => {
    let isMounted = true;
    if (isPdf && dataUrl && !pdfThumbnail) {
      setIsPdfLoading(true);
      generatePdfPageThumbnail(dataUrl, 1, 240)
        .then((thumb) => {
          if (isMounted && thumb) {
            setPdfThumbnail(thumb);
          }
        })
        .catch(() => {
          // Fall back to clean PDF placeholder icon
        })
        .finally(() => {
          if (isMounted) setIsPdfLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isPdf, dataUrl]);

  // PDF Preview
  if (isPdf) {
    if (pdfThumbnail && !hasError) {
      return (
        <div className="relative w-full h-full">
          <img
            src={pdfThumbnail}
            alt={title}
            onError={() => setHasError(true)}
            className={className}
          />
          <span className="absolute bottom-1 right-1 bg-red-600/90 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-xs tracking-wider">
            PDF
          </span>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-red-50/80 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-2 text-center select-none">
        <FileText className={iconClassName} />
        <span className="text-[10px] font-extrabold uppercase tracking-wider mt-1 text-red-700 dark:text-red-300">
          PDF DOC
        </span>
      </div>
    );
  }

  // Standard Image Preview
  if (dataUrl && !hasError) {
    return (
      <img
        src={dataUrl}
        alt={title}
        onError={() => setHasError(true)}
        className={className}
        loading="lazy"
      />
    );
  }

  // Fallback icon placeholder if image fails to load or no dataUrl
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 p-2 text-center select-none">
      <ImageIcon className={iconClassName} />
      <span className="text-[9px] font-medium text-slate-400 truncate max-w-full px-1 mt-1">
        {title.slice(0, 12)}
      </span>
    </div>
  );
};
