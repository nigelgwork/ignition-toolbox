/**
 * Rich response viewer for API Explorer.
 * Shows status badge, timing, copy button, view toggle, URL, headers, and body.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { JsonViewer } from './JsonViewer';
import { TableView } from './TableView';
import { extractTableData } from './utils';

interface ResponseViewerProps {
  response: {
    status_code: number;
    headers?: Record<string, string>;
    body: unknown;
    url?: string;
    elapsed_ms?: number;
  };
}

function getStatusColor(code: number): 'success' | 'warning' | 'error' | 'default' {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 400 && code < 500) return 'warning';
  if (code >= 500) return 'error';
  return 'default';
}

function getStatusText(code: number): string {
  const texts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return texts[code] || '';
}

function formatTime(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

type ViewMode = 'json' | 'table';

export function ResponseViewer({ response }: ResponseViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('json');
  const [copied, setCopied] = useState(false);

  const tableData = useMemo(() => extractTableData(response.body), [response.body]);
  const canShowTable = tableData !== null;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(response.body, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may fail in some contexts
    }
  }, [response.body]);

  const statusText = getStatusText(response.status_code);
  const statusLabel = statusText ? `${response.status_code} ${statusText}` : String(response.status_code);

  return (
    <Box>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <Chip
          label={statusLabel}
          color={getStatusColor(response.status_code)}
          size="small"
          sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
        />
        {response.elapsed_ms !== undefined && (
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {formatTime(response.elapsed_ms)}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={copied ? 'Copied!' : 'Copy JSON'}>
          <IconButton size="small" onClick={handleCopy}>
            <CopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="json" sx={{ py: 0.25, px: 1, textTransform: 'none', fontSize: '0.75rem' }}>
            JSON
          </ToggleButton>
          <ToggleButton value="table" disabled={!canShowTable} sx={{ py: 0.25, px: 1, textTransform: 'none', fontSize: '0.75rem' }}>
            Table
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* URL */}
      {response.url && (
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            color: 'text.secondary',
            mb: 1,
            wordBreak: 'break-all',
            fontSize: '0.8rem',
          }}
        >
          {response.url}
        </Typography>
      )}

      {/* Body */}
      <Box
        sx={{
          bgcolor: 'background.default',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          p: 1.5,
          maxHeight: 450,
          overflow: 'auto',
        }}
      >
        {viewMode === 'table' && tableData ? (
          <TableView data={tableData} />
        ) : (
          <JsonViewer data={response.body} />
        )}
      </Box>

      {/* Headers accordion */}
      {response.headers && Object.keys(response.headers).length > 0 && (
        <Accordion disableGutters sx={{ mt: 1, boxShadow: 'none', border: 1, borderColor: 'divider', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandIcon />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
            <Typography variant="body2" color="text.secondary">
              Response Headers ({Object.keys(response.headers).length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {Object.entries(response.headers).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main', minWidth: 200, fontSize: '0.8rem' }}>
                    {key}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}
