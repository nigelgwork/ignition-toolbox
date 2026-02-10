/**
 * Table view for API responses that are arrays of objects.
 * Renders data in an MUI Table with sticky headers and tooltips for nested objects.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

interface TableViewProps {
  data: Record<string, unknown>[];
}

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

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

export function TableView({ data }: TableViewProps) {
  if (data.length === 0) {
    return <Typography color="text.secondary">No data to display.</Typography>;
  }

  // Build columns from union of all keys
  const columnSet = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) {
      columnSet.add(key);
    }
  }
  const columns = Array.from(columnSet);

  return (
    <TableContainer sx={{ maxHeight: 400 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col} sx={{ fontWeight: 'bold', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i} hover>
              {columns.map((col) => {
                const raw = formatCellValue(row[col]);
                const display = truncate(raw, 80);
                const needsTooltip = raw.length > 80;
                return (
                  <TableCell key={col} sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {needsTooltip ? (
                      <Tooltip title={<pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxWidth: 400 }}>{raw}</pre>} arrow>
                        <span>{display}</span>
                      </Tooltip>
                    ) : (
                      display
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
