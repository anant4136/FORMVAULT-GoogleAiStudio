import React, { useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  FolderOpen,
  Plus,
} from 'lucide-react';
import { VaultDocument, DocumentCategory, CATEGORIES } from '../types';
import { DocumentCard } from '../components/DocumentCard';

interface VaultScreenProps {
  documents: VaultDocument[];
  onSelectDocument: (doc: VaultDocument) => void;
  onOpenImport: () => void;
}

export const VaultScreen: React.FC<VaultScreenProps> = ({
  documents,
  onSelectDocument,
  onOpenImport,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'size'>('recent');

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  // Sort documents
  const sortedDocs = [...filteredDocs].sort((a, b) => {
    if (sortBy === 'name') return a.title.localeCompare(b.title);
    if (sortBy === 'size') return b.fileSizeBytes - a.fileSizeBytes;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Title & View Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Vault</h2>
          <p className="text-xs text-slate-500">
            {sortedDocs.length} {sortedDocs.length === 1 ? 'document' : 'documents'} found
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="recent">Latest</option>
            <option value="name">Name A-Z</option>
            <option value="size">Size</option>
          </select>

          {/* Grid / List toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Chips Scroll */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count =
            cat.id === 'ALL'
              ? documents.length
              : documents.filter((d) => d.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 flex-shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span>{cat.displayName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vault Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by title or notes..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Document Grid or List */}
      {sortedDocs.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {sortedDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                viewMode="grid"
                onClick={() => onSelectDocument(doc)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                viewMode="list"
                onClick={() => onSelectDocument(doc)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-700 my-6">
          <FolderOpen className="w-12 h-12 mx-auto text-slate-400 mb-2" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">
            No Documents In This Category
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {searchQuery
              ? `No documents matched "${searchQuery}".`
              : 'Add your documents to this category to access them anytime.'}
          </p>
          <button
            onClick={onOpenImport}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Import Document
          </button>
        </div>
      )}
    </div>
  );
};
