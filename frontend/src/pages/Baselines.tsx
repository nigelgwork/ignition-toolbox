/**
 * Baselines Page - Manage visual testing screenshot baselines
 *
 * Features:
 * - View all baselines with status indicators
 * - Approve/reject pending baselines
 * - View comparison history
 * - Set ignore regions
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

// Baseline status colors
const STATUS_COLORS: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

interface Baseline {
  id: number;
  name: string;
  playbook_path: string | null;
  step_id: string | null;
  version: number;
  screenshot_path: string;
  width: number | null;
  height: number | null;
  status: string;
  ignore_regions: Array<{ x: number; y: number; width: number; height: number }> | null;
  created_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  description: string | null;
}

interface ComparisonResult {
  id: number;
  execution_id: number | null;
  baseline_id: number;
  current_screenshot_path: string;
  diff_image_path: string | null;
  similarity_score: number;
  threshold: number;
  passed: boolean;
  diff_pixel_count: number | null;
  total_pixels: number | null;
  created_at: string | null;
}

export function Baselines() {
  const queryClient = useQueryClient();
  const [selectedBaseline, setSelectedBaseline] = useState<Baseline | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [tab, setTab] = useState(0);

  // Fetch baselines
  const { data: baselines = [], isLoading, error, refetch } = useQuery<Baseline[]>({
    queryKey: ['baselines'],
    queryFn: () => api.baselines.list(),
    refetchInterval: 30000,
  });

  // Fetch comparison history for selected baseline
  const { data: comparisonHistory = [] } = useQuery<ComparisonResult[]>({
    queryKey: ['baseline-history', selectedBaseline?.id],
    queryFn: () => api.baselines.getComparisonHistory({ baseline_id: selectedBaseline?.id }),
    enabled: historyDialogOpen && !!selectedBaseline,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (baselineId: number) => api.baselines.approve(baselineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (baselineId: number) => api.baselines.reject(baselineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (baselineId: number) => api.baselines.delete(baselineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines'] });
    },
  });

  const handleViewHistory = (baseline: Baseline) => {
    setSelectedBaseline(baseline);
    setHistoryDialogOpen(true);
  };

  // Group baselines by status
  const pendingBaselines = baselines.filter(b => b.status === 'pending');
  const approvedBaselines = baselines.filter(b => b.status === 'approved');
  const rejectedBaselines = baselines.filter(b => b.status === 'rejected');

  const getFilteredBaselines = () => {
    switch (tab) {
      case 0: return baselines;
      case 1: return pendingBaselines;
      case 2: return approvedBaselines;
      case 3: return rejectedBaselines;
      default: return baselines;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5">Visual Testing Baselines</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage screenshot baselines for visual regression testing
          </Typography>
        </Box>
        <Tooltip title="Refresh baselines">
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Status tabs */}
      <Tabs
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab label={`All (${baselines.length})`} />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Pending
              {pendingBaselines.length > 0 && (
                <Chip label={pendingBaselines.length} size="small" color="warning" />
              )}
            </Box>
          }
        />
        <Tab label={`Approved (${approvedBaselines.length})`} />
        <Tab label={`Rejected (${rejectedBaselines.length})`} />
      </Tabs>

      {/* Loading state */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load baselines: {(error as Error).message}
        </Alert>
      )}

      {/* Empty state */}
      {!isLoading && !error && baselines.length === 0 && (
        <Alert severity="info">
          No baselines found. Create baselines by using the browser.compare_screenshot step type
          or by uploading screenshots via the API.
        </Alert>
      )}

      {/* Baselines grid */}
      {!isLoading && !error && getFilteredBaselines().length > 0 && (
        <Grid container spacing={2}>
          {getFilteredBaselines().map((baseline) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={baseline.id}>
              <Card
                elevation={2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderLeft: 4,
                  borderLeftColor: STATUS_COLORS[baseline.status] === 'success' ? 'success.main' :
                                   STATUS_COLORS[baseline.status] === 'warning' ? 'warning.main' :
                                   STATUS_COLORS[baseline.status] === 'error' ? 'error.main' : 'grey.500',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" noWrap sx={{ flex: 1 }}>
                      {baseline.name}
                    </Typography>
                    <Chip
                      label={baseline.status}
                      size="small"
                      color={STATUS_COLORS[baseline.status]}
                    />
                  </Box>

                  {baseline.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {baseline.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    <Chip label={`v${baseline.version}`} size="small" variant="outlined" />
                    {baseline.width && baseline.height && (
                      <Chip label={`${baseline.width}x${baseline.height}`} size="small" variant="outlined" />
                    )}
                    {baseline.ignore_regions && baseline.ignore_regions.length > 0 && (
                      <Chip label={`${baseline.ignore_regions.length} ignore regions`} size="small" variant="outlined" />
                    )}
                  </Box>

                  {baseline.playbook_path && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Playbook: {baseline.playbook_path}
                    </Typography>
                  )}

                  <Typography variant="caption" color="text.secondary" display="block">
                    Created: {baseline.created_at ? new Date(baseline.created_at).toLocaleDateString() : 'Unknown'}
                  </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Box>
                    <Tooltip title="View comparison history">
                      <IconButton size="small" onClick={() => handleViewHistory(baseline)}>
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete baseline">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (window.confirm(`Delete baseline "${baseline.name}"?`)) {
                            deleteMutation.mutate(baseline.id);
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {baseline.status === 'pending' && (
                    <Box>
                      <Button
                        size="small"
                        color="success"
                        startIcon={<ApproveIcon />}
                        onClick={() => approveMutation.mutate(baseline.id)}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<RejectIcon />}
                        onClick={() => rejectMutation.mutate(baseline.id)}
                        disabled={rejectMutation.isPending}
                        sx={{ ml: 1 }}
                      >
                        Reject
                      </Button>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Comparison History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Comparison History: {selectedBaseline?.name}
        </DialogTitle>
        <DialogContent>
          {comparisonHistory.length === 0 ? (
            <Alert severity="info">
              No comparison history found for this baseline.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Similarity</TableCell>
                    <TableCell>Threshold</TableCell>
                    <TableCell>Diff Pixels</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comparisonHistory.map((comparison) => (
                    <TableRow key={comparison.id}>
                      <TableCell>
                        {comparison.created_at
                          ? new Date(comparison.created_at).toLocaleString()
                          : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={comparison.passed ? 'PASSED' : 'FAILED'}
                          size="small"
                          color={comparison.passed ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{comparison.similarity_score.toFixed(2)}%</TableCell>
                      <TableCell>{comparison.threshold.toFixed(2)}%</TableCell>
                      <TableCell>
                        {comparison.diff_pixel_count !== null
                          ? `${comparison.diff_pixel_count.toLocaleString()} / ${comparison.total_pixels?.toLocaleString()}`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
