import { useEffect } from 'react';

// Keyboard navigation hook for accessibility
export const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Skip navigation for form inputs and contenteditable elements
      const target = event.target;
      const isFormElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                           target.contentEditable === 'true' ||
                           target.getAttribute('role') === 'textbox';

      if (isFormElement) return;

      // Handle Tab navigation for focus management
      if (event.key === 'Tab') {
        // Focus management is handled by browser, but we can enhance it
        const focusedElement = document.activeElement;

        // Add visual focus indicators
        if (focusedElement) {
          focusedElement.style.outline = '2px solid #3b82f6';
          focusedElement.style.outlineOffset = '2px';

          // Remove outline from previously focused elements
          setTimeout(() => {
            const allFocusable = document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            allFocusable.forEach(el => {
              if (el !== focusedElement) {
                el.style.outline = '';
                el.style.outlineOffset = '';
              }
            });
          }, 100);
        }
      }

      // Handle Escape key for modal/dialog dismissal
      if (event.key === 'Escape') {
        const openModal = document.querySelector('[role="dialog"][aria-modal="true"]');
        if (openModal) {
          const closeButton = openModal.querySelector('[aria-label="Close"], .close-button, [data-close]');
          if (closeButton) {
            closeButton.click();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};

// Focus trap hook for modals and dialogs
export const useFocusTrap = (containerRef, isActive = true) => {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        // Find and trigger close button
        const closeButton = container.querySelector('[aria-label="Close"], [data-close]');
        if (closeButton) {
          closeButton.click();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    // Focus first element when trap activates
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [containerRef, isActive]);
};

// Screen reader announcements hook
export const useScreenReader = () => {
  const announce = (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);
    announcement.textContent = message;

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return { announce };
};

// High contrast mode detection
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows High Contrast mode
      const testElement = document.createElement('div');
      testElement.style.color = 'rgb(31, 41, 55)'; // Tailwind gray-800
      testElement.style.backgroundColor = 'rgb(255, 255, 255)'; // white
      document.body.appendChild(testElement);

      const computedColor = getComputedStyle(testElement).color;
      const computedBg = getComputedStyle(testElement).backgroundColor;

      // If colors are overridden by high contrast mode, they'll be different
      const isHighContrast = computedColor !== 'rgb(31, 41, 55)' || computedBg !== 'rgb(255, 255, 255)';

      document.body.removeChild(testElement);
      setIsHighContrast(isHighContrast);
    };

    checkHighContrast();

    // Listen for changes (though rare)
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    mediaQuery.addEventListener('change', checkHighContrast);

    return () => mediaQuery.removeEventListener('change', checkHighContrast);
  }, []);

  return isHighContrast;
};
