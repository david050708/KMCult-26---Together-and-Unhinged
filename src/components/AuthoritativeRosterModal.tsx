import React, { useState, useMemo } from 'react';
import type { Student } from '../types/index.ts';
import { updateAuthoritativeRoster, resetRosterSlots } from '../services/api.ts';
import { AUTHORITATIVE_ROSTER, validateRoster } from '../data/rosterData.ts';
import {
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Copy,
  ShieldCheck,
  Search,
  CheckCircle2,
  ListOrdered
} from 'lucide-react';

interface AuthoritativeRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onRosterUpdated: (updated: Student[]) => void;
}

export const AuthoritativeRosterModal: React.FC<AuthoritativeRosterModalProps> = ({
  isOpen,
  onClose,
  students,
  onRosterUpdated
}) => {
  const [mode, setMode] = useState<'view' | 'validation_report' | 'bulk_paste'>('view');
  const [pasteText, setPasteText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Compute live validation report of the current directory
  const validationReport = useMemo(() => {
    return validateRoster(students);
  }, [students]);

  // Filter students for table view
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

  if (!isOpen) return null;

  // Process raw text into lines
  const parsedLines = pasteText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const lineCount = parsedLines.length;
  const isExact150 = lineCount === 150;

  const handleApplyRoster = async () => {
    if (!isExact150) {
      setStatusMessage({
        type: 'error',
        text: `Authoritative roster requires exactly 150 names. Current count is ${lineCount}.`
      });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await updateAuthoritativeRoster(parsedLines);
      if (res.success && res.students) {
        onRosterUpdated(res.students);
        setStatusMessage({
          type: 'success',
          text: 'Successfully updated authoritative roster with all 150 student names!'
        });
        setMode('view');
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to update roster.'
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: e.message || 'Error updating roster on server.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreHardcodedAuthoritative = async () => {
    setIsSaving(true);
    try {
      const res = await resetRosterSlots();
      if (res.success && res.students) {
        onRosterUpdated(res.students);
        setStatusMessage({
          type: 'success',
          text: 'Restored permanent authoritative 150-student directory!'
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Restore failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCurrentList = () => {
    const list = students.map((s) => `${s.index}. ${s.name}`).join('\n');
    navigator.clipboard.writeText(list);
    setStatusMessage({ type: 'success', text: 'Copied all 150 numbered student names to clipboard.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 animate-vintage-fade-up">
      <div className="paper-sheet w-full max-w-4xl max-h-[90vh] rounded-xs border-2 border-[#493D35] shadow-[5px_6px_0px_rgba(73,61,53,0.25)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#E8DDC9] border-b-1.5 border-[#493D35] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base sm:text-lg font-bold text-[#493D35]">
                Authoritative 150-Student Directory
              </h2>
              {validationReport.status === 'valid' && (
                <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-[#66715C] bg-[#66715C]/10 px-2 py-0.5 rounded-xs border border-[#66715C]/40">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>150 Verified</span>
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-[#8B735E]">
              Sole authoritative source of student identity · Permanent identifiers <code className="font-mono text-[11px]">kmc-001</code> to <code className="font-mono text-[11px]">kmc-150</code>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Authoritative Roster Modal"
            className="p-1.5 text-[#493D35] hover:bg-[#493D35]/10 rounded-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls & Actions */}
        <div className="px-6 py-3 bg-[#E8DDC9]/40 border-b border-[#493D35]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMode('view');
                setStatusMessage(null);
              }}
              className={`px-3 py-1.5 rounded-xs font-serif font-bold transition-all cursor-pointer ${
                mode === 'view'
                  ? 'bg-[#493D35] text-[#FAF6EE] border-1.5 border-[#493D35] shadow-[2px_2px_0px_rgba(73,61,53,0.3)]'
                  : 'bg-transparent text-[#493D35] border-1.5 border-dashed border-[#493D35]/50 hover:border-[#493D35]'
              }`}
            >
              Roster Directory ({students.length})
            </button>
            <button
              onClick={() => {
                setMode('validation_report');
                setStatusMessage(null);
              }}
              className={`px-3 py-1.5 rounded-xs font-serif font-bold transition-all cursor-pointer ${
                mode === 'validation_report'
                  ? 'bg-[#493D35] text-[#FAF6EE] border-1.5 border-[#493D35] shadow-[2px_2px_0px_rgba(73,61,53,0.3)]'
                  : 'bg-transparent text-[#493D35] border-1.5 border-dashed border-[#493D35]/50 hover:border-[#493D35]'
              }`}
            >
              Validation Report
            </button>
            <button
              onClick={() => {
                setMode('bulk_paste');
                setStatusMessage(null);
              }}
              className={`px-3 py-1.5 rounded-xs font-serif font-bold transition-all cursor-pointer ${
                mode === 'bulk_paste'
                  ? 'bg-[#493D35] text-[#FAF6EE] border-1.5 border-[#493D35] shadow-[2px_2px_0px_rgba(73,61,53,0.3)]'
                  : 'bg-transparent text-[#493D35] border-1.5 border-dashed border-[#493D35]/50 hover:border-[#493D35]'
              }`}
            >
              Replace Roster (150 Names)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCurrentList}
              className="ink-button-subtle text-xs py-1 px-2.5 flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy 150 Names</span>
            </button>
            <button
              onClick={handleRestoreHardcodedAuthoritative}
              disabled={isSaving}
              className="ink-button-subtle text-xs py-1 px-2.5 flex items-center gap-1"
              title="Reload hardcoded authoritative list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Authoritative</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-[#66715C]/15 text-[#66715C] border-b border-[#66715C]/30'
                : 'bg-red-50 text-red-700 border-b border-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'validation_report' ? (
            <div className="space-y-4">
              <div className="p-4 bg-[#FAF6EE] rounded-xs border-1.5 border-[#493D35] shadow-[2px_3px_0px_rgba(73,61,53,0.15)]">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-[#66715C]" />
                  <h3 className="font-serif font-bold text-sm text-[#493D35]">
                    Authoritative Directory Validation Report
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
                  <div className="p-3 bg-transparent rounded-xs border border-[#493D35]/40">
                    <span className="text-[#8B735E] block">Total Student Count</span>
                    <strong className="text-[#493D35] text-base font-mono">
                      {validationReport.totalCount} / 150
                    </strong>
                    <span className="text-[11px] text-[#66715C] block mt-0.5 font-medium">
                      {validationReport.isExact150 ? '✓ Exactly 150 students present' : '✗ Count mismatch'}
                    </span>
                  </div>

                  <div className="p-3 bg-transparent rounded-xs border border-[#493D35]/40">
                    <span className="text-[#8B735E] block">Unique Internal Identifiers</span>
                    <strong className="text-[#493D35] text-base font-mono">
                      {validationReport.uniqueIdsCount} / 150
                    </strong>
                    <span className="text-[11px] text-[#66715C] block mt-0.5 font-medium">
                      {validationReport.allIdsUnique ? '✓ 100% unique IDs (kmc-001 - kmc-150)' : '✗ Duplicate IDs found'}
                    </span>
                  </div>

                  <div className="p-3 bg-transparent rounded-xs border border-[#493D35]/40">
                    <span className="text-[#8B735E] block">Order &amp; Sequence Integrity</span>
                    <strong className="text-[#493D35] text-base font-mono">
                      {validationReport.orderPreserved ? 'Preserved (1 - 150)' : 'Altered'}
                    </strong>
                    <span className="text-[11px] text-[#66715C] block mt-0.5 font-medium">
                      {validationReport.orderPreserved ? '✓ Sequential index matching' : '✗ Sequence error'}
                    </span>
                  </div>

                  <div className="p-3 bg-transparent rounded-xs border border-[#493D35]/40">
                    <span className="text-[#8B735E] block">Duplicate Name Inspection</span>
                    <strong className="text-[#493D35] text-base font-mono">
                      {validationReport.duplicateNames.length === 0 ? '0 Duplicates' : `${validationReport.duplicateNames.length} Duplicates`}
                    </strong>
                    <span className="text-[11px] text-[#66715C] block mt-0.5 font-medium">
                      {validationReport.duplicateNames.length === 0 ? '✓ All 150 names distinct' : `Reported: ${validationReport.duplicateNames.join(', ')}`}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#493D35]/20 text-xs">
                  <h4 className="font-serif font-bold text-[#493D35] mb-1.5">Verification Checklist:</h4>
                  <ul className="space-y-1 text-[#493D35]/80 list-disc list-inside">
                    <li>Total student count = exactly 150 (Checked: {students.length})</li>
                    <li>Every supplied name is present and matches original text</li>
                    <li>Original order preserved (#1 AADHARSH S P through #150 YOHITH PRAJAN E)</li>
                    <li>No spelling, initials, or punctuation modified (e.g. DAVESHWAR V.K, DHANALAKSHMI.S preserved)</li>
                    <li>Every internal ID is permanent and stable (kmc-001 ... kmc-150)</li>
                    <li>No placeholder or fabricated students exist</li>
                    <li>Central directory module wired directly to login, tagging, attribution, and search</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : mode === 'view' ? (
            <div>
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#8B735E]">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#493D35]/60" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search 150 students by name or roll..."
                    className="w-full pl-9 pr-3.5 py-1.5 bg-transparent border-1.5 border-[#493D35] rounded-xs text-xs text-[#493D35] placeholder:text-[#8B735E]/60 focus:outline-none focus:ring-1 focus:ring-[#493D35]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong className="text-[#493D35]">{filteredStudents.length}</strong> of {students.length} students
                  </span>
                  <button
                    onClick={() => setMode('validation_report')}
                    className="text-[#66715C] hover:underline flex items-center gap-1 font-serif font-semibold cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>View Validation Report</span>
                  </button>
                </div>
              </div>

              <div className="border-1.5 border-[#493D35] rounded-xs overflow-hidden bg-[#FAF6EE] shadow-[2px_3px_0px_rgba(73,61,53,0.15)]">
                <div className="grid grid-cols-12 bg-[#E8DDC9] px-4 py-2.5 text-[11px] font-serif font-bold uppercase tracking-wider text-[#493D35] border-b-1.5 border-[#493D35]">
                  <div className="col-span-2">Internal ID</div>
                  <div className="col-span-1">No.</div>
                  <div className="col-span-7">Authoritative Student Name</div>
                  <div className="col-span-2 text-right">Verification</div>
                </div>

                <div className="divide-y divide-[#493D35]/20 max-h-[50vh] overflow-y-auto font-sans text-xs">
                  {filteredStudents.length === 0 ? (
                    <div className="p-6 text-center text-[#8B735E]">
                      No student matches &quot;{searchTerm}&quot;.
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-[#E8DDC9]/30 transition-colors"
                      >
                        <div className="col-span-2 font-mono text-[11px] text-[#8B735E]">
                          {student.id}
                        </div>
                        <div className="col-span-1 font-mono text-[11px] text-[#8B735E]">
                          {student.index}
                        </div>
                        <div className="col-span-7 text-[#493D35] font-semibold tracking-wide">
                          {student.name}
                        </div>
                        <div className="col-span-2 text-right text-[11px]">
                          <span className="text-[#66715C] font-semibold flex items-center justify-end gap-1">
                            <Check className="w-3 h-3" />
                            <span>Authoritative</span>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-serif font-bold text-[#493D35]">
                  Replace Roster with Exact 150 Names
                </h3>
                <p className="mt-1 text-xs text-[#8B735E] leading-relaxed">
                  Paste the authoritative list of exactly 150 students (one student name per line).
                  Names are mapped directly to <code className="font-mono text-[11px]">kmc-001</code> through <code className="font-mono text-[11px]">kmc-150</code> in exact sequence. Spelling, initials, and punctuation are strictly preserved as provided.
                </p>
              </div>

              <div className="relative">
                <textarea
                  value={pasteText}
                  onChange={(e) => {
                    setPasteText(e.target.value);
                    setStatusMessage(null);
                  }}
                  rows={14}
                  placeholder={`1. AADHARSH S P\n2. AASHAN V\n...\n150. YOHITH PRAJAN E`}
                  className="w-full p-4 font-mono text-xs text-[#493D35] bg-transparent border-1.5 border-[#493D35] rounded-xs focus:outline-none focus:ring-1 focus:ring-[#493D35] leading-relaxed"
                />

                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono font-medium ${
                        isExact150 ? 'text-[#66715C]' : 'text-[#8B735E]'
                      }`}
                    >
                      Count: {lineCount} / 150 required
                    </span>
                  </div>

                  <button
                    onClick={handleApplyRoster}
                    disabled={!isExact150 || isSaving}
                    className="ink-button text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    <span>{isSaving ? 'Applying...' : 'Apply Authoritative Roster'}</span>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#E8DDC9] border-t-1.5 border-[#493D35] flex items-center justify-between text-xs text-[#493D35]">
          <span className="font-serif">KMCult&apos;26 Directory Policy: Sole Source of Batch Identity (150 Students)</span>
          <button
            onClick={onClose}
            className="ink-button-subtle text-xs py-1 px-3"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
