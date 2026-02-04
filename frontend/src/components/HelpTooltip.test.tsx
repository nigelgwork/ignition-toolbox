/**
 * Tests for HelpTooltip component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelpTooltip } from './HelpTooltip';

describe('HelpTooltip', () => {
  it('renders help icon button', () => {
    render(<HelpTooltip content="Help text" />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByTestId('HelpOutlineIcon')).toBeInTheDocument();
  });

  it('uses small size by default', () => {
    render(<HelpTooltip content="Help text" />);

    const button = screen.getByRole('button');
    // Small buttons have specific MUI classes
    expect(button).toHaveClass('MuiIconButton-sizeSmall');
  });

  it('uses medium size when specified', () => {
    render(<HelpTooltip content="Help text" size="medium" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('MuiIconButton-sizeMedium');
  });

  it('renders with string content', () => {
    render(<HelpTooltip content="This is help text" />);

    // The component should render without errors
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with ReactNode content', () => {
    render(
      <HelpTooltip
        content={
          <div>
            <strong>Help Title</strong>
            <p>Help description</p>
          </div>
        }
      />
    );

    // The component should render without errors
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has accessible icon button', () => {
    render(<HelpTooltip content="Accessibility help" />);

    const button = screen.getByRole('button');
    // Button should be focusable
    expect(button).not.toHaveAttribute('tabindex', '-1');
  });
});
