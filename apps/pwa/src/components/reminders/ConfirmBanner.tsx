import { useEffect, useState } from 'react';

type ConfirmBannerProps = {
  message: string;
  variant: 'mint' | 'sky';
  onUndo?: () => void;
  duration?: number;
};

export function ConfirmBanner({ message, variant, onUndo, duration = 5000 }: ConfirmBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div className={`confirm-banner confirm-banner-${variant}`}>
      <span>{message}</span>
      {onUndo && (
        <button type="button" className="banner-undo" onClick={onUndo}>
          ↩ Undo
        </button>
      )}
    </div>
  );
}
