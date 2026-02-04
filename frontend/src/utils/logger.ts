/**
 * Frontend logging utility
 *
 * Provides controlled logging that can be disabled in production.
 * Use this instead of console.log for debug statements.
 */

const isDevelopment = import.meta.env.DEV;

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Create a scoped logger with a prefix
 *
 * @param scope - The scope/component name for log prefix
 * @returns Logger instance with debug, info, warn, error methods
 *
 * @example
 * const logger = createLogger('WebSocket');
 * logger.debug('Connected'); // [WebSocket] Connected
 */
export function createLogger(scope: string): Logger {
  const prefix = `[${scope}]`;

  return {
    debug: (...args: unknown[]) => {
      if (isDevelopment) {
        console.debug(prefix, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (isDevelopment) {
        console.info(prefix, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      // Warnings always shown
      console.warn(prefix, ...args);
    },
    error: (...args: unknown[]) => {
      // Errors always shown
      console.error(prefix, ...args);
    },
  };
}

/**
 * Global logger for general use
 */
export const logger = createLogger('App');

/**
 * Check if debug logging is enabled
 */
export function isDebugEnabled(): boolean {
  return isDevelopment;
}
