/**
 * Tests for logger utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from './logger';

describe('createLogger', () => {
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  it('creates a logger with the given scope', () => {
    const logger = createLogger('TestScope');
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('prefixes messages with the scope', () => {
    const logger = createLogger('MyComponent');
    logger.info('test message');

    expect(console.info).toHaveBeenCalledWith('[MyComponent]', 'test message');
  });

  it('passes multiple arguments to console methods', () => {
    const logger = createLogger('Test');
    logger.warn('message', { data: 123 }, 'extra');

    expect(console.warn).toHaveBeenCalledWith('[Test]', 'message', { data: 123 }, 'extra');
  });

  it('error method always logs', () => {
    const logger = createLogger('ErrorTest');
    logger.error('critical error');

    expect(console.error).toHaveBeenCalledWith('[ErrorTest]', 'critical error');
  });

  it('warn method always logs', () => {
    const logger = createLogger('WarnTest');
    logger.warn('warning message');

    expect(console.warn).toHaveBeenCalledWith('[WarnTest]', 'warning message');
  });
});
