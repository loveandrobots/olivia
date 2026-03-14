import { BottomSheet } from './BottomSheet';

type CancelConfirmSheetProps = {
  open: boolean;
  onClose: () => void;
  reminderTitle: string;
  isRecurring: boolean;
  onCancelSingle: () => void;
  onCancelSeries?: () => void;
};

export function CancelConfirmSheet({
  open,
  onClose,
  reminderTitle,
  isRecurring,
  onCancelSingle,
  onCancelSeries,
}: CancelConfirmSheetProps) {
  if (isRecurring) {
    return (
      <BottomSheet open={open} onClose={onClose} title="Cancel recurring reminder?">
        <div className="cancel-body">
          This is a recurring reminder. Do you want to cancel just this occurrence, or the entire series?
        </div>
        <div className="cancel-actions">
          <button
            type="button"
            className="rem-btn rem-btn-secondary"
            style={{ width: '100%' }}
            onClick={onCancelSingle}
          >
            Cancel this occurrence only
          </button>
          <button
            type="button"
            className="rem-btn rem-btn-danger"
            style={{ width: '100%' }}
            onClick={onCancelSeries ?? onCancelSingle}
          >
            Cancel entire series
          </button>
          <button
            type="button"
            className="rem-btn rem-btn-ghost"
            style={{ width: '100%' }}
            onClick={onClose}
          >
            Keep it
          </button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Cancel reminder?">
      <div className="cancel-body">
        "{reminderTitle}" will be removed and won't resurface. This can't be undone.
      </div>
      <div className="cancel-actions">
        <button
          type="button"
          className="rem-btn rem-btn-danger-text"
          style={{ width: '100%' }}
          onClick={onCancelSingle}
        >
          Yes, cancel reminder
        </button>
        <button
          type="button"
          className="rem-btn rem-btn-ghost"
          style={{ width: '100%' }}
          onClick={onClose}
        >
          Keep it
        </button>
      </div>
    </BottomSheet>
  );
}
