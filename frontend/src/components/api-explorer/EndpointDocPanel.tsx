/**
 * Contextual endpoint documentation panel.
 * Appears above the request form in the Request Builder when a known endpoint is selected.
 */

import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Button,
} from '@mui/material';
import { PlayArrow as TryIcon } from '@mui/icons-material';
import type { ApiEndpointDoc, ApiCategoryDoc } from '../../data/ignitionApiDocs';

interface EndpointDocPanelProps {
  /** Current request method */
  method: string;
  /** Current request path */
  path: string;
  /** Static docs */
  staticDocs: ApiCategoryDoc[];
  /** Parsed OpenAPI categories (takes precedence) */
  openApiDocs: ApiCategoryDoc[] | null;
  /** Callback to pre-fill the request with example data */
  onTryExample?: (body: string) => void;
}

function findEndpoint(
  method: string,
  path: string,
  docs: ApiCategoryDoc[],
): ApiEndpointDoc | null {
  for (const cat of docs) {
    for (const ep of cat.endpoints) {
      if (ep.path === path && ep.method.toUpperCase() === method.toUpperCase()) {
        return ep;
      }
    }
  }
  // Try path-only match (GET is most common)
  for (const cat of docs) {
    for (const ep of cat.endpoints) {
      if (ep.path === path) {
        return ep;
      }
    }
  }
  return null;
}

export function EndpointDocPanel({
  method,
  path,
  staticDocs,
  openApiDocs,
  onTryExample,
}: EndpointDocPanelProps) {
  // Try OpenAPI first, then static
  const endpoint = (openApiDocs && findEndpoint(method, path, openApiDocs)) || findEndpoint(method, path, staticDocs);

  if (!endpoint) return null;

  const hasExample = endpoint.example?.body;

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2,
        p: 1.5,
        borderLeft: 4,
        borderLeftColor: 'primary.main',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {endpoint.description}
          </Typography>
        </Box>
        {hasExample && onTryExample && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<TryIcon />}
            onClick={() => onTryExample(JSON.stringify(endpoint.example!.body, null, 2))}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Try Example
          </Button>
        )}
      </Box>

      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>Parameter</TableCell>
              <TableCell sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>Type</TableCell>
              <TableCell sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {endpoint.parameters.map((param) => (
              <TableRow key={param.name}>
                <TableCell sx={{ py: 0.25, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {param.name}
                  {param.required && (
                    <Chip label="required" size="small" color="error" variant="outlined" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />
                  )}
                </TableCell>
                <TableCell sx={{ py: 0.25, fontSize: '0.8rem', color: 'text.secondary' }}>
                  {param.type}
                </TableCell>
                <TableCell sx={{ py: 0.25, fontSize: '0.8rem' }}>
                  {param.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {endpoint.notes && (
        <Alert severity="info" variant="outlined" sx={{ mt: 1, py: 0, '& .MuiAlert-message': { py: 0.5 } }}>
          <Typography variant="caption">{endpoint.notes}</Typography>
        </Alert>
      )}
    </Paper>
  );
}
