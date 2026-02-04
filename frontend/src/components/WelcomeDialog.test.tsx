/**
 * Tests for WelcomeDialog component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeDialog, resetWelcomeDialog } from './WelcomeDialog';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('WelcomeDialog', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('shows dialog on first visit', () => {
    localStorageMock.getItem.mockReturnValue(null);
    render(<WelcomeDialog />);

    expect(screen.getByText('Welcome to Ignition Toolbox')).toBeInTheDocument();
  });

  it('does not show dialog if previously dismissed', () => {
    localStorageMock.getItem.mockReturnValue('true');
    render(<WelcomeDialog />);

    expect(screen.queryByText('Welcome to Ignition Toolbox')).not.toBeInTheDocument();
  });

  it('closes and saves to localStorage when Get Started is clicked', () => {
    localStorageMock.getItem.mockReturnValue(null);
    render(<WelcomeDialog />);

    const button = screen.getByRole('button', { name: /get started/i });
    fireEvent.click(button);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'ignition-toolbox-welcome-dismissed',
      'true'
    );
  });

  it('displays quick start guide items', () => {
    localStorageMock.getItem.mockReturnValue(null);
    render(<WelcomeDialog />);

    expect(screen.getByText('Add Credentials')).toBeInTheDocument();
    expect(screen.getByText('Run a Playbook')).toBeInTheDocument();
    expect(screen.getByText('Debug Mode')).toBeInTheDocument();
    expect(screen.getByText('Customize Playbooks')).toBeInTheDocument();
  });

  it('displays help text', () => {
    localStorageMock.getItem.mockReturnValue(null);
    render(<WelcomeDialog />);

    expect(screen.getByText(/need help/i)).toBeInTheDocument();
  });
});

describe('resetWelcomeDialog', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('removes the dismissed flag from localStorage', () => {
    resetWelcomeDialog();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      'ignition-toolbox-welcome-dismissed'
    );
  });
});
