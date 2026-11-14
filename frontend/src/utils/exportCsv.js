import { getApiUrl } from './api';
/**
 * Client-Side CSV Exporter with UTF-8 BOM encoding for Excel compatibility
 */
export function downloadCsv(filename, headers, rows) {
  if (!rows || rows.length === 0) {
    alert('No data available to export');
    return;
  }

  const csvRows = [];
  csvRows.push(headers.map(h => `"${String(h.label || h).replace(/"/g, '""')}"`).join(','));

  for (const row of rows) {
    const values = headers.map(h => {
      const key = typeof h === 'object' ? h.key : h;
      let val = row[key];
      if (val === undefined || val === null) val = '';
      if (typeof val === 'object') val = JSON.stringify(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  // Prepend UTF-8 BOM so Excel opens with proper Indian Rupee (₹) and character formatting
  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportViaServer(type) {
  window.open(getApiUrl(`/api/admin/export/?type=${type}`), '_blank');
}
