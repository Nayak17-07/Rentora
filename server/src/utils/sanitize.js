/**
 * Recursively strips MongoDB operator keys (`$...`) and dotted keys from
 * untrusted request payloads (req.body, req.query, req.params) to prevent
 * NoSQL operator injection.
 */
function sanitizeNoSql(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeNoSql);
  }
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.')) {
        continue;
      }
      clean[k] = sanitizeNoSql(v);
    }
    return clean;
  }
  return value;
}

module.exports = { sanitizeNoSql };
