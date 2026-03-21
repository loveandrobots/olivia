/**
 * Global error toast store — a lightweight pub/sub so any code
 * (sync, mutations, error boundaries) can surface errors to the user.
 */

export type ErrorToast = {
  id: string;
  message: string;
  retry?: () => void;
};

type Listener = () => void;

let toasts: ErrorToast[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function showErrorToast(message: string, retry?: () => void) {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, message, retry }];
  emit();
  return id;
}

export function dismissErrorToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function getErrorToasts(): ErrorToast[] {
  return toasts;
}

export function subscribeErrorToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
