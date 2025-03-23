/**
 * Toast utility functions to ensure consistent behavior across the application
 */
import toast from 'react-hot-toast';
import type { Toast, ToastOptions } from 'react-hot-toast';
import type { ReactNode } from 'react';

// Default durations
const DURATION = {
  SHORT: 3000,
  NORMAL: 5000,
  LONG: 8000,
  INFINITE: Infinity
};

/**
 * Show a success toast with consistent styling and duration
 * @param message The message to display
 * @param options Optional toast options
 */
export const showSuccess = (message: string, options?: ToastOptions) => {
  return toast.success(message, {
    duration: DURATION.NORMAL,
    ...options
  });
};

/**
 * Show an error toast with consistent styling and duration
 * @param message The message to display
 * @param options Optional toast options
 */
export const showError = (message: string, options?: ToastOptions) => {
  return toast.error(message, {
    duration: DURATION.LONG, // Errors stay a bit longer
    ...options
  });
};

/**
 * Show a loading toast with proper cleanup
 * @param message The message to display
 * @param options Optional toast options
 * @returns A function to dismiss the toast and optionally show a result
 */
export const showLoading = (message: string, options?: ToastOptions) => {
  const toastId = toast.loading(message, {
    duration: DURATION.LONG, // Loading toasts stay longer by default
    ...options
  });
  
  // Return a function to dismiss this toast and optionally show a result
  return {
    dismiss: () => toast.dismiss(toastId),
    success: (successMessage: string, successOptions?: ToastOptions) => {
      toast.dismiss(toastId);
      return showSuccess(successMessage, successOptions);
    },
    error: (errorMessage: string, errorOptions?: ToastOptions) => {
      toast.dismiss(toastId);
      return showError(errorMessage, errorOptions);
    }
  };
};

/**
 * Show a custom toast with proper duration
 * @param render The render function for the custom toast
 * @param options Optional toast options
 */
export const showCustom = (
  render: (t: Toast) => JSX.Element,
  options?: ToastOptions
) => {
  return toast.custom(render, {
    duration: options?.duration || DURATION.NORMAL,
    ...options
  });
};

/**
 * Dismiss all toasts
 */
export const dismissAll = () => {
  toast.dismiss();
};

export default {
  success: showSuccess,
  error: showError,
  loading: showLoading,
  custom: showCustom,
  dismiss: toast.dismiss,
  dismissAll,
  DURATION
};
