/**
 * Rentora CSV Export Security & Utility Module
 * Protects against CSV / Spreadsheet Formula Injection (CWE-1236)
 */

const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '%', '|'];

/**
 * Sanitizes a cell value for CSV output.
 * If the cell begins with dangerous spreadsheet formula triggers, it prepends a single quote (').
 * Properly escapes double quotes and wraps in quotes.
 * 
 * @param {any} value
 * @returns {string}
 */
function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // Check if trimmed content starts with a formula trigger
  const trimmed = str.trimStart();
  if (trimmed.length > 0 && DANGEROUS_PREFIXES.includes(trimmed[0])) {
    str = "'" + str;
  }

  // Escape internal double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Builds a safe CSV string from an array of object records and header keys.
 * 
 * @param {Array<string>} headers
 * @param {Array<Object>} rows
 * @returns {string} UTF-8 BOM prefixed CSV string
 */
function buildCsvString(headers, rows) {
  const lines = [];
  
  // Header line
  lines.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  // Data lines
  for (const row of rows) {
    const line = headers.map(header => escapeCsvCell(row[header])).join(',');
    lines.push(line);
  }

  return '\uFEFF' + lines.join('\r\n');
}

module.exports = {
  escapeCsvCell,
  buildCsvString,
  DANGEROUS_PREFIXES
};
