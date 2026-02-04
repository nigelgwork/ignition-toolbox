/**
 * ErrorMessage - Display errors with optional recovery hints
 *
 * Provides consistent error display throughout the app with:
 * - Error message
 * - Recovery hint (suggestion for resolving the error)
 * - Optional retry button
 */

import { Box, Alert, AlertTitle, Typography, Button } from '@mui/material';
import { Refresh as RetryIcon, Info as HintIcon } from '@mui/icons-material';

interface ErrorMessageProps {
  /** The error to display - can be Error, string, or APIError with recovery hint */
  error: Error | string | { message: string; recoveryHint?: string };
  /** Optional title for the error (defaults to "Error") */
  title?: string;
  /** Error severity level */
  severity?: 'error' | 'warning' | 'info';
  /** Callback for retry button (if provided, shows retry button) */
  onRetry?: () => void;
  /** Label for retry button */
  retryLabel?: string;
  /** Whether the error is compact (inline) or full-width */
  compact?: boolean;
}

/**
 * Extract message and recovery hint from various error types
 */
function extractErrorInfo(error: ErrorMessageProps['error']): {
  message: string;
  recoveryHint?: string;
} {
  if (typeof error === 'string') {
    return { message: error };
  }

  if (error instanceof Error) {
    // Check for APIError with recovery hint
    const apiError = error as Error & { recoveryHint?: string };
    return {
      message: error.message,
      recoveryHint: apiError.recoveryHint,
    };
  }

  // Object with message and optional recoveryHint
  return {
    message: error.message,
    recoveryHint: error.recoveryHint,
  };
}

export function ErrorMessage({
  error,
  title = 'Error',
  severity = 'error',
  onRetry,
  retryLabel = 'Try Again',
  compact = false,
}: ErrorMessageProps) {
  const { message, recoveryHint } = extractErrorInfo(error);

  if (compact) {
    return (
      <Alert
        severity={severity}
        sx={{ '& .MuiAlert-message': { width: '100%' } }}
        action={
          onRetry && (
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              startIcon={<RetryIcon />}
            >
              {retryLabel}
            </Button>
          )
        }
      >
        <Typography variant="body2">{message}</Typography>
        {recoveryHint && (
          <Typography
            variant="caption"
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 0.5,
              mt: 0.5,
              color: 'inherit',
              opacity: 0.9,
            }}
          >
            <HintIcon sx={{ fontSize: '0.875rem', mt: '1px' }} />
            {recoveryHint}
          </Typography>
        )}
      </Alert>
    );
  }

  return (
    <Alert
      severity={severity}
      sx={{ '& .MuiAlert-message': { width: '100%' } }}
    >
      <AlertTitle>{title}</AlertTitle>
      <Typography variant="body2" sx={{ mb: recoveryHint || onRetry ? 1 : 0 }}>
        {message}
      </Typography>

      {recoveryHint && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            p: 1,
            mt: 1,
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: 1,
            border: '1px solid',
            borderColor: severity === 'error' ? 'error.dark' : 'warning.dark',
          }}
        >
          <HintIcon
            sx={{
              fontSize: '1rem',
              mt: '2px',
              color: severity === 'error' ? 'error.light' : 'warning.light',
            }}
          />
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 'bold',
                color: severity === 'error' ? 'error.light' : 'warning.light',
              }}
            >
              Suggestion:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'inherit',
                opacity: 0.9,
                fontSize: '0.8125rem',
              }}
            >
              {recoveryHint}
            </Typography>
          </Box>
        </Box>
      )}

      {onRetry && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onRetry}
            startIcon={<RetryIcon />}
            color={severity === 'error' ? 'error' : 'warning'}
          >
            {retryLabel}
          </Button>
        </Box>
      )}
    </Alert>
  );
}

/**
 * Helper function to format error with recovery hint for display in snackbar/toast
 */
export function formatErrorMessage(error: Error | string): string {
  const { message, recoveryHint } = extractErrorInfo(error);
  if (recoveryHint) {
    return `${message} — ${recoveryHint}`;
  }
  return message;
}
