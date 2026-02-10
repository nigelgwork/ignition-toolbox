/** Extract array data from a response body, checking common wrapper patterns */
export function extractTableData(body: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(body)) return body.length > 0 && typeof body[0] === 'object' ? body as Record<string, unknown>[] : null;
  if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>;
    for (const key of ['items', 'resources', 'data', 'results', 'list']) {
      const val = obj[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return val as Record<string, unknown>[];
      }
    }
  }
  return null;
}
