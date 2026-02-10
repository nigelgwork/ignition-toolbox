/**
 * Documentation card for a single API endpoint.
 * Shows method badge, path, description, parameters, notes, and a "Try This" button.
 */

import {
  Box,
  Chip,
  Typography,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Send as TryIcon } from '@mui/icons-material';
import type { ApiEndpointDoc } from '../../data/ignitionApiDocs';

function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return '#4caf50';
    case 'POST': return '#2196f3';
    case 'PUT': return '#ff9800';
    case 'DELETE': return '#f44336';
    case 'PATCH': return '#9c27b0';
    default: return '#757575';
  }
}

interface DocumentationCardProps {
  endpoint: ApiEndpointDoc;
  /** Callback when user clicks "Try This" */
  onTryThis?: (method: string, path: string, body?: string) => void;
  /** Whether the Try This button should be shown */
  showTryThis?: boolean;
}

export function DocumentationCard({ endpoint, onTryThis, showTryThis = true }: DocumentationCardProps) {
  const handleTry = () => {
    const body = endpoint.example?.body ? JSON.stringify(endpoint.example.body, null, 2) : undefined;
    onTryThis?.(endpoint.method, endpoint.path, body);
  };

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Chip
          label={endpoint.method}
          size="small"
          sx={{
            fontWeight: 'bold',
            fontFamily: 'monospace',
            bgcolor: getMethodColor(endpoint.method),
            color: '#fff',
            minWidth: 60,
          }}
        />
        <Typography
          variant="body2"
          fontFamily="monospace"
          sx={{ wordBreak: 'break-all', flex: 1 }}
        >
          {endpoint.path}
        </Typography>
        {showTryThis && onTryThis && (
          <Button
            size="small"
            variant="text"
            startIcon={<TryIcon />}
            onClick={handleTry}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'none' }}
          >
            Try This
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
        {endpoint.description}
      </Typography>

      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <Table size="small" sx={{ mt: 1, ml: 0.5, maxWidth: 600 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ py: 0.25, fontWeight: 'bold', fontSize: '0.7rem' }}>Parameter</TableCell>
              <TableCell sx={{ py: 0.25, fontWeight: 'bold', fontSize: '0.7rem' }}>Type</TableCell>
              <TableCell sx={{ py: 0.25, fontWeight: 'bold', fontSize: '0.7rem' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {endpoint.parameters.map((param) => (
              <TableRow key={param.name}>
                <TableCell sx={{ py: 0.25, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {param.name}
                  {param.required && (
                    <Chip label="req" size="small" color="error" variant="outlined" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} />
                  )}
                </TableCell>
                <TableCell sx={{ py: 0.25, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {param.type}
                </TableCell>
                <TableCell sx={{ py: 0.25, fontSize: '0.75rem' }}>
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
    </Box>
  );
}
