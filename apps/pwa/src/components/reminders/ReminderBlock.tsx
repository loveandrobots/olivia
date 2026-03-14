import type { Reminder } from '@olivia/contracts';
import { computeReminderState } from '@olivia/domain';
import { getReminderDueDisplay, formatScheduledLabel, formatRecurrenceLabel } from '../../lib/reminder-helpers';

type ReminderBlockProps = {
  reminder: Reminder;
  onDone?: () => void;
  onSnooze?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onNavigate?: () => void;
};

export function ReminderBlock({
  reminder,
  onDone,
  onSnooze,
  onEdit,
  onRemove,
  onNavigate,
}: ReminderBlockProps) {
  const state = computeReminderState(reminder, new Date());
  const display = getReminderDueDisplay(reminder);
  const isDueOrOverdue = state === 'due' || state === 'overdue';
  const isSubdued = state === 'upcoming' || state === 'snoozed';

  return (
    <div className={`rem-block${isSubdued ? ' rem-block-subdued' : ''}`}>
      <div className="rem-block-header">
        <span className="rem-block-label">🔔 Reminder</span>
        <button
          type="button"
          className={`rem-badge ${display.badgeClass}`}
          onClick={onNavigate}
          style={{ cursor: 'pointer', border: 'none' }}
        >
          {display.badgeText}
        </button>
      </div>
      <div className="rem-block-title">{reminder.title}</div>
      <div className="rem-block-meta">
        {formatScheduledLabel(reminder.scheduledAt)}
        {reminder.recurrenceCadence !== 'none' && ` · ${formatRecurrenceLabel(reminder.recurrenceCadence).replace('↻ ', '')}`}
      </div>
      <div className="rem-block-actions">
        {isDueOrOverdue && (
          <>
            <button type="button" className="rem-btn rem-btn-done" onClick={onDone}>✓ Done</button>
            <button type="button" className="rem-btn rem-btn-secondary" onClick={onSnooze}>😴 Snooze</button>
            <button type="button" className="rem-btn rem-btn-ghost" onClick={onEdit}>✏️ Edit</button>
          </>
        )}
        {!isDueOrOverdue && (
          <>
            <button type="button" className="rem-btn rem-btn-ghost" onClick={onEdit}>✏️ Edit</button>
            <button type="button" className="rem-btn rem-btn-danger-text" onClick={onRemove}>✕ Remove</button>
          </>
        )}
      </div>
    </div>
  );
}
