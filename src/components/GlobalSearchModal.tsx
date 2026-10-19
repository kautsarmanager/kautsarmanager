import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  CheckSquare,
  Wallet,
  FolderArchive,
  Heart,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { Task, Transaction, FileItem, WishlistItem } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: any) => void;
  isDark?: boolean;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  isDark = true,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    tasks: Task[];
    transactions: Transaction[];
    files: FileItem[];
    wishlist: WishlistItem[];
  }>({ tasks: [], transactions: [], files: [], wishlist: [] });

  useEffect(() => {
    if (query.trim().length > 0) {
      setResults(dataService.globalSearch(query));
    } else {
      setResults({ tasks: [], transactions: [], files: [], wishlist: [] });
    }
  }, [query]);

  // Keyboard shortcut listener for ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalResults =
    results.tasks.length +
    results.transactions.length +
    results.files.length +
    results.wishlist.length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-xs cursor-pointer animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] cursor-default ${
          isDark ? 'bg-[#2f2f2f] border-[#424242]' : 'bg-white border-zinc-300'
        }`}
      >
        {/* Search Input Bar (Raycast-like) */}
        <div className="flex items-center px-4 py-3 border-b border-inherit gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik pencarian (contoh: 'matdis', 'laporan', 'laptop')..."
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border text-zinc-400 bg-zinc-800/60 border-zinc-700 hover:text-white cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="p-3 overflow-y-auto space-y-3 flex-1 text-xs">
          {query.trim().length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              Mencari secara instan di Tasks, Finance, Files, dan Wishlist.
            </div>
          ) : totalResults === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              Tidak ada hasil untuk "{query}"
            </div>
          ) : (
            <>
              {results.tasks.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider mb-1.5 px-1">
                    Tasks ({results.tasks.length})
                  </p>
                  <div className="space-y-1">
                    {results.tasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onNavigateTab('tasks');
                          onClose();
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isDark ? 'hover:bg-[#1d1f2a]' : 'hover:bg-zinc-100'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-zinc-200">{t.title}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {t.category} • Deadline: {t.deadline}
                          </p>
                        </div>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 ml-2">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.transactions.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider mb-1.5 px-1">
                    Finance ({results.transactions.length})
                  </p>
                  <div className="space-y-1">
                    {results.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => {
                          onNavigateTab('finance');
                          onClose();
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isDark ? 'hover:bg-[#1d1f2a]' : 'hover:bg-zinc-100'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-zinc-200">{tx.description}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {tx.category} • {tx.transaction_date}
                          </p>
                        </div>
                        <span
                          className={`font-mono text-xs font-semibold ml-2 ${
                            tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} Rp{tx.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.files.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider mb-1.5 px-1">
                    Files ({results.files.length})
                  </p>
                  <div className="space-y-1">
                    {results.files.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          onNavigateTab('files');
                          onClose();
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isDark ? 'hover:bg-[#1d1f2a]' : 'hover:bg-zinc-100'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-zinc-200">{f.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{f.category}</p>
                        </div>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 ml-2">
                          {f.file_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.wishlist.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider mb-1.5 px-1">
                    Wishlist ({results.wishlist.length})
                  </p>
                  <div className="space-y-1">
                    {results.wishlist.map((w) => (
                      <div
                        key={w.id}
                        onClick={() => {
                          onNavigateTab('wishlist');
                          onClose();
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isDark ? 'hover:bg-[#1d1f2a]' : 'hover:bg-zinc-100'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-zinc-200">{w.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            Target: Rp{w.target_price.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold text-lime-400 ml-2">
                          {Math.min(100, Math.round((w.saved_amount / (w.target_price || 1)) * 100))}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
