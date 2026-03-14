import { BottomSheet } from './BottomSheet';
import { OliviaMessage } from './OliviaMessage';
import { getSnoozeOptions } from '../../lib/reminder-helpers';

type SnoozeSheetProps = {
  open: boolean;
  onClose: () => void;
  onSelectTime: (isoString: string) => void;
};

export function SnoozeSheet({ open, onClose, onSelectTime }: SnoozeSheetProps) {
  const options = getSnoozeOptions(new Date());

  return (
    <BottomSheet open={open} onClose={onClose} title="Snooze until…">
      <OliviaMessage
        text="When would you like me to resurface this?"
      />
      <div className="snooze-options">
        {options.map((opt) => (
          <button
            key={opt.label}
            type="button"
            className="snooze-option"
            onClick={() => onSelectTime(opt.value.toISOString())}
          >
            <span className="snooze-option-label">{opt.label}</span>
            <span className="snooze-option-time">{opt.timeLabel}</span>
          </button>
        ))}
        <button
          type="button"
          className="snooze-option"
          onClick={() => {
            const custom = prompt('Enter a date/time (e.g. "March 20, 9:00 AM"):');
            if (custom) {
              const parsed = new Date(custom);
              if (!isNaN(parsed.getTime())) {
                onSelectTime(parsed.toISOString());
              }
            }
          }}
          style={{ color: 'var(--violet)' }}
        >
          <span className="snooze-option-label">Choose a time…</span>
          <span className="snooze-option-time">Custom</span>
        </button>
      </div>
      <div style={{ marginTop: 16 }}>
        <button type="button" className="rem-btn rem-btn-ghost" style={{ width: '100%' }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
