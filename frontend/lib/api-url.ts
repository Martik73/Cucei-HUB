/** Accept a server origin or a full API base path without dropping /api. */
export function resolveApiUrl(configured?: string): string {
  const value = configured?.trim() || 'http://localhost:5000/api';
  if (value.startsWith('/')) return value.replace(/\/+$/, '') || '/api';
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, '') || '/api';
  return url.toString().replace(/\/$/, '');
}
