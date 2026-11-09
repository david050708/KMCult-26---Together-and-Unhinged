import React, { useState, useMemo } from 'react';
import type { Student, Memory } from '../types/index.ts';
import { X, Search, Tag, FolderHeart, User } from 'lucide-react';

interface StudentDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  memories: Memory[];
  onSelectMemory: (memory: Memory) => void;
  onSelectStudentForFilter?: (student: Student) => void;
}

export const StudentDirectoryModal: React.FC<StudentDirectoryModalProps> = ({
  isOpen,
  onClose,
  students,
  memories,
  onSelectMemory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term) ||
        String(s.index).includes(term)
    );
  }, [students, searchTerm]);

  // Find memories tagged with the selected student
  const studentMemories = useMemo(() => {
    if (!selectedStudent) return [];
    return memories.filter((mem) =>
      mem.photos.some((p) => p.taggedStudentIds?.includes(selectedStudent.id))
    );
  }, [memories, selectedStudent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 animate-vintage-fade-up">
      <div className="paper-sheet w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] rounded-xs border-2 border-[#493D35] shadow-[5px_6px_0px_rgba(73,61,53,0.25)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#E8DDC9] border-b-1.5 border-[#493D35] flex items-center justify-between">
          <div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-[#493D35]">
              Classmate Directory
            </h2>
            <p className="text-[11px] sm:text-xs text-[#8B735E]">
              150 MBBS Students · Permanent Identifiers · Collective Tagging
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Directory Modal"
            className="p-1.5 text-[#493D35] hover:bg-[#493D35]/10 rounded-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-transparent border-b border-[#493D35]/30">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8B735E] pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search classmates by name or roll index (e.g., #042)..."
              className="w-full pl-9 pr-4 py-2 text-xs text-[#493D35]"
            />
          </div>
        </div>

        {/* Content Split: Left List / Right Student Profile & Tagged Memories */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Student List */}
          <div className="md:col-span-7 border-r border-[#493D35]/30 overflow-y-auto divide-y divide-[#493D35]/20 max-h-[50vh] md:max-h-[60vh] bg-transparent">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8B735E]">
                No student matches &quot;{searchTerm}&quot;.
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedStudent?.id === student.id;
                // Count tagged photos across all memories
                const taggedCount = memories.reduce((acc, m) => {
                  return acc + m.photos.filter((p) => p.taggedStudentIds?.includes(student.id)).length;
                }, 0);

                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#E8DDC9]/70 text-[#493D35] font-semibold'
                        : 'text-[#493D35] hover:bg-[#F5F0E6]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-[#8B735E] w-10">
                        #{String(student.index).padStart(3, '0')}
                      </span>
                      <span className="truncate max-w-[200px]">{student.name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#8B735E]">
                      {taggedCount > 0 && (
                        <span className="flex items-center gap-1 font-mono">
                          <Tag className="w-3 h-3 text-[#66715C]" />
                          {taggedCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Student Profile & Tagged Memories */}
          <div className="md:col-span-5 p-5 bg-[#FCFBF7] overflow-y-auto max-h-[50vh] md:max-h-[60vh]">
            {selectedStudent ? (
              <div>
                <div className="flex items-center gap-3 pb-4 border-b border-[#D6C4A8]/40">
                  <div className="w-12 h-12 rounded-full bg-[#E8DDC9] flex items-center justify-center text-[#493D35] font-serif font-bold text-lg border border-[#D6C4A8]">
                    {selectedStudent.name.charAt(0) || 'D'}
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold text-sm text-[#493D35]">
                      {selectedStudent.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-[#8B735E] font-mono mt-0.5">
                      <span>{selectedStudent.id}</span>
                      <span>·</span>
                      <span>Roll #{String(selectedStudent.index).padStart(3, '0')}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8B735E] mb-2.5">
                    Tagged Memories ({studentMemories.length})
                  </h4>

                  {studentMemories.length === 0 ? (
                    <div className="p-4 bg-[#F5F0E6]/60 rounded-lg text-center text-xs text-[#8B735E] border border-dashed border-[#D6C4A8]">
                      No memories tagged with {selectedStudent.name} yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {studentMemories.map((mem) => (
                        <button
                          key={mem.id}
                          onClick={() => {
                            onClose();
                            onSelectMemory(mem);
                          }}
                          className="w-full text-left p-2.5 bg-white hover:bg-[#E8DDC9]/40 border border-[#D6C4A8] rounded-lg transition-colors flex items-center gap-3 group"
                        >
                          {mem.coverPhotoUrl ? (
                            <img
                              src={mem.coverPhotoUrl}
                              alt={mem.title}
                              className="w-10 h-10 rounded object-cover border border-[#D6C4A8]"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-[#E8DDC9] flex items-center justify-center text-[#8B735E]">
                              <FolderHeart className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-medium text-[#493D35] group-hover:underline truncate">
                              {mem.title}
                            </h5>
                            <span className="text-[11px] text-[#8B735E]">
                              {mem.photos.length} photos · {mem.date}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8B735E]">
                <User className="w-8 h-8 stroke-1 mb-2 opacity-50" />
                <p className="text-xs">
                  Select any classmate from the directory to view tagged memories and archives.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#E8DDC9]/70 border-t border-[#493D35]/30 flex items-center justify-between text-xs text-[#8B735E]">
          <span>Central MBBS 2026 Directory</span>
          <button
            onClick={onClose}
            className="ink-button-subtle text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
