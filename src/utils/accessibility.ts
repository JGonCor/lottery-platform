// Accessibility utilities for WCAG 2.1 AA compliance

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = [];
  private static currentFocusTrap: HTMLElement | null = null;

  // Trap focus within a container (for modals, dropdowns)
  static trapFocus(container: HTMLElement): void {
    this.currentFocusTrap = container;
    
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      // Shift + Tab
      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      }
      // Tab
      else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.releaseFocus();
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);
    
    // Store cleanup function
    (container as any)._focusTrapCleanup = () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
    };

    // Focus first element
    firstFocusable.focus();
  }

  // Release focus trap
  static releaseFocus(): void {
    if (this.currentFocusTrap) {
      const cleanup = (this.currentFocusTrap as any)._focusTrapCleanup;
      if (cleanup) cleanup();
      
      this.currentFocusTrap = null;
      
      // Return focus to previously focused element
      const previousElement = this.focusStack.pop();
      if (previousElement) {
        previousElement.focus();
      }
    }
  }

  // Store current focus before opening modal/dropdown
  static storeFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }

  // Get all focusable elements within a container
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      'area[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    
    return elements.filter(element => {
      // Check if element is visible
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             element.offsetParent !== null;
    });
  }

  // Move focus to next/previous focusable element
  static moveFocus(direction: 'next' | 'previous'): void {
    const focusableElements = this.getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1) return;

    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % focusableElements.length;
    } else {
      nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    }

    focusableElements[nextIndex].focus();
  }
}

// Keyboard navigation utilities
export class KeyboardNavigation {
  // Handle arrow key navigation for lists/grids
  static handleArrowNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    orientation: 'horizontal' | 'vertical' | 'grid' = 'vertical',
    columnsCount?: number
  ): number {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'grid') {
          event.preventDefault();
          if (orientation === 'grid' && columnsCount) {
            newIndex = Math.max(0, currentIndex - columnsCount);
          } else {
            newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          }
        }
        break;

      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'grid') {
          event.preventDefault();
          if (orientation === 'grid' && columnsCount) {
            newIndex = Math.min(items.length - 1, currentIndex + columnsCount);
          } else {
            newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          }
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'grid') {
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'grid') {
          event.preventDefault();
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        }
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
    }

    return newIndex;
  }

  // Handle space/enter key activation
  static handleActivation(event: KeyboardEvent, callback: () => void): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  }
}

// Screen reader utilities
export class ScreenReaderUtilities {
  // Announce message to screen readers
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;

    document.body.appendChild(announcer);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }

  // Create visually hidden but screen reader accessible text
  static createScreenReaderOnlyText(text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    return span;
  }

  // Update live region content
  static updateLiveRegion(id: string, message: string): void {
    const liveRegion = document.getElementById(id);
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }
}

// Color contrast utilities
export class ColorContrast {
  // Calculate relative luminance
  static getRelativeLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Calculate contrast ratio between two colors
  static getContrastRatio(color1: string, color2: string): number {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Check if color combination meets WCAG AA standards
  static meetsWCAGAA(foreground: string, background: string): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= 4.5; // WCAG AA requirement for normal text
  }

  // Check if color combination meets WCAG AAA standards
  static meetsWCAGAAA(foreground: string, background: string): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= 7; // WCAG AAA requirement for normal text
  }

  // Convert hex to RGB
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}

// ARIA utilities
export class AriaUtilities {
  // Generate unique IDs for ARIA relationships
  static generateId(prefix: string = 'aria'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set up describedby relationship
  static setDescribedBy(element: HTMLElement, descriptionId: string): void {
    const existingIds = element.getAttribute('aria-describedby') || '';
    const ids = existingIds.split(' ').filter(id => id.length > 0);
    
    if (!ids.includes(descriptionId)) {
      ids.push(descriptionId);
      element.setAttribute('aria-describedby', ids.join(' '));
    }
  }

  // Remove describedby relationship
  static removeDescribedBy(element: HTMLElement, descriptionId: string): void {
    const existingIds = element.getAttribute('aria-describedby') || '';
    const ids = existingIds.split(' ').filter(id => id !== descriptionId);
    
    if (ids.length > 0) {
      element.setAttribute('aria-describedby', ids.join(' '));
    } else {
      element.removeAttribute('aria-describedby');
    }
  }

  // Set up labelledby relationship
  static setLabelledBy(element: HTMLElement, labelId: string): void {
    element.setAttribute('aria-labelledby', labelId);
  }

  // Update element's aria-expanded state
  static setExpanded(element: HTMLElement, expanded: boolean): void {
    element.setAttribute('aria-expanded', expanded.toString());
  }

  // Update element's aria-selected state
  static setSelected(element: HTMLElement, selected: boolean): void {
    element.setAttribute('aria-selected', selected.toString());
  }

  // Update element's aria-pressed state (for toggle buttons)
  static setPressed(element: HTMLElement, pressed: boolean): void {
    element.setAttribute('aria-pressed', pressed.toString());
  }

  // Update element's aria-checked state
  static setChecked(element: HTMLElement, checked: boolean | 'mixed'): void {
    element.setAttribute('aria-checked', checked.toString());
  }

  // Update element's aria-disabled state
  static setDisabled(element: HTMLElement, disabled: boolean): void {
    element.setAttribute('aria-disabled', disabled.toString());
  }

  // Update element's aria-hidden state
  static setHidden(element: HTMLElement, hidden: boolean): void {
    element.setAttribute('aria-hidden', hidden.toString());
  }

  // Update element's aria-busy state
  static setBusy(element: HTMLElement, busy: boolean): void {
    element.setAttribute('aria-busy', busy.toString());
  }

  // Update element's aria-invalid state
  static setInvalid(element: HTMLElement, invalid: boolean | 'grammar' | 'spelling'): void {
    element.setAttribute('aria-invalid', invalid.toString());
  }

  // Set up aria-controls relationship
  static setControls(element: HTMLElement, controlsId: string): void {
    element.setAttribute('aria-controls', controlsId);
  }

  // Set up aria-owns relationship
  static setOwns(element: HTMLElement, ownsId: string): void {
    element.setAttribute('aria-owns', ownsId);
  }
}

// Form accessibility utilities
export class FormAccessibility {
  // Associate label with form control
  static associateLabel(input: HTMLElement, label: HTMLElement): void {
    const inputId = input.id || AriaUtilities.generateId('input');
    input.id = inputId;
    label.setAttribute('for', inputId);
  }

