export interface CsvColumn<T> {
  key: string;
  header: string;
  getValue?: (row: T) => string | number | boolean | null | undefined;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = col.getValue ? col.getValue(row) : (row as Record<string, unknown>)[col.key];
        return escapeCell(raw);
      })
      .join(',')
  );
  return [header, ...rows].join('\n');
}

function triggerDownload(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useExportCsv() {
  const exportCsv = <T>(data: T[], columns: CsvColumn<T>[], filename: string) => {
    const csv = buildCsv(data, columns);
    triggerDownload(csv, filename);
  };

  const downloadTemplate = (columns: { header: string }[], filename: string) => {
    const header = columns.map((c) => escapeCell(c.header)).join(',');
    triggerDownload(header + '\n', `${filename}_template`);
  };

  return { exportCsv, downloadTemplate };
}
