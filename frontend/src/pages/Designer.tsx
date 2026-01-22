/**
 * Designer page - CloudDesigner integration + Designer playbooks
 *
 * Provides browser-based Ignition Designer access via Docker/Guacamole
 * along with Designer-specific playbooks.
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  OpenInNew as OpenIcon,
  CheckCircle as RunningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useStore } from '../store';
import { Playbooks } from './Playbooks';
import type { DockerStatus, CloudDesignerStatus } from '../types/api';

export function Designer() {
  const queryClient = useQueryClient();
  const selectedCredential = useStore((state) => state.selectedCredential);
  const [startError, setStartError] = useState<string | null>(null);

  // Query Docker status
  const {
    data: dockerStatus,
    isLoading: dockerLoading,
    error: dockerError,
  } = useQuery<DockerStatus>({
    queryKey: ['clouddesigner-docker'],
    queryFn: api.cloudDesigner.getDockerStatus,
    refetchInterval: 30000, // Check every 30s
  });

  // Query container status
  const {
    data: containerStatus,
    isLoading: containerLoading,
  } = useQuery<CloudDesignerStatus>({
    queryKey: ['clouddesigner-status'],
    queryFn: api.cloudDesigner.getStatus,
    refetchInterval: 5000, // Poll every 5s when running
    enabled: dockerStatus?.running === true,
  });

  // Start mutation
  const startMutation = useMutation({
    mutationFn: (gatewayUrl: string) => api.cloudDesigner.start(gatewayUrl),
    onSuccess: (data) => {
      if (!data.success) {
        setStartError(data.error || 'Failed to start CloudDesigner');
      } else {
        setStartError(null);
      }
      // Refresh status
      queryClient.invalidateQueries({ queryKey: ['clouddesigner-status'] });
    },
    onError: (error: Error) => {
      setStartError(error.message);
    },
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: () => api.cloudDesigner.stop(),
    onSuccess: () => {
      setStartError(null);
      // Refresh status
      queryClient.invalidateQueries({ queryKey: ['clouddesigner-status'] });
    },
    onError: (error: Error) => {
      setStartError(error.message);
    },
  });

  // Handle start button click
  const handleStart = () => {
    if (selectedCredential?.gateway_url) {
      setStartError(null);
      startMutation.mutate(selectedCredential.gateway_url);
    }
  };

  // Handle open designer window
  const handleOpenDesigner = () => {
    if (window.electronAPI?.cloudDesigner?.openWindow) {
      // Electron mode - open in popup window
      window.electronAPI.cloudDesigner.openWindow();
    } else {
      // Browser mode - open in new tab
      window.open('http://localhost:8080', '_blank');
    }
  };

  // Determine if container is running
  const isRunning = containerStatus?.status === 'running';
  const isStarting = startMutation.isPending;
  const isStopping = stopMutation.isPending;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* CloudDesigner Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Browser-Based Designer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Launch Ignition Designer in a Docker container accessible via your browser
            </Typography>
          </Box>

          {/* Status indicator */}
          {dockerStatus?.running && (
            <Chip
              icon={isRunning ? <RunningIcon /> : <InfoIcon />}
              label={isRunning ? 'Running' : containerStatus?.status || 'Stopped'}
              color={isRunning ? 'success' : 'default'}
              size="small"
            />
          )}
        </Box>

        {/* Loading state */}
        {(dockerLoading || containerLoading) && !dockerStatus && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Checking Docker status...
            </Typography>
          </Box>
        )}

        {/* Docker error */}
        {dockerError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to check Docker status: {(dockerError as Error).message}
          </Alert>
        )}

        {/* Docker not installed */}
        {dockerStatus && !dockerStatus.installed && (
          <Alert severity="warning" icon={<ErrorIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Docker is not installed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Install Docker Desktop to use the browser-based Designer.
              Visit <a href="https://www.docker.com/products/docker-desktop" target="_blank" rel="noopener noreferrer">docker.com</a> to download.
            </Typography>
          </Alert>
        )}

        {/* Docker not running */}
        {dockerStatus && dockerStatus.installed && !dockerStatus.running && (
          <Alert severity="warning" icon={<ErrorIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Docker is not running
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start Docker Desktop to use the browser-based Designer.
            </Typography>
          </Alert>
        )}

        {/* Docker running - show controls */}
        {dockerStatus?.running && (
          <Box>
            {/* Start error */}
            {startError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setStartError(null)}>
                {startError}
              </Alert>
            )}

            {/* No credential selected */}
            {!selectedCredential?.gateway_url && !isRunning && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Select a credential with a gateway URL from the header dropdown to start the Designer container.
              </Alert>
            )}

            {/* Control buttons */}
            <Stack direction="row" spacing={2} alignItems="center">
              {isRunning ? (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<OpenIcon />}
                    onClick={handleOpenDesigner}
                    size="large"
                  >
                    Open Designer
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={isStopping ? <CircularProgress size={16} /> : <StopIcon />}
                    onClick={() => stopMutation.mutate()}
                    disabled={isStopping}
                    size="large"
                  >
                    {isStopping ? 'Stopping...' : 'Stop Container'}
                  </Button>
                  {selectedCredential?.gateway_url && (
                    <Typography variant="body2" color="text.secondary">
                      Connected to: {selectedCredential.gateway_url}
                    </Typography>
                  )}
                </>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isStarting ? <CircularProgress size={16} color="inherit" /> : <StartIcon />}
                  onClick={handleStart}
                  disabled={!selectedCredential?.gateway_url || isStarting}
                  size="large"
                >
                  {isStarting ? 'Starting Container...' : 'Start Designer Container'}
                </Button>
              )}
            </Stack>

            {/* Docker version info */}
            {dockerStatus.version && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                {dockerStatus.version}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      <Divider />

      {/* Designer Playbooks Section */}
      <Playbooks domainFilter="designer" />
    </Box>
  );
}
