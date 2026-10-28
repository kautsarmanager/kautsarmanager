import React, { useState, useRef } from 'react';
import {
  FolderArchive,
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Trash2,
  Download,
  ExternalLink,
  X,
  HardDrive,
  CheckCircle2,
  Loader2,
  FileUp,
} from 'lucide-react';
import { FileItem } from '../types';
import { dataService } from '../services/dataService';

interface FilesViewProps {
  files: FileItem[];
  isDark: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const FilesView: React.FC<FilesViewProps> = ({ files, isDark, onShowToast }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);

  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = Array.from(
    new Set(files.map((f) => f.category).filter(Boolean))
  );

  const filteredFiles = files.filter((f) => {
    if (filterCategory !== 'all' && f.category !== filterCategory) return false;
    return true;
  });

  const totalBytes = files.reduce((acc, f) => acc + f.file_size, 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-400" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'pptx':
      case 'ppt':
        return <FileSpreadsheet className="w-4 h-4 text-amber-400" />;
      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileCode className="w-4 h-4 text-zinc-400" />;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    try {
      await dataService.uploadRealFile(selectedFile, category);
      if (onShowToast) {
        onShowToast(`File "${selectedFile.name}" berhasil diunggah`, 'success');
      }
      setSelectedFile(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Upload failed:', err);
      onShowToast?.(err instanceof Error ? err.message : 'Upload file gagal. Periksa koneksi dan pengaturan Supabase.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (file: FileItem) => {
    if (!window.confirm(`Hapus file "${file.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    dataService.deleteFile(file.id);
    if (onShowToast) {
      onShowToast(`File "${file.name}" dihapus`, 'info');
    }
  };

  const handleOpenFile = async (file: FileItem) => {
    try {
      const url = await dataService.getFileUrl(file);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else onShowToast?.('File ini hanya tersimpan sebagai metadata lokal. Unggah ulang saat online agar bisa dibuka di perangkat lain.', 'error');
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : 'File tidak dapat dibuka.', 'error');
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-lg sm:text-xl font-semibold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Files & Materi
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Dokumen, modul kuliah, dan tugas tersimpan di cloud storage.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedFile(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-lime-600 hover:bg-lime-500 text-white shadow-xs shadow-lime-600/30 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Storage Status & Filter bar */}
      <div
        className={`flex items-center justify-between p-3 rounded-xl border ${
          isDark ? 'bg-[#1A1B1E] border-[#26272B]' : 'bg-white border-zinc-200 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs">
          <HardDrive className="w-4 h-4 text-zinc-500" />
          <span className={`font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {files.length} File • {totalMB} MB tersimpan
          </span>
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={`border rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden ${
            isDark
              ? 'bg-[#111113] border-[#26272B] text-zinc-300'
              : 'bg-zinc-50 border-zinc-200 text-zinc-700'
          }`}
        >
          <option value="all">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Files Grid (Clean modern cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredFiles.length === 0 ? (
          <div
            className={`col-span-full p-10 text-center rounded-xl border border-dashed text-xs text-zinc-400 ${
              isDark ? 'border-[#26272B] bg-[#1A1B1E]' : 'border-zinc-300 bg-white'
            }`}
          >
            Belum ada file di kategori ini.
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                isDark
                  ? 'bg-[#1A1B1E] border-[#26272B] hover:border-zinc-700'
                  : 'bg-white border-zinc-200 hover:border-zinc-400 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`p-1.5 rounded-lg border ${
                      isDark ? 'bg-[#111113] border-[#26272B]' : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    {getFileIcon(file.file_type)}
                  </div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {file.category}
                  </span>
                </div>

                <h3 className={`text-xs font-medium mt-3 line-clamp-2 leading-snug ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {file.name}
                </h3>
                <p className="text-[11px] font-mono text-zinc-500 mt-1">
                  {(file.file_size / (1024 * 1024)).toFixed(2)} MB • {file.file_type.toUpperCase()}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-inherit text-xs">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {new Date(file.created_at).toLocaleDateString('id-ID')}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenFile(file)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Buka</span>
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Upload File */}
      {isModalOpen && (
        <div onMouseDown={(e) => { if (e.target === e.currentTarget && !isUploading) setIsModalOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl ${
              isDark ? 'bg-[#1A1B1E] border-[#26272B]' : 'bg-white border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <h2 className="text-sm font-semibold">Upload File Nyata</h2>
              <button
                onClick={() => !isUploading && setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 mt-4 text-xs">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
              />

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border border-dashed rounded-xl cursor-pointer transition-colors text-center ${
                  isDragging
                    ? 'border-lime-400 bg-lime-500/10'
                    : selectedFile
                    ? 'border-zinc-500 bg-[#0E0E10]'
                    : 'border-[#26272B] bg-[#111113] hover:border-zinc-500'
                }`}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 mb-2" />
                    <p className="font-medium text-xs truncate max-w-[260px] text-zinc-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileUp className="w-7 h-7 text-zinc-400 mb-2" />
                    <p className="font-medium text-zinc-200">
                      Klik atau seret (*drag & drop*) file ke sini
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                      PDF, DOCX, PPTX, JPG, PNG, ZIP
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Kuliah, Tugas, dll..."
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-hidden focus:ring-1 focus:ring-lime-500 ${
                    isDark ? 'bg-[#111113] border-[#26272B] text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-inherit">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-lime-600 hover:bg-lime-500 text-white font-medium disabled:opacity-40 transition-all cursor-pointer shadow-xs shadow-lime-600/30"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
