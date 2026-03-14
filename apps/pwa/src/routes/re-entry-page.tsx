import { useSearch, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { BottomNav } from '../components/bottom-nav';

export function ReEntryPage() {
  const search = useSearch({ from: '/re-entry' });
  const navigate = useNavigate();

  useEffect(() => {
    if (search.reason === 'reminder-due' && search.reminderId) {
      void navigate({ to: '/reminders/$reminderId', params: { reminderId: search.reminderId } });
      return;
    }
    if (search.reason === 'daily-summary') {
      void navigate({ to: '/reminders' });
      return;
    }
  }, [search.reason, search.reminderId, navigate]);

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="support-page">
          <div className="card stack-md">
            <span className="eyebrow">Notification re-entry</span>
            <h2 className="card-title">Coming from: {search.reason.replace(/-/g, ' ')}</h2>
            <p className="muted">This is the notification landing point that brings you back into Olivia.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => void navigate({ to: '/tasks' })}
              >
                View tasks
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void navigate({ to: '/reminders' })}
              >
                View reminders
              </button>
            </div>
          </div>
        </div>
      </div>
      <BottomNav activeTab="home" />
    </div>
  );
}
