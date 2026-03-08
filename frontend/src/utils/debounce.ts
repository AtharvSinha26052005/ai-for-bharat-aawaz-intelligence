/**
 * Debounce Utility
 * 
 * Creates a debounced function that delays invoking the provided function
 * until after the specified delay has elapsed since the last time it was invoked.
 * 
 * This is useful for performance optimization, particularly for:
 * - Search input handling
 * - Window resize events
 * - Scroll events
 * - Any high-frequency event that doesn't need immediate processing
 * 
 * Validates Requirement 12.1: Debounce search input by at least 300 milliseconds
 */

/**
 * Creates a debounced version of the provided function
 * 
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns A debounced version of the callback function
 * 
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching for:', query);
 * }, 300);
 * 
 * // This will only execute once after 300ms of no calls
 * debouncedSearch('test');
 * debouncedSearch('test2');
 * debouncedSearch('test3'); // Only this will execute
 */
export function debounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    // Clear any existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Set a new timeout
    timeoutId = setTimeout(() => {
      callback(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Creates a debounced version with a cancel method
 * Useful when you need to manually cancel pending debounced calls
 * 
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns An object with the debounced function and a cancel method
 * 
 * @example
 * const { debounced, cancel } = debounceWithCancel((query: string) => {
 *   console.log('Searching for:', query);
 * }, 300);
 * 
 * debounced('test');
 * cancel(); // Cancels the pending call
 */
export function debounceWithCancel<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): {
  debounced: (...args: Parameters<T>) => void;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = function (...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback(...args);
      timeoutId = null;
    }, delay);
  };

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { debounced, cancel };
}
