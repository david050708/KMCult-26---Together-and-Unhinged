import React, { useState, useMemo, useEffect } from 'react';
import type { Memory, Student } from '../types/index.ts';
import { hasMemoryToken, clearMemoryToken, getStorageUsage, type StorageMetrics } from '../services/api.ts';
import { MemoryPasswordModal } from './MemoryPasswordModal.tsx';
import { StorageUsageBar } from './StorageUsageBar.tsx';
import {
  FolderPlus,
  Sparkles,
  MoreVertical,
  Edit2,
  Trash2,
  ImagePlus,
  Users,
  Search,
  Calendar,
  Layers,
  ArrowUpRight,
  Upload,
  X,
  Lock,
  Unlock,
  ShieldCheck,
  BookOpen,
  Camera,
  AlertCircle
} from 'lucide-react';

interface GalleryViewProps {
  memories: Memory[];
  students: Student[];
  onOpenMemory: (memory: Memory) => void;
  onCreateMemory: (data: {
    title: string;
    description: string;
    date: string;
    category: string;
    password: string;
    initialPhotos?: { url: string; caption?: string; location?: string; taggedStudentIds?: string[] }[];
  }) => Promise<void>;
  onUpdateMemory: (id: string, data: { title?: string; description?: string; date?: string; category?: string; coverPhotoId?: string }) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  onAddPhotos: (memoryId: string, photos: { url: string; caption?: string }[]) => Promise<void>;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  memories,
  students,
  onOpenMemory,
  onCreateMemory,
  onUpdateMemory,
  onDeleteMemory,
  onAddPhotos
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [addingPhotosToMemory, setAddingPhotosToMemory] = useState<Memory | null>(null);

  // Password Verification Modal State for Protected Operations
  const [passwordModalConfig, setPasswordModalConfig] = useState<{
    memoryId: string;
    memoryTitle: string;
    pendingAction: 'edit' | 'add_photos' | 'delete';
  } | null>(null);

