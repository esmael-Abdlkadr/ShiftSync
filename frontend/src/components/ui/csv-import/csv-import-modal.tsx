'use client';

import React, { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { z } from 'zod';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { validateCsvRows, type ValidatedRow } from '@/lib/validations/csv-import';
import { useExportCsv } from '@/hooks/use-export-csv';
import { BaseModal } from '@/components/ui/modal';

export interface ImportResult {
  succeeded: number;
  failed: number;
  errors: { row: number; email?: string; reason: string }[];
}

interface CsvImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: T[]) => Promise<ImportResult>;
  schema: z.ZodSchema<T>;
  templateColumns: { key: string; header: string }[];
  templateFilename: string;
  entityName: string;
}

type Step = 'upload' | 'preview' | 'result';

const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload',
  preview: 'Preview',
  result: 'Result',
};
const STEPS: Step[] = ['upload', 'preview', 'result'];

export function CsvImportModal<T>({
  isOpen,
  onClose,
  onImport,
  schema,
  templateColumns,
  templateFilename,
  entityName,
}: CsvImportModalProps<T>) {
  const [step, setStep] = useState<Step>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow<T>[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { downloadTemplate } = useExportCsv();

  const reset = () => {
    setStep('upload');
    setValidatedRows([]);
    setImportResult(null);
    setParseError(null);
    setExpandedErrors(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseFile = useCallback(
    (file: File) => {
      setParseError(null);
      if (!file.name.endsWith('.csv')) {
        setParseError('Please upload a .csv file.');
        return;
      }
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        transform: (v) => v.trim(),
        complete: (results) => {
          if (!results.data.length) {
            setParseError('The CSV file is empty.');
            return;
          }
          setValidatedRows(validateCsvRows<T>(results.data, schema));
          setStep('preview');
        },
        error: (err) => setParseError(`Failed to parse file: ${err.message}`),
      });
    },
    [schema]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    const validRows = validatedRows.filter((r) => r.isValid && r.data).map((r) => r.data as T);
    if (!validRows.length) return;
    setIsImporting(true);
    try {
      const result = await onImport(validRows);
      setImportResult(result);
      setStep('result');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleErrorExpand = (idx: number) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
      return next;
    });
  };

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const invalidCount = validatedRows.filter((r) => !r.isValid).length;

  const stepDescription = {
    upload: 'Upload a CSV file to bulk import',
    preview: `${validatedRows.length} rows found — review before importing`,
    result: 'Import complete',
  }[step];

  const footer = (
    <div className="flex items-center justify-between w-full">
      {step === 'upload' && (
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      )}

      {step === 'preview' && (
        <>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            {invalidCount > 0 && (
              <p className="text-sm text-amber-600">
                {invalidCount} row{invalidCount > 1 ? 's' : ''} will be skipped
              </p>
            )}
            <button
              onClick={handleImport}
              disabled={validCount === 0 || isImporting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
              Import {validCount} {entityName}
            </button>
          </div>
        </>
      )}

      {step === 'result' && (
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Import More
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Import ${entityName}`}
      description={stepDescription}
      size="2xl"
      footer={footer}
      scrollable={false}
    >
      {/* Steps indicator */}
      <div className="flex items-center px-6 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        {STEPS.map((s, i) => {
          const done = STEPS.indexOf(step) > i;
          const active = step === s;
          return (
            <div key={s} className="flex items-center">
              {i > 0 && <div className={`w-8 h-px ${done ? 'bg-slate-900' : 'bg-slate-200'}`} />}
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${done || active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`text-sm ${active ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                  {STEP_LABELS[s]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step body */}
      <div className="flex-1 overflow-auto">
        {step === 'upload' && (
          <div className="p-6 space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                isDragging ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Upload className="h-6 w-6 text-slate-500" />
              </div>
              <div className="text-center">
                <p className="font-medium text-slate-900">Drop your CSV file here</p>
                <p className="text-sm text-slate-500 mt-1">or click to browse</p>
              </div>
              <span className="text-xs text-slate-400">Only .csv files are supported</span>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>

            {parseError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {parseError}
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Need a template?</p>
                  <p className="text-xs text-slate-500">Download a blank CSV with the correct headers</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); downloadTemplate(templateColumns, templateFilename); }}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Download Template
              </button>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">Expected columns:</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {templateColumns.map((c) => (
                  <span key={c.key} className="px-2 py-0.5 bg-slate-100 rounded font-mono text-slate-600">
                    {c.header}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div>
            <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{validCount} valid</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{invalidCount} with errors</span>
                  <span className="text-slate-400">(will be skipped)</span>
                </div>
              )}
            </div>

            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase w-12">Row</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {validatedRows.map((row, idx) => (
                  <React.Fragment key={idx}>
                    <tr className={`border-b border-slate-100 ${row.isValid ? '' : 'bg-red-50/50'}`}>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{row.rowIndex}</td>
                      <td className="px-4 py-2.5">
                        {row.isValid ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <CheckCircle className="h-3.5 w-3.5" /> Valid
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                            <AlertCircle className="h-3.5 w-3.5" /> Error
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-900">{row.raw.firstName} {row.raw.lastName}</td>
                      <td className="px-4 py-2.5 text-slate-600">{row.raw.email}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600 font-mono">{row.raw.role}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {!row.isValid && (
                          <button onClick={() => toggleErrorExpand(idx)} className="p-1 hover:bg-red-100 rounded">
                            {expandedErrors.has(idx) ? (
                              <ChevronUp className="h-4 w-4 text-red-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-red-500" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                    {!row.isValid && expandedErrors.has(idx) && row.errors && (
                      <tr className="bg-red-50 border-b border-red-100">
                        <td colSpan={6} className="px-4 py-2">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(row.errors).map(([field, msg]) => (
                              <div key={field} className="flex items-start gap-1.5 text-xs text-red-700">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span><span className="font-medium font-mono">{field}:</span> {msg}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center text-center py-4">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${importResult.failed === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {importResult.failed === 0 ? (
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {importResult.failed === 0 ? 'Import Successful' : 'Import Partially Complete'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {importResult.succeeded} {entityName.toLowerCase()} imported successfully
                {importResult.failed > 0 && `, ${importResult.failed} failed`}
              </p>
            </div>

            {importResult.errors.length > 0 && (
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-2.5 border-b border-red-200">
                  <p className="text-sm font-medium text-red-700">Failed Rows</p>
                </div>
                <div className="divide-y divide-red-100">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        {err.email && <span className="font-medium text-slate-700">{err.email} — </span>}
                        <span className="text-red-600">{err.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
