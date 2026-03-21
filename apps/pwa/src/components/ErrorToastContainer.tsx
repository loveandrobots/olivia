import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { getErrorToasts, subscribeErrorToasts, dismissErrorToast, type ErrorToast } from '../lib/error-toast';
import { ConfirmBanner } from './reminders/ConfirmBanner';

const AUTO_DISMISS_MS = 8000;

function ErrorToastItem({ toast }: { toast: ErrorToast }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => dismissErrorToast(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [toast.id]);

  const handleRetry = useCallback(() => {
    dismissErrorToast(toast.id);
    toast.retry?.();
  }, [toast]);

  const handleDismiss = useCallback(() => {
    dismissErrorToast(toast.id);
  }, [toast.id]);

  return (
    <ConfirmBanner
      message={toast.message}
      variant="rose"
      duration={AUTO_DISMISS_MS}
      onAction={toast.retry ? handleRetry : undefined}
      actionLabel={toast.retry ? 'Retry' : undefined}
      onDismiss={handleDismiss}
    />
  );
}

export function ErrorToastContainer() {
  const toasts = useSyncExternalStore(subscribeErrorToasts, getErrorToasts);

  // Only show the most recent toast to avoid stacking
  const latest = toasts[toasts.length - 1];
  if (!latest) return null;

  return <ErrorToastItem key={latest.id} toast={latest} />;
}
