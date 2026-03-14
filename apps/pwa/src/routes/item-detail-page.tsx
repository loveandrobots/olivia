import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Owner, UpdateChange, DraftReminder, Reminder, ReminderUpdateChange } from '@olivia/contracts';
import { useRole } from '../lib/role';
import {
  confirmUpdateCommand,
  loadItemDetail,
  loadReminderView,
  confirmCreateReminderCommand,
  completeReminderCommand,
  snoozeReminderCommand,
  cancelReminderCommand,
  confirmUpdateReminderCommand,
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { ReminderBlock } from '../components/reminders/ReminderBlock';
import { AddReminderButton } from '../components/reminders/AddReminderButton';
import { CreateReminderSheet } from '../components/reminders/CreateReminderSheet';
import { EditReminderSheet } from '../components/reminders/EditReminderSheet';
import { SnoozeSheet } from '../components/reminders/SnoozeSheet';
import { CancelConfirmSheet } from '../components/reminders/CancelConfirmSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';

export function ItemDetailPage() {
  const params = useParams({ from: '/items/$itemId' });
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();
  const [statusValue, setStatusValue] = useState<'open' | 'in_progress' | 'done' | 'deferred'>('in_progress');
  const [ownerValue, setOwnerValue] = useState<Owner>('stakeholder');
  const [dueText, setDueText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showCreateReminder, setShowCreateReminder] = useState(false);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const [snoozeReminder, setSnoozeReminder] = useState<Reminder | null>(null);
  const [cancelReminder, setCancelReminder] = useState<Reminder | null>(null);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);

  const itemQuery = useQuery({
    queryKey: ['item-detail', role, params.itemId],
    queryFn: () => loadItemDetail(role, params.itemId),
  });

  const reminderQuery = useQuery({
    queryKey: ['reminder-view', role],
    queryFn: () => loadReminderView(role),
  });

  const linkedReminders = useMemo(() => {
    if (!reminderQuery.data) return [];
    const byState = reminderQuery.data.remindersByState;
    const all: Reminder[] = [
      ...byState.overdue,
      ...byState.due,
      ...byState.upcoming,
      ...byState.snoozed,
    ];
    return all.filter((r) => r.linkedInboxItemId === params.itemId);
  }, [reminderQuery.data, params.itemId]);

  const showBanner = useCallback((message: string, variant: 'mint' | 'sky') => {
    setBanner({ message, variant });
    setTimeout(() => setBanner(null), 5000);
  }, []);

  const invalidateReminders = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
  }, [queryClient]);

  const applyChange = async (proposedChange: UpdateChange) => {
    if (!itemQuery.data) return;
    setBusy(true);
    setError(null);
    try {
      await confirmUpdateCommand(role, itemQuery.data.item.id, itemQuery.data.item.version, proposedChange);
      setNote('');
      setDueText('');
      await queryClient.invalidateQueries({ queryKey: ['item-detail', role, params.itemId] });
      await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateReminderSave = useCallback(async (draft: DraftReminder) => {
    setShowCreateReminder(false);
    await confirmCreateReminderCommand(role, draft);
    await invalidateReminders();
    showBanner('✓ Reminder created', 'mint');
  }, [role, invalidateReminders, showBanner]);

  const handleCompleteReminder = useCallback(async (reminder: Reminder) => {
    await completeReminderCommand(role, reminder.id, reminder.version);
    await invalidateReminders();
    showBanner('✓ Done', 'mint');
  }, [role, invalidateReminders, showBanner]);

  const handleSnoozeSelect = useCallback(async (isoString: string) => {
    if (!snoozeReminder) return;
    const target = snoozeReminder;
    setSnoozeReminder(null);
    await snoozeReminderCommand(role, target.id, target.version, isoString);
    await invalidateReminders();
    showBanner(`😴 Snoozed until ${new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, 'sky');
  }, [snoozeReminder, role, invalidateReminders, showBanner]);

  const handleCancelReminder = useCallback(async () => {
    if (!cancelReminder) return;
    const target = cancelReminder;
    setCancelReminder(null);
    await cancelReminderCommand(role, target.id, target.version);
    await invalidateReminders();
  }, [cancelReminder, role, invalidateReminders]);

  const handleEditReminderSave = useCallback(async (change: ReminderUpdateChange) => {
    if (!editReminder) return;
    const target = editReminder;
    setEditReminder(null);
    await confirmUpdateReminderCommand(role, target.id, target.version, change);
    await invalidateReminders();
    showBanner('✓ Updated', 'mint');
  }, [editReminder, role, invalidateReminders, showBanner]);

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="support-page">
          <button
            type="button"
            onClick={() => void navigate({ to: '/tasks' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--violet)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
            }}
          >
            ← Back to Tasks
          </button>

          {itemQuery.isLoading && (
            <div className="card"><p className="muted">Loading item…</p></div>
          )}
          {(itemQuery.isError || (!itemQuery.isLoading && !itemQuery.data)) && (
            <div className="card error-card">
              <p>{(itemQuery.error as Error)?.message ?? 'Item not found.'}</p>
            </div>
          )}

          {itemQuery.data && (() => {
            const { item, history, flags } = itemQuery.data;
            return (
              <>
                <div className="card stack-md">
                  <div className="section-header">
                    <div className="stack-sm">
                      <span className="eyebrow">Item detail</span>
                      <h2 className="card-title">{item.title}</h2>
                      <p className="muted">
                        Owner: {item.owner === 'spouse' ? 'Alex' : item.owner === 'stakeholder' ? 'Jamie' : 'Unassigned'} · Status: {item.status.replace('_', ' ')}
                      </p>
                    </div>
                    {item.pendingSync ? <span className="chip info">Pending sync</span> : null}
                  </div>
                  {item.description ? <p>{item.description}</p> : <p className="muted">No description yet.</p>}
                  <div className="chip-row">
                    {flags.overdue   ? <span className="chip danger">Overdue</span>  : null}
                    {flags.dueSoon   ? <span className="chip info">Due soon</span>   : null}
                    {flags.stale     ? <span className="chip warning">Stale</span>   : null}
                    {flags.unassigned? <span className="chip neutral">Unassigned</span> : null}
                  </div>
                  <p className="muted" style={{ fontSize: 12 }}>Due: {item.dueText ?? 'No due date'} · v{item.version}</p>
                </div>

                {/* Linked reminders */}
                {linkedReminders.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {linkedReminders.map((rem) => (
                      <ReminderBlock
                        key={rem.id}
                        reminder={rem}
                        onDone={() => void handleCompleteReminder(rem)}
                        onSnooze={() => setSnoozeReminder(rem)}
                        onEdit={() => setEditReminder(rem)}
                        onRemove={() => setCancelReminder(rem)}
                        onNavigate={() => void navigate({ to: '/reminders/$reminderId', params: { reminderId: rem.id } })}
                      />
                    ))}
                    <AddReminderButton
                      label="Add another reminder"
                      icon="＋"
                      onClick={() => setShowCreateReminder(true)}
                    />
                  </div>
                )}
                {linkedReminders.length === 0 && (
                  <AddReminderButton
                    label="Add a reminder to this task"
                    icon="⚠️"
                    prominent
                    onClick={() => setShowCreateReminder(true)}
                  />
                )}

                {role === 'stakeholder' ? (
                  <div className="card stack-md">
                    <div className="section-header">
                      <div className="stack-sm">
                        <span className="eyebrow">Update</span>
                        <h3 className="card-title" style={{ fontSize: 18 }}>Update item</h3>
                      </div>
                      <span className="section-note">Changes apply immediately and can be reversed</span>
                    </div>
                    <div className="update-grid">
                      <div className="stack-sm">
                        <span className="field-label">Status</span>
                        <select value={statusValue} onChange={(e) => setStatusValue(e.target.value as typeof statusValue)}>
                          <option value="open">open</option>
                          <option value="in_progress">in progress</option>
                          <option value="done">done</option>
                          <option value="deferred">deferred</option>
                        </select>
                        <button type="button" className="secondary-button" disabled={busy} onClick={() => void applyChange({ status: statusValue })}>
                          Set status
                        </button>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Owner</span>
                        <select value={ownerValue} onChange={(e) => setOwnerValue(e.target.value as Owner)}>
                          <option value="stakeholder">Jamie (stakeholder)</option>
                          <option value="spouse">Alex (spouse)</option>
                          <option value="unassigned">unassigned</option>
                        </select>
                        <button type="button" className="secondary-button" disabled={busy} onClick={() => void applyChange({ owner: ownerValue })}>
                          Set owner
                        </button>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Due text</span>
                        <input value={dueText} onChange={(e) => setDueText(e.target.value)} placeholder="next Friday" />
                        <button type="button" className="secondary-button" disabled={busy} onClick={() => void applyChange({ dueText })}>
                          Update due date
                        </button>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Add note</span>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Call the preferred vendor first" />
                        <button type="button" className="secondary-button" disabled={busy} onClick={() => void applyChange({ note })}>
                          Save note
                        </button>
                      </div>
                    </div>
                    {error ? <p className="error-text">{error}</p> : null}
                  </div>
                ) : (
                  <div className="card">
                    <p className="muted">You're viewing as Alex. Updates are made by Jamie.</p>
                  </div>
                )}

                <div className="card stack-md">
                  <div className="section-header">
                    <div className="stack-sm">
                      <span className="eyebrow">History</span>
                      <h3 className="card-title" style={{ fontSize: 18 }}>Recent changes</h3>
                    </div>
                    <span className="section-note">Newest first</span>
                  </div>
                  {history.length === 0 ? <p className="muted">No history yet.</p> : null}
                  <ul className="history-list">
                    {history.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.eventType.replace('_', ' ')}</strong>
                        <span className="muted"> · {new Date(entry.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      <CreateReminderSheet
        open={showCreateReminder}
        onClose={() => setShowCreateReminder(false)}
        onSave={handleCreateReminderSave}
        linkedItemId={params.itemId}
      />

      {editReminder && (
        <EditReminderSheet
          open={!!editReminder}
          onClose={() => setEditReminder(null)}
          reminder={editReminder}
          onSave={handleEditReminderSave}
        />
      )}

      <SnoozeSheet
        open={!!snoozeReminder}
        onClose={() => setSnoozeReminder(null)}
        onSelectTime={handleSnoozeSelect}
      />

      {cancelReminder && (
        <CancelConfirmSheet
          open={!!cancelReminder}
          onClose={() => setCancelReminder(null)}
          reminderTitle={cancelReminder.title}
          isRecurring={cancelReminder.recurrenceCadence !== 'none'}
          onCancelSingle={handleCancelReminder}
          onCancelSeries={handleCancelReminder}
        />
      )}

      <BottomNav activeTab="tasks" />
    </div>
  );
}