  // Add error message to form control
  static addErrorMessage(input: HTMLElement, errorElement: HTMLElement): void {
    const errorId = errorElement.id || AriaUtilities.generateId('error');
    errorElement.id = errorId;
    
    AriaUtilities.setDescribedBy(input, errorId);
    AriaUtilities.setInvalid(input, true);
    
    // Add error role if not present
    if (!errorElement.getAttribute('role')) {
      errorElement.setAttribute('role', 'alert');
    }
  }

  // Remove error message from form control
  static removeErrorMessage(input: HTMLElement, errorElement: HTMLElement): void {
    if (errorElement.id) {
      AriaUtilities.removeDescribedBy(input, errorElement.id);
    }
    AriaUtilities.setInvalid(input, false);
  }

  // Add help text to form control
  static addHelpText(input: HTMLElement, helpElement: HTMLElement): void {
    const helpId = helpElement.id || AriaUtilities.generateId('help');
    helpElement.id = helpId;
    
    AriaUtilities.setDescribedBy(input, helpId);
  }

  // Mark required fields
  static markRequired(input: HTMLElement, required: boolean = true): void {
    if (required) {
      input.setAttribute('required', '');
      input.setAttribute('aria-required', 'true');
    } else {
      input.removeAttribute('required');
      input.removeAttribute('aria-required');
    }
  }
}

// Animation and motion utilities for accessibility
export class MotionAccessibility {
  // Check if user prefers reduced motion
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Respect motion preferences for animations
  static respectMotionPreference(
    element: HTMLElement,
    normalAnimation: string,
    reducedAnimation?: string
  ): void {
    if (this.prefersReducedMotion()) {
      element.style.animation = reducedAnimation || 'none';
    } else {
      element.style.animation = normalAnimation;
    }
  }

  // Create reduced motion CSS
  static createReducedMotionCSS(): string {
    return `
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;
  }
}

// Export all utilities
export {
  FocusManager,
  KeyboardNavigation,
  ScreenReaderUtilities,
  ColorContrast,
  AriaUtilities,
  FormAccessibility,
  MotionAccessibility,
};

// Create global CSS for screen reader only content
export const screenReaderOnlyCSS = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  .sr-only:focus {
    position: static;
    width: auto;
    height: auto;
    padding: inherit;
    margin: inherit;
    overflow: visible;
    clip: auto;
    white-space: inherit;
  }
`;

// Accessibility testing utilities
export class AccessibilityTesting {
  // Basic accessibility audit
  static auditPage(): { issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for missing alt text on images
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.getAttribute('alt')) {
        issues.push(`Image ${index + 1} is missing alt text`);
      }
    });

    // Check for form controls without labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
      const id = input.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push(`Form control ${index + 1} has no accessible label`);
      }
    });

    // Check for buttons without accessible names
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const hasText = button.textContent?.trim();
      const hasAriaLabel = button.getAttribute('aria-label');
      const hasAriaLabelledBy = button.getAttribute('aria-labelledby');
      
      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push(`Button ${index + 1} has no accessible name`);
      }
    });

    // Check for missing page title
    if (!document.title || document.title.trim() === '') {
      issues.push('Page is missing a title');
    }

    // Check for missing main landmark
    if (!document.querySelector('main, [role="main"]')) {
      warnings.push('Page is missing a main landmark');
    }

    return { issues, warnings };
  }

  // Log accessibility audit results
  static logAuditResults(): void {
    const results = this.auditPage();
    
    if (results.issues.length > 0) {
      console.group('🚨 Accessibility Issues');
      results.issues.forEach(issue => console.error(issue));
      console.groupEnd();
    }

    if (results.warnings.length > 0) {
      console.group('⚠️ Accessibility Warnings');
      results.warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }

    if (results.issues.length === 0 && results.warnings.length === 0) {
      console.log('✅ No accessibility issues found in basic audit');
    }
  }
}