/**
 * HelpTooltip component for contextual help throughout the app
 */

import { Tooltip, IconButton } from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  size?: 'small' | 'medium';
}

export function HelpTooltip({ content, size = 'small' }: HelpTooltipProps) {
  return (
    <Tooltip
      title={content}
      arrow
      placement="top"
      enterDelay={300}
      leaveDelay={200}
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: 300,
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            p: 1.5,
          },
        },
      }}
    >
      <IconButton
        size={size}
        sx={{
          ml: 0.5,
          p: 0.25,
          color: 'text.secondary',
          opacity: 0.7,
          '&:hover': {
            opacity: 1,
            color: 'primary.main',
            bgcolor: 'transparent',
          },
        }}
      >
        <HelpIcon fontSize={size} />
      </IconButton>
    </Tooltip>
  );
}
