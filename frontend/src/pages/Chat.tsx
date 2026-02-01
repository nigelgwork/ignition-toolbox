/**
 * Chat Page - Full page chat interface for Clawdbot
 *
 * Provides a dedicated chat experience with context sidebar.
 */

import { Box, Paper, Typography, Chip, Divider, CircularProgress } from '@mui/material';
import {
  SmartToy as BotIcon,
  PlaylistPlay as PlaybooksIcon,
  History as HistoryIcon,
  Cloud as CloudIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useClaudeCode } from '../hooks/useClaudeCode';

/**
 * Status chip component
 */
function StatusChip({ status }: { status: string }) {
  const getStatusProps = () => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return { icon: <SuccessIcon />, color: 'success' as const };
      case 'failed':
      case 'error':
        return { icon: <ErrorIcon />, color: 'error' as const };
      case 'running':
        return { icon: <PendingIcon />, color: 'warning' as const };
      default:
        return { icon: <PendingIcon />, color: 'default' as const };
    }
  };

  const { icon, color } = getStatusProps();

  return (
    <Chip
      icon={icon}
      label={status}
      size="small"
      color={color}
      variant="outlined"
    />
  );
}

/**
 * Context sidebar showing project information
 */
function ContextSidebar() {
  const { context, isCheckingAvailability } = useClaudeCode();

  if (isCheckingAvailability) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Project Context
      </Typography>

      {/* Playbooks count */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PlaybooksIcon fontSize="small" color="primary" />
        <Typography variant="body2">
          {context?.playbookCount ?? 0} Playbooks
        </Typography>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Recent Executions */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <HistoryIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight="medium">
            Recent Executions
          </Typography>
        </Box>
        {context?.recentExecutions && context.recentExecutions.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 3 }}>
            {context.recentExecutions.map((exec, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 120,
                  }}
                >
                  {exec.name}
                </Typography>
                <StatusChip status={exec.status} />
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
            No recent executions
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* CloudDesigner Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudIcon fontSize="small" color="primary" />
        <Typography variant="body2">CloudDesigner:</Typography>
        <Chip
          label={context?.cloudDesignerStatus ?? 'unknown'}
          size="small"
          color={context?.cloudDesignerStatus === 'running' ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>
    </Box>
  );
}

/**
 * Quick action buttons for common tasks
 */
function QuickActions({ onAction }: { onAction: (prompt: string) => void }) {
  const actions = [
    { label: 'Debug Last Failure', prompt: 'Why did my last execution fail? How can I fix it?' },
    { label: 'List Playbooks', prompt: 'What playbooks are available and what do they do?' },
    { label: 'Help with Steps', prompt: 'What step types are available for playbooks?' },
  ];

  return (
    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Quick Actions
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {actions.map((action) => (
          <Chip
            key={action.label}
            label={action.label}
            size="small"
            onClick={() => onAction(action.prompt)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
    </Box>
  );
}

/**
 * Main Chat page component
 */
export function Chat() {
  const { sendMessage, isAvailable } = useClaudeCode();

  const handleQuickAction = (prompt: string) => {
    if (isAvailable) {
      sendMessage(prompt);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)', gap: 2 }}>
      {/* Main chat area */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <BotIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Clawdbot
            </Typography>
            <Typography variant="caption" color="text.secondary">
              AI Assistant for Ignition Toolbox
            </Typography>
          </Box>
        </Box>

        {/* Quick actions */}
        {isAvailable && <QuickActions onAction={handleQuickAction} />}

        {/* Chat panel */}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <ChatPanel height="100%" showClearButton />
        </Box>
      </Paper>

      {/* Context sidebar */}
      <Paper
        elevation={0}
        sx={{
          width: 280,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="subtitle1" fontWeight="medium">
            Context
          </Typography>
        </Box>
        <ContextSidebar />
      </Paper>
    </Box>
  );
}
