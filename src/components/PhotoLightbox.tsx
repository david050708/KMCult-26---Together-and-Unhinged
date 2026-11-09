import React, { useState } from 'react';
import type { Photograph, Student } from '../types/index.ts';
import {
  X,
  Calendar,
  MapPin,
  Tag,
  User,
  Star,
  Trash2,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Unlock,
  Shield,
  Upload,
  Sparkles,
  Camera
} from 'lucide-react';
import { PhotoIllustrationCanvas, getCachedIllustration } from './PhotoIllustrationCanvas.tsx';

interface PhotoLightboxProps {
  photo: Photograph;
  allPhotos: Photograph[];
  memoryTitle: string;
  isCover: boolean;
  students: Student[];
  isUnlocked: boolean;
  illustratedUrl?: string;
  onRequestUnlock: (actionDescription: string) => void;
  onClose: () => void;
  onNavigate: (photo: Photograph) => void;
  onUpdateDetails: (photoId: string, updates: { caption?: string; location?: string; date?: string; taggedStudentIds?: string[]; isCover?: boolean; newImageData?: string }) => Promise<void>;
  onDeletePhoto: (photoId: string) => Promise<void>;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photo,
  allPhotos,
  memoryTitle,
  isCover,
  students,
  isUnlocked,
  illustratedUrl,
  onRequestUnlock,
  onClose,
  onNavigate,
  onUpdateDetails,
  onDeletePhoto,
}) => {
  const [viewMode, setViewMode] = useState<'original' | 'artwork'>('original');
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(photo.caption);
  const [location, setLocation] = useState(photo.location || '');
  const [date, setDate] = useState(photo.date || '');
  const [taggedIds, setTaggedIds] = useState<string[]>(photo.taggedStudentIds || []);
  const [isTagging, setIsTagging] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentIndex = allPhotos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1;

  const handlePrev = () => {
    if (hasPrev) onNavigate(allPhotos[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onNavigate(allPhotos[currentIndex + 1]);
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) handlePrev();
      if (e.key === 'ArrowRight' && hasNext) handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasPrev, hasNext]);

  const handleStartEdit = () => {
    if (!isUnlocked) {
      onRequestUnlock('edit the caption and details of this photograph');
      return;
    }
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!isUnlocked) {
      onRequestUnlock('save changes to this photograph');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateDetails(photo.id, {
        caption: caption.trim(),
        location: location.trim(),
        date: date.trim(),
        taggedStudentIds: taggedIds,
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetCover = async () => {
    if (!isUnlocked) {
      onRequestUnlock('set this photograph as the folder cover');
      return;
    }
    await onUpdateDetails(photo.id, { isCover: true });
  };

  const handleToggleTagClick = () => {
    if (!isUnlocked) {
      onRequestUnlock('tag classmates in this photograph');
      return;
    }
    setIsTagging(!isTagging);
  };

  const toggleTag = async (studentId: string) => {
    if (!isUnlocked) {
      onRequestUnlock('tag classmates in this photograph');
      return;
    }
    const next = taggedIds.includes(studentId)
      ? taggedIds.filter((id) => id !== studentId)
      : [...taggedIds, studentId];
    setTaggedIds(next);
    await onUpdateDetails(photo.id, { taggedStudentIds: next });
  };

  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteClick = async () => {
    if (!isUnlocked) {
      onRequestUnlock('remove this photograph from the memory');
      return;
    }
    if (!confirm('Are you sure you want to permanently remove this photograph from the memory?')) {
      return;
    }
    setIsDeletingPhoto(true);
    setDeleteError(null);
    try {
      await onDeletePhoto(photo.id);
      onClose();
    } catch (err: any) {
      console.error('Photo deletion failed:', err);
      setDeleteError(err.message || 'Failed to remove photograph from storage.');
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  // Filter students for tagging dropdown
  const filterStudentsForTag = students.filter(
    (s) =>
      s.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-6 animate-vintage-scale-fade"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close Lightbox Viewer (Esc)"
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 text-[#E8DDC9] hover:text-white bg-[#493D35] border border-[#FAF6EE]/40 hover:bg-[#382E28] rounded-xs transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
        title="Close Lightbox (Esc)"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev / Next Buttons */}
      {hasPrev && (
        <button
          onClick={handlePrev}
          aria-label="Previous Photograph"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 p-2 text-[#E8DDC9] hover:text-white bg-[#493D35] border border-[#FAF6EE]/40 hover:bg-[#382E28] rounded-xs transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
          title="Previous Photo (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={handleNext}
          aria-label="Next Photograph"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 p-2 text-[#E8DDC9] hover:text-white bg-[#493D35] border border-[#FAF6EE]/40 hover:bg-[#382E28] rounded-xs transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
          title="Next Photo (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Lightbox Frame */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="paper-sheet relative w-full max-w-6xl max-h-[92vh] rounded-xs border-2 border-[#493D35] shadow-[5px_6px_0px_rgba(73,61,53,0.35)] flex flex-col lg:flex-row overflow-hidden"
      >
          {/* Photo Viewport Area: Displays Original Photograph by default (PART C) */}
          <div className="flex-1 bg-[#1A1614] flex items-center justify-center p-4 min-h-[300px] lg:min-h-[500px] relative overflow-hidden select-none">
            {viewMode === 'original' ? (
              <img
                src={photo.url}
                alt={photo.caption || 'Original uploaded memory photograph'}
                referrerPolicy="no-referrer"
                className="max-h-[82vh] max-w-full object-contain drop-shadow-2xl rounded-xs border-2 border-[#FAF6EE]/20"
              />
            ) : (illustratedUrl || photo.artworkUrl || getCachedIllustration(photo.id)) ? (
              <img
                src={illustratedUrl || photo.artworkUrl || getCachedIllustration(photo.id)}
                alt={photo.caption || 'Reconstructed memory oil painting'}
                referrerPolicy="no-referrer"
                className="max-h-[82vh] max-w-full object-contain drop-shadow-2xl rounded-xs border-2 border-[#FAF6EE]/20"
              />
            ) : (
              <div className="max-h-[82vh] w-full max-w-2xl aspect-[4/3] rounded-xs border-2 border-[#FAF6EE]/20 overflow-hidden shadow-2xl">
                <PhotoIllustrationCanvas
                  photo={photo}
                  stage="finished"
                  progress={1}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Paper-Crafted View Mode Toggle: Original Photo (Default) vs Oil Painting */}
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#E8DDC9] p-1 rounded-xs border border-[#493D35] shadow-[2px_2px_0px_rgba(73,61,53,0.3)] z-10">
              <button
                type="button"
                onClick={() => setViewMode('original')}
                className={`px-2.5 py-1 text-[11px] font-sans font-medium rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'original'
                    ? 'bg-[#493D35] text-[#FAF6EE] shadow-xs'
                    : 'text-[#493D35] hover:bg-[#FAF6EE]/50'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Original Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('artwork')}
                className={`px-2.5 py-1 text-[11px] font-sans font-medium rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'artwork'
                    ? 'bg-[#493D35] text-[#FAF6EE] shadow-xs'
                    : 'text-[#493D35] hover:bg-[#FAF6EE]/50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#8B735E]" />
                <span>Oil Painting</span>
              </button>
            </div>

          {isCover && (
            <div className="absolute top-4 left-4 bg-[#E8DDC9] border-1.5 border-[#493D35] text-[#493D35] px-2.5 py-1 rounded-xs text-xs font-serif font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(73,61,53,0.2)]">
              <Star className="w-3.5 h-3.5 fill-[#8B735E] text-[#8B735E]" />
              <span>Memory Cover Photograph</span>
            </div>
          )}

          <div className="absolute bottom-4 left-4 bg-[#493D35] border border-[#FAF6EE]/30 text-[#E8DDC9] px-2.5 py-1 rounded-xs text-xs font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.4)]">
            {currentIndex + 1} / {allPhotos.length}
          </div>
        </div>

        {/* Sidebar Metadata & Controls */}
        <div className="w-full lg:w-96 p-6 flex flex-col justify-between overflow-y-auto bg-[#FAF6EE] border-t-1.5 lg:border-t-0 lg:border-l-1.5 border-[#493D35] text-xs">
          <div>
            {/* Header info */}
            <div className="pb-4 border-b border-[#D6C4A8]/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#8B735E] font-medium">
                  {memoryTitle}
                </span>
                <p className="text-sm font-serif font-bold text-[#493D35] mt-0.5">
                  Photograph Details
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isUnlocked ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#66715C] font-semibold bg-[#66715C]/15 px-2 py-0.5 rounded-xs border border-[#66715C]/40">
                      <Unlock className="w-2.5 h-2.5" />
                      <span>Unlocked</span>
                    </span>

                    {!isEditing ? (
                      <button
                        onClick={handleStartEdit}
                        className="ink-button-subtle p-1.5 cursor-pointer"
                        title="Edit Caption & Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="ink-button text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => onRequestUnlock('edit this photograph')}
                    className="ink-button-subtle text-[11px] py-0.5 px-2 flex items-center gap-1 cursor-pointer font-serif font-bold"
                    title="Click to enter memory passcode"
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>Unlock</span>
                  </button>
                )}
              </div>
            </div>

            {/* Content Body */}
            <div className="mt-4 space-y-4">
              {/* Caption */}
              <div>
                <label className="block text-[11px] font-serif font-bold uppercase tracking-wider text-[#493D35] mb-1">
                  Memory Story / Caption
                </label>
                {isEditing ? (
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="w-full p-2 bg-transparent border-1.5 border-[#493D35] rounded-xs text-xs text-[#493D35] focus:outline-none focus:ring-1 focus:ring-[#493D35]"
                  />
                ) : (
                  <p className="font-handwritten text-base sm:text-lg text-[#493D35] leading-relaxed">
                    {photo.caption || <span className="italic text-[#8B735E] font-sans text-xs">No description added yet.</span>}
                  </p>
                )}
              </div>

              {/* Date & Location */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#8B735E]">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      placeholder="e.g. October 14, 2024"
                      className="flex-1 px-2 py-1 bg-transparent border-1.5 border-[#493D35] rounded-xs text-xs text-[#493D35]"
                    />
                  ) : (
                    <span>{photo.date || 'Undated archive'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-[#493D35]/80">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Anatomy Dissection Hall"
                      className="flex-1 px-2 py-1 bg-transparent border-1.5 border-[#493D35] rounded-xs text-xs text-[#493D35]"
                    />
                  ) : (
                    <span>{photo.location || 'Campus / Clinical grounds'}</span>
                  )}
                </div>
              </div>

              {/* Tagged Classmates (Authoritative 150 Directory Integration) */}
              <div className="pt-3 border-t border-[#493D35]/20">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#493D35] flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Tagged Classmates ({taggedIds.length})</span>
                  </label>
                  {isUnlocked && (
                    <button
                      onClick={handleToggleTagClick}
                      className="ink-button-subtle text-[11px] py-0.5 px-2 flex items-center gap-1 cursor-pointer font-serif font-semibold"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tag Classmate</span>
                    </button>
                  )}
                </div>

                {/* Tag Search Popup */}
                {isUnlocked && isTagging && (
                  <div className="mb-3 p-2 bg-[#FAF6EE] rounded-xs border-1.5 border-[#493D35] shadow-[2px_2px_0px_rgba(73,61,53,0.15)]">
                    <input
                      type="text"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      placeholder="Search 150 students by name or roll..."
                      className="w-full px-2.5 py-1.5 bg-transparent border-1.5 border-[#493D35] rounded-xs text-xs text-[#493D35] mb-2 focus:outline-none focus:ring-1 focus:ring-[#493D35]"
                    />
                    <div className="max-h-48 overflow-y-auto divide-y divide-[#493D35]/20 bg-transparent rounded-xs border border-[#493D35]/40">
                      {filterStudentsForTag.length === 0 ? (
                        <div className="p-3 text-center text-[11px] text-[#8B735E]">
                          No classmate matches &quot;{tagSearch}&quot;
                        </div>
                      ) : (
                        filterStudentsForTag.map((s) => {
                          const isAlreadyTagged = taggedIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleTag(s.id)}
                              className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-[#E8DDC9]/40 flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-[#8B735E] w-7">
                                  #{String(s.index).padStart(3, '0')}
                                </span>
                                <span className="truncate max-w-[190px] font-medium text-[#493D35]">
                                  {s.name}
                                </span>
                              </div>
                              {isAlreadyTagged ? (
                                <span className="text-[#66715C] font-semibold text-[10px] flex items-center gap-0.5">
                                  <Check className="w-3 h-3" />
                                  <span>Tagged</span>
                                </span>
                              ) : (
                                <span className="text-[#8B735E] hover:text-[#493D35] text-[10px]">
                                  + Tag
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Render Tagged Classmates (Paper-craft unboxed/outlined tokens) */}
                <div className="flex flex-wrap gap-1.5">
                  {taggedIds.length === 0 ? (
                    <span className="text-[11px] text-[#8B735E]/70 italic">
                      No classmates tagged in this photograph yet.
                    </span>
                  ) : (
                    taggedIds.map((id) => {
                      const student = students.find((s) => s.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-transparent text-[#493D35] rounded-xs text-[11px] font-medium border border-[#493D35]"
                        >
                          <span>{student ? student.name : id}</span>
                          {isUnlocked && (
                            <button
                              onClick={() => toggleTag(id)}
                              className="text-[#8B735E] hover:text-red-700 ml-0.5 cursor-pointer"
                              title="Remove tag"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Action Buttons Footer (Only rendered when editing is unlocked) */}
          {isUnlocked && (
            <div className="pt-4 border-t-1.5 border-[#493D35]/30 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {!isCover ? (
                  <button
                    onClick={handleSetCover}
                    className="ink-button-subtle text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Make Cover</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-[#66715C] font-serif font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Current Cover</span>
                  </span>
                )}

                <label className="ink-button-subtle text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Replace Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const dataUrl = ev.target?.result as string;
                          if (dataUrl) {
                            setIsSaving(true);
                            try {
                              await onUpdateDetails(photo.id, { newImageData: dataUrl });
                            } catch (err) {
                              console.error('Failed to replace photograph image:', err);
                            } finally {
                              setIsSaving(false);
                            }
                          }
                        };
                        reader.readAsDataURL(files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              {deleteError && (
                <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-xs border border-red-300">
                  {deleteError}
                </p>
              )}

              <button
                onClick={handleDeleteClick}
                disabled={isDeletingPhoto}
                className="ink-button-subtle text-red-700 hover:text-red-900 border-red-700 text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingPhoto ? 'Removing Photo...' : 'Remove Photo'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
