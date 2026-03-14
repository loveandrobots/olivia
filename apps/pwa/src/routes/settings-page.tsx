import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, useCallback } from 'react';
import { clientDb } from '../lib/client-db';
import { useRole } from '../lib/role';
import { loadNotificationState, saveDemoNotificationSubscription, loadReminderSettings, saveReminderSettingsCommand } from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { OliviaMessage } from '../components/reminders/OliviaMessage';
import type { ActorRole, ReminderNotificationPreferencesInput } from '@olivia/contracts';

type ThemeMode = 'light' | 'dark' | 'auto';

function applyTheme(mode: ThemeMode) {
  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('olivia-theme');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('olivia-theme', mode);
  }
}

function readSavedTheme(): ThemeMode {
  const saved = localStorage.getItem('olivia-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return 'auto';
}

export function SettingsPage() {
  const { role, setRole } = useRole();
  const queryClient = useQueryClient();
  const [activeTheme, setActiveTheme] = useState<ThemeMode>(readSavedTheme);
  const notificationQuery = useQuery({ queryKey: ['notification-subscriptions', role], queryFn: () => loadNotificationState(role) });
  const reminderSettingsQuery = useQuery({ queryKey: ['reminder-settings', role], queryFn: () => loadReminderSettings(role) });

  const diagnostics = useLiveQuery(async () => {
    const pending = await clientDb.outbox.where('state').equals('pending').count();
    const conflicts = await clientDb.outbox.where('state').equals('conflict').count();
    return { pending, conflicts };
  }, [role]);

  const installed = useMemo(() => window.matchMedia('(display-mode: standalone)').matches, []);

  const handleTheme = (mode: ThemeMode) => {
    applyTheme(mode);
    setActiveTheme(mode);
  };

  const prefs = reminderSettingsQuery.data?.preferences;
  const masterEnabled = prefs?.enabled ?? false;
  const dueEnabled = prefs?.dueRemindersEnabled ?? false;
  const summaryEnabled = prefs?.dailySummaryEnabled ?? false;

  const savePrefs = useCallback(async (update: Partial<ReminderNotificationPreferencesInput>) => {
    const current: ReminderNotificationPreferencesInput = {
      enabled: masterEnabled,
      dueRemindersEnabled: dueEnabled,
      dailySummaryEnabled: summaryEnabled,
      ...update,
    };
    try {
      await saveReminderSettingsCommand(role, current);
      await queryClient.invalidateQueries({ queryKey: ['reminder-settings', role] });
    } catch {
      // Offline or error — silently fail and let the UI reflect cached state
    }
  }, [masterEnabled, dueEnabled, summaryEnabled, role, queryClient]);

  const oliviaNotifMessage = useMemo(() => {
    if (!masterEnabled) {
      return 'Reminders always surface in-app even with push off. I\'ll never notify you without your permission.';
    }
    const parts: string[] = [];
    if (dueEnabled) parts.push('I\'ll notify you when reminders come due');
    if (summaryEnabled) parts.push('Daily summary is on');
    else parts.push('Daily summary is off — turn it on for a morning briefing');
    if (!dueEnabled && !summaryEnabled) {
      return 'Push notifications are on, but all notification types are off. Enable one to start receiving alerts.';
    }
    return parts.join('. ') + '.';
  }, [masterEnabled, dueEnabled, summaryEnabled]);

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="support-page">
          <div className="screen-header" style={{ paddingBottom: 8 }}>
            <div className="screen-title">Settings</div>
            <div className="screen-sub">App preferences and diagnostics</div>
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Theme</h3>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['light', 'dark', 'auto'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={activeTheme === mode ? 'primary-button' : 'secondary-button'}
                  style={{ flex: 1, minWidth: 80 }}
                  onClick={() => handleTheme(mode)}
                >
                  {mode === 'auto' ? 'Auto (OS)' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Active role</h3>
              <span className="section-note">For development / testing</span>
            </div>
            <p className="muted">Switch which household member you're viewing as.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['stakeholder', 'spouse'] as ActorRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={role === r ? 'primary-button' : 'secondary-button'}
                  style={{ flex: 1 }}
                  onClick={() => setRole(r)}
                >
                  {r === 'stakeholder' ? 'Lexi' : 'Christian'}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12 }}>Current: {role === 'stakeholder' ? 'Lexi (stakeholder)' : 'Christian (spouse)'}</p>
          </div>

          {/* Notification Settings */}
          <div className="card stack-md">
            <div className="screen-title" style={{ fontSize: 22 }}>Notifications</div>
            <div className="screen-sub" style={{ marginBottom: 16 }}>
              {masterEnabled ? 'Push notifications are on.' : 'Reminders always surface in-app. Push is optional.'}
            </div>

            <div className="notif-card">
              <div className="rem-toggle-row">
                <div>
                  <div className="notif-type-title">Enable push notifications</div>
                  <div className="notif-type-sub">Allow Olivia to notify your device</div>
                </div>
                <button
                  type="button"
                  className={`rem-toggle${masterEnabled ? ' on' : ''}`}
                  onClick={() => {
                    const next = !masterEnabled;
                    void savePrefs({
                      enabled: next,
                      dueRemindersEnabled: next ? dueEnabled : false,
                      dailySummaryEnabled: next ? summaryEnabled : false,
                    });
                  }}
                  aria-label="Toggle push notifications"
                />
              </div>
            </div>

            <div className="rem-group-header" style={{ marginTop: 8 }}>Notification types</div>

            <div className={`notif-type-row${!masterEnabled ? ' disabled' : ''}`}>
              <div>
                <div className="notif-type-title">Due reminders</div>
                <div className="notif-type-sub">When a reminder is due or overdue</div>
              </div>
              <button
                type="button"
                className={`rem-toggle${dueEnabled ? ' on' : ''}`}
                disabled={!masterEnabled}
                onClick={() => void savePrefs({ dueRemindersEnabled: !dueEnabled })}
                aria-label="Toggle due reminders"
              />
            </div>

            <div className={`notif-type-row${!masterEnabled ? ' disabled' : ''}`}>
              <div>
                <div className="notif-type-title">Daily summary</div>
                <div className="notif-type-sub">Morning digest of upcoming reminders</div>
              </div>
              <button
                type="button"
                className={`rem-toggle${summaryEnabled ? ' on' : ''}`}
                disabled={!masterEnabled}
                onClick={() => void savePrefs({ dailySummaryEnabled: !summaryEnabled })}
                aria-label="Toggle daily summary"
              />
            </div>

            <OliviaMessage text={oliviaNotifMessage} />
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Installability</h3>
            </div>
            <p className="muted">Installed as app: <strong>{installed ? 'Yes' : 'No'}</strong></p>
            <p className="muted">Notification permission: <strong>{typeof Notification !== 'undefined' ? Notification.permission : 'unavailable'}</strong></p>
            <button
              type="button"
              className="secondary-button"
              onClick={async () => {
                if (typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission();
                await saveDemoNotificationSubscription(role);
                await queryClient.invalidateQueries({ queryKey: ['notification-subscriptions', role] });
              }}
            >
              Save demo notification target
            </button>
            <p className="muted" style={{ fontSize: 12 }}>Stored subscriptions: {notificationQuery.data?.length ?? 0}</p>
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Sync diagnostics</h3>
            </div>
            <p className="muted">Pending commands: {diagnostics?.pending ?? 0}</p>
            <p className="muted">Conflicts: {diagnostics?.conflicts ?? 0}</p>
          </div>
        </div>
      </div>
      <BottomNav activeTab="home" />
    </div>
  );
}
