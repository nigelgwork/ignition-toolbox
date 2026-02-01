/**
 * FloatingChatButton - Floating action button with chat drawer
 *
 * Provides quick access to Clawdbot from any page in the application.
 */

import { useState } from 'react';
import {
  Fab,
  Drawer,
  Box,
  IconButton,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  SmartToy as BotIcon,
  Close as CloseIcon,
  OpenInFull as ExpandIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ChatPanel } from './ChatPanel';
import { useClaudeCode } from '../../hooks/useClaudeCode';

interface FloatingChatButtonProps {
  /** Hide the button (e.g., on the Chat page) */
  hidden?: boolean;
}

/**
 * Floating chat button with drawer
 */
export function FloatingChatButton({ hidden = false }: FloatingChatButtonProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isAvailable, isCheckingAvailability } = useClaudeCode();
  const navigate = useNavigate();

  // Don't render if hidden
  if (hidden) {
    return null;
  }

  const handleOpenDrawer = () => {
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  const handleExpandToFullPage = () => {
    setDrawerOpen(false);
    navigate('/?tab=chat');
  };

  // Tooltip text based on availability
  const getTooltipText = () => {
    if (isCheckingAvailability) {
      return 'Checking Claude Code availability...';
    }
    if (!isAvailable) {
      return 'Install Claude Code for AI features';
    }
    return 'Chat with Clawdbot';
  };

  return (
    <>
      {/* Floating Action Button */}
      <Tooltip title={getTooltipText()} placement="left">
        <Fab
          color="primary"
          aria-label="open chat"
          onClick={handleOpenDrawer}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            // Subtle pulse animation when available
            ...(isAvailable && {
              animation: 'pulse-subtle 3s ease-in-out infinite',
              '@keyframes pulse-subtle': {
                '0%, 100%': { boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)' },
                '50%': { boxShadow: '0 4px 30px rgba(59, 130, 246, 0.5)' },
              },
            }),
            // Dimmed when not available
            ...(!isAvailable && !isCheckingAvailability && {
              opacity: 0.6,
              '&:hover': {
                opacity: 0.8,
              },
            }),
          }}
        >
          <BotIcon />
        </Fab>
      </Tooltip>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
            maxWidth: '100vw',
          },
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BotIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="subtitle1" fontWeight="medium" sx={{ lineHeight: 1.2 }}>
                Clawdbot
              </Typography>
              <Typography variant="caption" color="text.secondary">
                AI Assistant
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Open full chat page">
              <IconButton size="small" onClick={handleExpandToFullPage}>
                <ExpandIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={handleCloseDrawer}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Chat Panel */}
        <Box sx={{ flex: 1, height: 'calc(100vh - 72px)' }}>
          <ChatPanel height="100%" showClearButton compact />
        </Box>
      </Drawer>
    </>
  );
}