  // New Memory Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCategory, setNewCategory] = useState('Clinical Postings');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [stagedPhotos, setStagedPhotos] = useState<{ url: string; caption?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Memory Form State
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCoverPhotoId, setEditCoverPhotoId] = useState('');

  // Add Photos Quick Modal State
  const [quickPhotoUrl, setQuickPhotoUrl] = useState('');
  const [quickPhotoCaption, setQuickPhotoCaption] = useState('');

  // Active action menu popover
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Categories list derived from memories
  const categories = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [memories]);

  // Filtered memories
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchSearch =
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.photos.some((p) => p.caption.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = categoryFilter === 'all' || m.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [memories, searchTerm, categoryFilter]);

  // Handle file drop / local upload converted to data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'create' | 'quick') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        if (target === 'create') {
          setStagedPhotos((prev) => [...prev, { url, caption: file.name.replace(/\.[^/.]+$/, '') }]);
        } else {
          setQuickPhotoUrl(url);
          setQuickPhotoCaption(file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Validate memory password
    if (!newPassword || newPassword.length < 4) {
      setPasswordError('Editing passcode must be at least 4 characters long.');
      return;
    }
    if (newPassword !== newConfirmPassword) {
      setPasswordError('Passcodes do not match. Please re-enter.');
      return;
    }

    setPasswordError(null);
    setIsSubmitting(true);
    try {
      await onCreateMemory({
        title: newTitle.trim(),
        description: newDesc.trim(),
        date: newDate.trim() || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        category: newCategory,
        password: newPassword,
        initialPhotos: stagedPhotos
      });
      await refreshStorage();
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewDate('');
      setNewPassword('');
      setNewConfirmPassword('');
      setStagedPhotos([]);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to create memory folder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Protected Action Checkers
  const handleRequestEdit = (memory: Memory) => {
    setActiveMenuId(null);
    if (hasMemoryToken(memory.id)) {
      setEditingMemory(memory);
      setEditTitle(memory.title);
      setEditDesc(memory.description);
      setEditDate(memory.date);
      setEditCategory(memory.category || '');
      setEditCoverPhotoId(memory.coverPhotoId || '');
    } else {
      setPasswordModalConfig({
        memoryId: memory.id,
        memoryTitle: memory.title,
        pendingAction: 'edit'
      });
    }
  };

  const handleRequestAddPhotos = (memory: Memory) => {
    setActiveMenuId(null);
    if (hasMemoryToken(memory.id)) {
      setAddingPhotosToMemory(memory);
    } else {
      setPasswordModalConfig({
        memoryId: memory.id,
        memoryTitle: memory.title,
        pendingAction: 'add_photos'
      });
    }
  };

  // Storage metrics state (Priority 3 Requirement)
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isFetchingStorage, setIsFetchingStorage] = useState(false);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);

  const refreshStorage = async () => {
    setIsFetchingStorage(true);
    setStorageError(null);
    try {
      const data = await getStorageUsage();
      setStorageMetrics(data);
    } catch (err: any) {
      console.warn('Could not refresh storage metrics:', err);
      setStorageError(err.message || 'Storage metrics unavailable.');
    } finally {
      setIsFetchingStorage(false);
    }
  };

  useEffect(() => {
    refreshStorage();
    const interval = setInterval(refreshStorage, 30000);
    return () => clearInterval(interval);
  }, []);

  const handlePerformDeleteMemory = async (memoryId: string, memoryTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${memoryTitle}" and all its associated photographs? This action cannot be undone.`)) {
      return;
    }
    setDeletingMemoryId(memoryId);
    try {
      await onDeleteMemory(memoryId);
      await refreshStorage();
    } catch (err: any) {
      alert(err.message || 'Failed to delete memory folder.');
    } finally {
      setDeletingMemoryId(null);
    }
  };

  const handleRequestDelete = (memory: Memory) => {
    setActiveMenuId(null);
    if (hasMemoryToken(memory.id)) {
      handlePerformDeleteMemory(memory.id, memory.title);
    } else {
      setPasswordModalConfig({
        memoryId: memory.id,
        memoryTitle: memory.title,
        pendingAction: 'delete'
      });
    }
  };

  const handlePasswordModalSuccess = (_token: string) => {
    if (!passwordModalConfig) return;
    const memory = memories.find((m) => m.id === passwordModalConfig.memoryId);
    const action = passwordModalConfig.pendingAction;
    setPasswordModalConfig(null);

    if (!memory) return;

    if (action === 'edit') {
      setEditingMemory(memory);
      setEditTitle(memory.title);
      setEditDesc(memory.description);
      setEditDate(memory.date);
      setEditCategory(memory.category || '');
      setEditCoverPhotoId(memory.coverPhotoId || '');
    } else if (action === 'add_photos') {
      setAddingPhotosToMemory(memory);
    } else if (action === 'delete') {
      handlePerformDeleteMemory(memory.id, memory.title);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !editTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpdateMemory(editingMemory.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        date: editDate.trim(),
        category: editCategory,
        coverPhotoId: editCoverPhotoId || undefined
      });
      setEditingMemory(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPhotosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingPhotosToMemory || !quickPhotoUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddPhotos(addingPhotosToMemory.id, [{ url: quickPhotoUrl.trim(), caption: quickPhotoCaption.trim() }]);
      await refreshStorage();
      setAddingPhotosToMemory(null);
      setQuickPhotoUrl('');
      setQuickPhotoCaption('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-[#F5F0E6] bg-vintage-paper selection:bg-[#D6C4A8]">
      {/* Top Hero Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#D6C4A8]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B735E]">
              The Central Gallery · Kilpauk Medical College
            </span>
            <h1 className="mt-1 text-3xl sm:text-4xl font-serif text-[#493D35] font-bold tracking-tight">
              Shared Memory Folders
            </h1>
            <p className="mt-2 text-sm text-[#8B735E] max-w-2xl leading-relaxed">
              Every folder preserves an era of our medical school years. Select any memory to initiate its Swarm reconstruction into an organic spatial composition.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setPasswordError(null);
                setIsCreateOpen(true);
              }}
              disabled={storageMetrics?.isLimitReached}
              className="px-4 py-2.5 bg-[#493D35] hover:bg-[#382E28] disabled:opacity-50 text-[#F5F0E6] rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create Memory</span>
            </button>
          </div>
        </div>

        {/* Storage Usage Bar (Priority 3 Requirement) */}
        <div className="mt-6">
          <StorageUsageBar
            metrics={storageMetrics}
            error={storageError}
            isLoading={isFetchingStorage}
            onRefresh={refreshStorage}
          />
        </div>

        {/* Filter Controls Bar (Interactive tabs allowed per frontend-design) */}
        {memories.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  categoryFilter === 'all'
                    ? 'bg-[#E8DDC9] text-[#493D35] font-semibold border border-[#D6C4A8]'
                    : 'text-[#8B735E] hover:text-[#493D35] hover:bg-[#E8DDC9]/40'
                }`}
              >
                All Memories ({memories.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-[#E8DDC9] text-[#493D35] font-semibold border border-[#D6C4A8]'
                      : 'text-[#8B735E] hover:text-[#493D35] hover:bg-[#E8DDC9]/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8B735E]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search memories..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35] placeholder:text-[#8B735E]/60 focus:outline-none focus:ring-1 focus:ring-[#8B735E]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Memory Folders Grid or Nostalgic Empty State */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {memories.length === 0 ? (
          /* NOSTALGIC SCRAPBOOK EMPTY STATE (Zero AI photos requirement §1) */
          <div className="my-10 max-w-2xl mx-auto p-8 sm:p-12 bg-[#FCFBF7] border border-[#D6C4A8] rounded-2xl shadow-[0_6px_24px_rgba(73,61,53,0.06)] text-center relative overflow-hidden">
            {/* Vintage Paper Corner Decors */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#D6C4A8] pointer-events-none" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#D6C4A8] pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#D6C4A8] pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#D6C4A8] pointer-events-none" />

            {/* Icon Graphic */}
            <div className="w-16 h-16 mx-auto rounded-full bg-[#E8DDC9]/70 border border-[#D6C4A8] flex items-center justify-center text-[#493D35] shadow-xs mb-5">
              <BookOpen className="w-8 h-8 stroke-1 text-[#8B735E]" />
            </div>

            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B735E]">
              Kilpauk Medical College · Class of 2026
            </span>

            <h2 className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-[#493D35]">
              The Chronicle Awaits Its First Memory
            </h2>

            <p className="mt-3 text-sm text-[#8B735E] max-w-lg mx-auto leading-relaxed">
              KMCult&apos;26 is an authentic student-only memory archive. No stock photos or sample images exist here. Every photograph in this space is uploaded, captioned, and preserved by our 150 batchmates.
            </p>

            <div className="mt-6 pt-6 border-t border-[#D6C4A8]/60 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => {
                  setPasswordError(null);
                  setIsCreateOpen(true);
                }}
                className="w-full sm:w-auto px-6 py-3 bg-[#493D35] hover:bg-[#382E28] text-[#F5F0E6] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow"
              >
                <FolderPlus className="w-4 h-4 text-[#D6C4A8]" />
                <span>Create First Memory Folder</span>
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-[11px] text-[#8B735E]">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#66715C]" />
                <span>Student-Uploaded Photographs</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#66715C]" />
                <span>Passcode Protected Edits</span>
              </span>
            </div>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="my-12 p-12 bg-[#FCFBF7] border border-dashed border-[#D6C4A8] rounded-xl text-center">
            <p className="text-sm font-serif text-[#493D35]">No memory folders match your query.</p>
            <p className="mt-1 text-xs text-[#8B735E]">Try adjusting your search terms or category selection.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-[#E8DDC9] text-[#493D35] text-xs font-semibold rounded-lg hover:bg-[#D6C4A8] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMemories.map((memory) => {
              const isUnlocked = hasMemoryToken(memory.id);
              const taggedCount = new Set(
                memory.photos.flatMap((p) => p.taggedStudentIds || [])
              ).size;

              return (
                <div
                  key={memory.id}
                  className="relative group bg-[#FCFBF7] rounded-xl border border-[#D6C4A8] shadow-[0_4px_16px_rgba(73,61,53,0.06)] hover:shadow-[0_12px_28px_rgba(73,61,53,0.12)] transition-all duration-300 flex flex-col overflow-hidden"
                >
                  {/* Manila Folder Tab Top */}
                  <div className="bg-[#E8DDC9]/80 px-5 py-2.5 border-b border-[#D6C4A8] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8B735E]">
                        {memory.category || 'Memory Folder'}
                      </span>
                      {isUnlocked && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#66715C] font-semibold bg-[#66715C]/15 px-1.5 py-0.5 rounded" title="Editing unlocked for this session">
                          <Unlock className="w-2.5 h-2.5" />
                          <span>Unlocked</span>
                        </span>
                      )}
                    </div>

                    {isUnlocked ? (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === memory.id ? null : memory.id);
                          }}
                          className="p-1 text-[#8B735E] hover:text-[#493D35] rounded transition-colors"
                          title="Folder Edit Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu (Only visible when unlocked) */}
                        {activeMenuId === memory.id && (
                          <div
                            className="absolute right-0 top-7 w-48 bg-white border border-[#D6C4A8] rounded-lg shadow-lg z-20 py-1 text-xs font-medium text-[#493D35]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleRequestEdit(memory)}
                              className="w-full text-left px-3 py-2 hover:bg-[#F5F0E6] flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-[#8B735E]" />
                              <span>Edit Folder Info</span>
                            </button>
                            <button
                              onClick={() => handleRequestAddPhotos(memory)}
                              className="w-full text-left px-3 py-2 hover:bg-[#F5F0E6] flex items-center gap-2"
                            >
                              <ImagePlus className="w-3.5 h-3.5 text-[#8B735E]" />
                              <span>Add Photographs</span>
                            </button>
                            <div className="border-t border-[#D6C4A8]/40 my-1" />
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                clearMemoryToken(memory.id);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-[#F5F0E6] text-[#8B735E] flex items-center gap-2"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Lock Editing Session</span>
                            </button>
                            <div className="border-t border-[#D6C4A8]/40 my-1" />
                            <button
                              onClick={() => handleRequestDelete(memory)}
                              disabled={deletingMemoryId === memory.id}
                              className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-700 flex items-center gap-2 disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{deletingMemoryId === memory.id ? 'Deleting Folder...' : 'Delete Memory'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPasswordModalConfig({
                            memoryId: memory.id,
                            memoryTitle: memory.title,
                            pendingAction: 'edit'
                          });
                        }}
                        className="p-1 text-[#8B735E]/70 hover:text-[#493D35] rounded transition-colors"
                        title="Unlock editing for this memory"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Cover Photo Slot */}
                  <div
                    onClick={() => onOpenMemory(memory)}
                    className="relative aspect-[16/10] bg-[#E8DDC9]/40 overflow-hidden cursor-pointer group"
                  >
                    {memory.coverPhotoUrl ? (
                      <img
                        src={memory.coverPhotoUrl}
                        alt={memory.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#8B735E] p-4 text-center">
                        <Layers className="w-8 h-8 stroke-1 mb-1.5 opacity-60" />
                        <span className="text-xs font-medium">No photographs in this memory yet</span>
                        <span className="text-[10px] text-[#8B735E]/70 mt-0.5">Click to add photos or explore Swarm</span>
                      </div>
                    )}

                    {/* Subtle photo corner effect */}
                    <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#E8DDC9] opacity-80 pointer-events-none" />
                    <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#E8DDC9] opacity-80 pointer-events-none" />

                    {/* Hover Swarm preview overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#493D35]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <span className="text-xs font-semibold text-[#F5F0E6] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#D6C4A8]" />
                        Enter Swarm Reconstruction
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => onOpenMemory(memory)}
                        className="text-base font-serif font-bold text-[#493D35] hover:text-[#8B735E] transition-colors cursor-pointer"
                      >
                        {memory.title}
                      </h3>

                      {memory.description && (
                        <p className="mt-1.5 text-xs text-[#8B735E] line-clamp-2 leading-relaxed">
                          {memory.description}
                        </p>
                      )}
                    </div>

                    {/* Unboxed Metadata (Zero-Pill Discipline per §1.A) */}
                    <div className="mt-4 pt-3 border-t border-[#D6C4A8]/50 flex items-center justify-between text-xs text-[#8B735E]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#8B735E]/70" />
                        <span>{memory.date}</span>
                        <span aria-hidden="true">·</span>
                        <span>{memory.photos.length} photos</span>
                      </div>

                      {taggedCount > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-[#66715C] font-medium">
                          <Users className="w-3.5 h-3.5" />
                          <span>{taggedCount} classmates</span>
                        </div>
                      )}
                    </div>

                    {/* Primary Button to launch Swarm */}
                    <div className="mt-4 pt-1">
                      <button
                        onClick={() => onOpenMemory(memory)}
                        className="w-full py-2 bg-[#E8DDC9] hover:bg-[#D6C4A8] text-[#493D35] text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 border border-[#D6C4A8]/60"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#66715C]" />
                        <span>Launch Swarm Reconstruction</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE MEMORY MODAL (WITH MEMORY PASSCODE) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FCFBF7] w-full max-w-xl rounded-xl border border-[#D6C4A8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-[#E8DDC9]/70 border-b border-[#D6C4A8] flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-[#493D35]">Create New Memory Folder</h2>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-[#8B735E] hover:text-[#493D35]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                  Memory Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Anatomy Hall & The First Dissections"
                  required
                  className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35] focus:outline-none focus:ring-1 focus:ring-[#8B735E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                    Date / Academic Period
                  </label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="e.g. Autumn 2024"
                    className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35] focus:outline-none focus:ring-1 focus:ring-[#8B735E]"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35] focus:outline-none focus:ring-1 focus:ring-[#8B735E]"
                  >
                    <option value="Foundation & Academics">Foundation & Academics</option>
                    <option value="Clinical Postings">Clinical Postings</option>
                    <option value="Culturals & Stage">Culturals & Stage</option>
                    <option value="Sports & Athletics">Sports & Athletics</option>
                    <option value="Hostel & Night Life">Hostel & Night Life</option>
                    <option value="Convocation & Farewells">Convocation & Farewells</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                  Story / Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Describe the context, stories, or anecdotes that define this chapter..."
                  className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35] focus:outline-none focus:ring-1 focus:ring-[#8B735E]"
                />
              </div>

              {/* Memory Editing Passcode Section */}
              <div className="p-3.5 bg-[#E8DDC9]/40 border border-[#D6C4A8] rounded-lg space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#8B735E]" />
                  <span className="font-semibold uppercase tracking-wider text-[#493D35]">
                    Memory Editing Passcode *
                  </span>
                </div>
                <p className="text-[11px] text-[#8B735E] leading-relaxed">
                  Anyone in the batch can explore and view this memory. This passcode is required only to edit descriptions, add or delete photographs, or remove the memory.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-[#8B735E] mb-1">
                      Set Passcode
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D6C4A8] rounded text-xs text-[#493D35] focus:outline-none focus:ring-1 focus:ring-[#8B735E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-[#8B735E] mb-1">
                      Confirm Passcode
                    </label>
                    <input
                      type="password"
                      value={newConfirmPassword}
                      onChange={(e) => setNewConfirmPassword(e.target.value)}
                      placeholder="Re-type passcode"
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D6C4A8] rounded text-xs text-[#493D35] focus:outline-none focus:ring-1 focus:ring-[#8B735E]"
                    />
                  </div>
                </div>
              </div>

              {/* Initial Photo Staging */}
              <div className="pt-2 border-t border-[#D6C4A8]/40">
                <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1.5">
                  Add Initial Photographs ({stagedPhotos.length})
                </label>

                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="Paste image link or upload below..."
                    className="flex-1 px-3 py-1.5 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPhotoUrl.trim()) {
                        setStagedPhotos([...stagedPhotos, { url: newPhotoUrl.trim(), caption: newPhotoCaption.trim() }]);
                        setNewPhotoUrl('');
                        setNewPhotoCaption('');
                      }
                    }}
                    className="px-3 py-1.5 bg-[#E8DDC9] hover:bg-[#D6C4A8] text-[#493D35] rounded-lg font-medium"
                  >
                    Add Link
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <label className="px-3 py-1.5 bg-white border border-[#D6C4A8] hover:bg-[#F5F0E6] rounded-lg text-xs font-medium text-[#493D35] cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#8B735E]" />
                    <span>Upload Local File</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileUpload(e, 'create')}
                      className="hidden"
                    />
                  </label>
                </div>

                {stagedPhotos.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto p-2 bg-[#F5F0E6] rounded-lg border border-[#D6C4A8]/50">
                    {stagedPhotos.map((p, idx) => (
                      <div key={idx} className="relative w-16 h-16 shrink-0 rounded overflow-hidden border border-[#D6C4A8]">
                        <img src={p.url} alt="Staged" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setStagedPhotos(stagedPhotos.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#D6C4A8]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#8B735E] hover:text-[#493D35]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="px-4 py-2 bg-[#493D35] hover:bg-[#382E28] text-[#F5F0E6] rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMORY MODAL */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FCFBF7] w-full max-w-xl rounded-xl border border-[#D6C4A8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#E8DDC9]/70 border-b border-[#D6C4A8] flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-[#493D35]">Edit Memory Details</h2>
              <button onClick={() => setEditingMemory(null)} className="p-1 text-[#8B735E] hover:text-[#493D35]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                    Date / Period
                  </label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35]"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                  Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35]"
                />
              </div>

              {/* Cover Photo Selection */}
              {editingMemory.photos.length > 0 && (
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1.5">
                    Select Cover Photograph
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {editingMemory.photos.map((p) => {
                      const isSelected = editCoverPhotoId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setEditCoverPhotoId(p.id)}
                          className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                            isSelected ? 'border-[#493D35] ring-2 ring-[#8B735E]' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#D6C4A8]">
                <button
                  type="button"
                  onClick={() => setEditingMemory(null)}
                  className="px-4 py-2 text-xs font-medium text-[#8B735E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#493D35] hover:bg-[#382E28] text-[#F5F0E6] rounded-lg font-semibold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD PHOTOS MODAL */}
      {addingPhotosToMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FCFBF7] w-full max-w-lg rounded-xl border border-[#D6C4A8] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-[#E8DDC9]/70 border-b border-[#D6C4A8] flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-[#493D35]">
                Add Photo to &quot;{addingPhotosToMemory.title}&quot;
              </h2>
              <button onClick={() => setAddingPhotosToMemory(null)} className="p-1 text-[#8B735E] hover:text-[#493D35]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPhotosSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                  Photograph Source (URL or File)
                </label>
                <input
                  type="text"
                  value={quickPhotoUrl}
                  onChange={(e) => setQuickPhotoUrl(e.target.value)}
                  placeholder="Paste direct image link..."
                  className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35] mb-2"
                />

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#D6C4A8] hover:bg-[#F5F0E6] rounded-lg text-xs font-medium text-[#493D35] cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#8B735E]" />
                  <span>Choose local file</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'quick')}
                    className="hidden"
                  />
                </label>
              </div>

              {quickPhotoUrl && (
                <div className="aspect-[16/10] max-h-48 rounded overflow-hidden border border-[#D6C4A8]">
                  <img src={quickPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                  Caption / Memory Notes
                </label>
                <input
                  type="text"
                  value={quickPhotoCaption}
                  onChange={(e) => setQuickPhotoCaption(e.target.value)}
                  placeholder="What was happening here? Who was in the frame?"
                  className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#D6C4A8]">
                <button
                  type="button"
                  onClick={() => setAddingPhotosToMemory(null)}
                  className="px-4 py-2 text-xs font-medium text-[#8B735E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !quickPhotoUrl.trim()}
                  className="px-4 py-2 bg-[#493D35] hover:bg-[#382E28] text-[#F5F0E6] rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Photograph'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMORY PASSWORD MODAL INTERCEPTOR */}
      {passwordModalConfig && (
        <MemoryPasswordModal
          isOpen={Boolean(passwordModalConfig)}
          memoryId={passwordModalConfig.memoryId}
          memoryTitle={passwordModalConfig.memoryTitle}
          actionDescription={
            passwordModalConfig.pendingAction === 'delete'
              ? 'delete this memory folder and its photos'
              : passwordModalConfig.pendingAction === 'add_photos'
              ? 'add photographs to this memory folder'
              : 'edit details of this memory folder'
          }
          onClose={() => setPasswordModalConfig(null)}
          onSuccess={handlePasswordModalSuccess}
        />
      )}
    </div>
  );
};
