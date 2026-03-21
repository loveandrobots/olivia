import { useEffect, useState } from 'react';

type ConfirmBannerProps = {
  message: string;
  variant: 'mint' | 'sky' | 'rose';
  onUndo?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  duration?: number;
  onDismiss?: () => void;
};

export function ConfirmBanner({ message, variant, onUndo, onAction, actionLabel, duration = 5000, onDismiss }: ConfirmBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div className={`confirm-banner confirm-banner-${variant}`} onClick={onDismiss} role={onDismiss ? 'button' : undefined}>
      <span>{message}</span>
      {onAction && actionLabel && (
        <button type="button" className="banner-undo" onClick={(e) => { e.stopPropagation(); onAction(); }}>
          {actionLabel}
        </button>
      )}
      {onUndo && (
        <button type="button" className="banner-undo" onClick={(e) => { e.stopPropagation(); onUndo(); }}>
          ↩ Undo
        </button>
      )}
    </div>
  );
}
