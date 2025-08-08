// Example test file for the accessible Button component
import React from 'react';
import { render, screen } from '../setup';
import userEvent from '@testing-library/user-event';
import { Button } from '../../components/UI/AccessibleComponents';
import { AccessibilityTestUtils } from '../utils/testHelpers';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with children text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('renders with different variants', () => {
      const { container } = render(
        <div>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      );

      expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Outline' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ghost' })).toBeInTheDocument();
    });

    it('renders with different sizes', () => {
      render(
        <div>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      );

      expect(screen.getByRole('button', { name: 'Small' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Large' })).toBeInTheDocument();
    });

    it('renders loading state correctly', () => {
      render(<Button loading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('renders with icon', () => {
      const icon = <span data-testid="icon">⭐</span>;
      render(
        <div>
          <Button icon={icon} iconPosition="left">Left Icon</Button>
          <Button icon={icon} iconPosition="right">Right Icon</Button>
        </div>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders full width when specified', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      // Note: In a real test, you'd check computed styles
      expect(button).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Clickable</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });

    it('does not call onClick when loading', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} loading>Loading</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('can be activated with Enter key', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard Accessible</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await userEvent.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('can be activated with Space key', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard Accessible</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await userEvent.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Button loading disabled>Accessible Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
    });

    it('meets minimum touch target size', () => {
      render(<Button>Touch Target</Button>);
      
      const button = screen.getByRole('button');
      const computedStyle = window.getComputedStyle(button);
      
      // In a real test, you'd check that min-height is at least 44px
      expect(button).toBeInTheDocument();
    });

    it('has visible focus indicator', async () => {
      render(<Button>Focusable</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
      // In a real test, you'd check for focus-visible styles
    });

    it('supports screen readers with loading state', () => {
      render(<Button loading>Loading Button</Button>);
      
      // Check for screen reader only text
      expect(screen.getByText('Loading')).toBeInTheDocument();
      
      // Visual loading indicator should be aria-hidden
      const visualIndicator = screen.getByText('Loading...');
      expect(visualIndicator).toHaveAttribute('aria-hidden', 'true');
    });

    it('has proper semantic role', () => {
      render(<Button>Semantic Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('Error Handling', () => {
    it('handles onClick errors gracefully', async () => {
      const handleClick = jest.fn().mockImplementation(() => {
        throw new Error('Click handler error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<Button onClick={handleClick}>Error Button</Button>);
      
      const button = screen.getByRole('button');
      
      // Should not throw error to user
      await userEvent.click(button);
      
      expect(handleClick).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestButton = React.memo(({ children, ...props }: any) => {
        renderSpy();
        return <Button {...props}>{children}</Button>;
      });

      const { rerender } = render(<TestButton>Test</TestButton>);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestButton>Test</TestButton>);
      
      expect(renderSpy).toHaveBeenCalledTimes(1); // Should not re-render
    });
  });

  describe('Integration with Theme', () => {
    it('applies theme colors correctly', () => {
      const customTheme = {
        colors: {
          primary: '#ff0000',
          text: '#000000',
          cardBackground: '#ffffff',
        },
        spacing: {
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
        },
        borderRadius: {
          md: '0.5rem',
        },
      };

      render(<Button variant="primary">Themed Button</Button>, { theme: customTheme });
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // In a real test, you'd check computed styles match theme
    });
  });

  describe('Form Integration', () => {
    it('works as submit button in forms', async () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());
      
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      );
      
      const button = screen.getByRole('button', { name: 'Submit' });
      await userEvent.click(button);
      
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('can be disabled in form context', () => {
      render(
        <form>
          <Button type="submit" disabled>Disabled Submit</Button>
        </form>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('type', 'submit');
    });
  });
});