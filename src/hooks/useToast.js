import { useState, useRef, useEffect, useCallback } from 'react';

const DEFAULT_TOAST = { show: false, message: '', type: 'success' };

export function useToast(duration = 4000) {
  const [toast, setToast] = useState(DEFAULT_TOAST);
  const toastTimeoutRef = useRef(null);

  const dismissToast = useCallback(() => {
    setToast(DEFAULT_TOAST);
  }, []);

  const showNotification = useCallback(
    (message, type = 'success') => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      setToast({ show: true, message, type });
      toastTimeoutRef.current = setTimeout(() => {
        dismissToast();
        toastTimeoutRef.current = null;
      }, duration);
    },
    [duration, dismissToast]
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return { toast, showNotification, dismissToast };
}
