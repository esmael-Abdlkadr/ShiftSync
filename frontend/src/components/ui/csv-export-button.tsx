'use client';

import { useState } from 'react';
import { Download, ChevronDown, FileText } from 'lucide-react';
import { useExportCsv, type CsvColumn } from '@/hooks/use-export-csv';

interface CsvExportButtonProps<T> {
  data: T[];
  columns: CsvColumn<T>[];
  filename: string;
  disabled?: boolean;
  showTemplate?: boolean;
}

export function CsvExportButton<T>({
  data,
  columns,
  filename,
  disabled = false,
  showTemplate = true,
}: CsvExportButtonProps<T>) {
  const [open, setOpen] = useState(false);
  const { exportCsv, downloadTemplate } = useExportCsv();

  const handleExport = () => {
    exportCsv(data, columns, filename);
    setOpen(false);
  };

  const handleTemplate = () => {
    downloadTemplate(columns, filename);
    setOpen(false);
  };

  if (!showTemplate) {
    return (
      <button
        onClick={handleExport}
        disabled={disabled || data.length === 0}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="h-4 w-4" />
        Export
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
            <button
              onClick={handleExport}
              disabled={data.length === 0}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 text-slate-400" />
              <div className="text-left">
                <div className="font-medium">Export as CSV</div>
                <div className="text-xs text-slate-400">{data.length} records</div>
              </div>
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={handleTemplate}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 text-slate-400" />
              <div className="text-left">
                <div className="font-medium">Download Template</div>
                <div className="text-xs text-slate-400">Empty CSV with headers</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
