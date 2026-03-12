import { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { computeFlags } from '@olivia/domain';
import type { InboxItem } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { loadInboxView, previewCreateCommand, confirmCreateCommand } from '../lib/sync';
import {
  DEMO_FULL_TASKS,
  DEMO_COMPLETED_TASKS,
  ownerToDisplay,
} from '../lib/demo-data';
import { BottomNav } from '../components/bottom-nav';

type FilterTab = 'All' | 'Mine' | 'Shared' | 'Overdue' | 'Snoozed';
const FILTER_TABS: FilterTab[] = ['All', 'Mine', 'Shared', 'Overdue', 'Snoozed'];

function getAccent(item: InboxItem): 'rose' | 'peach' | 'mint' | '' {
  const flags = computeFlags(item);
  if (flags.overdue) return 'rose';
  if (flags.dueSoon) return 'peach';
  if (item.owner === 'spouse') return 'mint';
  return '';
}

function getBadge(item: InboxItem): { label: string; cls: string } | null {
  const flags = computeFlags(item);
  if (flags.overdue) return { label: 'Overdue', cls: 'badge-rose' };
  if (flags.dueSoon) return { label: 'Soon', cls: 'badge-peach' };
  if (item.owner === 'spouse') return { label: 'Shared', cls: 'badge-violet' };
  return null;
}

function getOwnerDisplay(owner: string): { initial: string; name: string; cls: string } {
  if (owner === 'spouse') return { initial: 'A', name: 'Alexander', cls: 'rose-av' };
  if (owner === 'stakeholder') return { initial: 'L', name: 'Lexi', cls: '' };
  return { initial: '?', name: 'Unassigned', cls: '' };
}

export function TasksPage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputText, setInputText] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewCreateCommand>> | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inboxQuery = useQuery({
    queryKey: ['inbox-view', role, 'active'],
    queryFn: () => loadInboxView(role, 'active'),
  });

  const { openItems, doneItems, openCount, doneCount } = useMemo(() => {
    if (!inboxQuery.data) return { openItems: [], doneItems: [], openCount: 0, doneCount: 0 };

    const allOpen: InboxItem[] = [
      ...inboxQuery.data.itemsByStatus.open,
      ...inboxQuery.data.itemsByStatus.in_progress,
    ];
    const done: InboxItem[] = inboxQuery.data.itemsByStatus.done;

    const filterOpen = (items: InboxItem[]): InboxItem[] => {
      switch (activeFilter) {
        case 'Mine':    return items.filter((i) => i.owner === role || i.owner === 'stakeholder');
        case 'Shared':  return items.filter((i) => i.owner === 'spouse');
        case 'Overdue': return items.filter((i) => computeFlags(i).overdue);
        case 'Snoozed': return [];
        default:        return items;
      }
    };

    const sorted = [...allOpen].sort((a, b) => {
      const fa = computeFlags(a);
      const fb = computeFlags(b);
      if (fa.overdue && !fb.overdue) return -1;
      if (!fa.overdue && fb.overdue) return 1;
      if (fa.dueSoon && !fb.dueSoon) return -1;
      if (!fa.dueSoon && fb.dueSoon) return 1;
      return 0;
    });

    return {
      openItems: filterOpen(sorted),
      doneItems: done.slice(0, 7),
      openCount: allOpen.length,
      doneCount: done.length,
    };
  }, [inboxQuery.data, activeFilter, role]);

  // Use demo data if inbox is empty
  const usingDemo = !inboxQuery.data || (openCount === 0 && doneCount === 0);

  const handlePreview = async () => {
    if (!inputText.trim()) return;
    setBusy(true);
    setAddError(null);
    try {
      const res = await previewCreateCommand(role, inputText);
      setPreview(res);
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setBusy(true);
    setAddError(null);
    try {
      await confirmCreateCommand(role, preview.parsedItem, preview.draftId);
      await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
      setInputText('');
      setPreview(null);
      setShowAddForm(false);
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const summaryLine = usingDemo
    ? '5 open · 2 completed this week'
    : `${openCount} open · ${doneCount} completed`;

  return (
    <div className="screen">
      <div className="screen-scroll">
        {/* Header */}
        <div className="screen-header">
          <div className="screen-title">Tasks</div>
          <div className="screen-sub">{summaryLine}</div>
        </div>

        {/* Filter tabs */}
        <div className="filter-row" role="tablist" aria-label="Task filters">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeFilter === tab}
              className={`ftab${activeFilter === tab ? ' active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Add task affordance — stakeholder only */}
        {role === 'stakeholder' && !showAddForm && (
          <button
            type="button"
            className="add-task-btn"
            onClick={() => setShowAddForm(true)}
            aria-label="Add a new task"
          >
            <div className="add-icon" aria-hidden="true">+</div>
            <div className="add-label">Add a new task…</div>
          </button>
        )}

        {/* Inline add task form */}
        {role === 'stakeholder' && showAddForm && (
          <div className="add-task-form">
            <div>
              <div className="form-field-label">What needs doing?</div>
              <textarea
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. Call electrician about outlet in kitchen, due next week"
                autoFocus
              />
            </div>
            {!preview && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handlePreview}
                  disabled={busy || !inputText.trim()}
                  style={{ flex: 1 }}
                >
                  {busy ? 'Parsing…' : 'Preview'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => { setShowAddForm(false); setPreview(null); setInputText(''); }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            )}
            {preview && (
              <div className="confirm-panel">
                <div className="form-field-label">Review before saving</div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '6px 0 4px' }}>{preview.parsedItem.title}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  Owner: {ownerToDisplay(preview.parsedItem.owner)}
                  {preview.parsedItem.dueText ? ` · Due: ${preview.parsedItem.dueText}` : ''}
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleConfirm}
                    disabled={busy}
                    style={{ flex: 1 }}
                  >
                    {busy ? 'Saving…' : 'Confirm & save'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setPreview(null)}
                    style={{ flex: 1 }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
            {addError && <p style={{ color: '#D4527A', fontSize: 12 }}>{addError}</p>}
          </div>
        )}

        {/* Spouse read-only notice */}
        {role === 'spouse' && (
          <div style={{ padding: '4px 16px 12px', fontSize: 12, color: 'var(--ink-3)' }}>
            You're viewing as Alexander. Tasks are read-only.
          </div>
        )}

        {/* Task list */}
        <div className="tasks-list">
          {usingDemo ? (
            <DemoTaskList filter={activeFilter} />
          ) : (
            <>
              {openItems.length === 0 && activeFilter === 'Snoozed' && (
                <div className="empty-state"><p>No snoozed tasks right now.</p></div>
              )}
              {openItems.length === 0 && activeFilter !== 'Snoozed' && (
                <div className="empty-state">
                  <p>
                    {activeFilter === 'All'
                      ? 'Nothing left to do today — nice work.'
                      : `No ${activeFilter.toLowerCase()} tasks right now.`}
                  </p>
                </div>
              )}
              {openItems.map((item) => {
                const accent = getAccent(item);
                const badge = getBadge(item);
                const owner = getOwnerDisplay(item.owner);
                return (
                  <div
                    key={item.id}
                    className={`task-full${accent ? ` ${accent}` : ''}`}
                    onClick={() => void navigate({ to: '/items/$itemId', params: { itemId: item.id } })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && void navigate({ to: '/items/$itemId', params: { itemId: item.id } })}
                  >
                    <div className="tf-top">
                      <div className="tf-check" role="checkbox" aria-checked="false" onClick={(e) => e.stopPropagation()} aria-label={`Mark "${item.title}" complete`} />
                      <div className="tf-name">{item.title}</div>
                      {badge && <div className={`badge ${badge.cls}`} style={{ flexShrink: 0, marginTop: 1 }}>{badge.label}</div>}
                    </div>
                    <div className="tf-bottom">
                      {item.dueText && <div className="tf-meta">{item.dueText}</div>}
                      {item.owner !== 'unassigned' && (
                        <div className="tf-assign">
                          <div className={`tf-mini-av${owner.cls ? ` ${owner.cls}` : ''}`}>{owner.initial}</div>
                          {owner.name}
                        </div>
                      )}
                      {item.pendingSync && <span className="badge badge-violet">Pending sync</span>}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Completed section */}
        {!usingDemo && doneItems.length > 0 && (
          <>
            <div className="completed-label">Completed</div>
            <div className="tasks-list">
              {doneItems.map((item) => (
                <div key={item.id} className="task-full done">
                  <div className="tf-top">
                    <div className="tf-check done" />
                    <div className="tf-name done">{item.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {usingDemo && (
          <>
            <div className="completed-label">Completed</div>
            <div className="tasks-list">
              {DEMO_COMPLETED_TASKS.map((t) => (
                <div key={t.id} className="task-full done">
                  <div className="tf-top">
                    <div className="tf-check done" />
                    <div className="tf-name done">{t.title}</div>
                  </div>
                  <div className="tf-bottom">
                    <div className="tf-meta">{t.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="spacer-bottom" />
      </div>

      <BottomNav activeTab="tasks" />
    </div>
  );
}

function DemoTaskList({ filter }: { filter: FilterTab }) {
  const filtered = DEMO_FULL_TASKS.filter((t) => {
    if (filter === 'Mine') return t.assignee === 'Lexi';
    if (filter === 'Shared') return t.assignee === 'Alexander';
    if (filter === 'Overdue') return t.badge === 'Overdue';
    if (filter === 'Snoozed') return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="empty-state">
        <p>
          {filter === 'Snoozed'
            ? 'No snoozed tasks right now.'
            : `No ${filter.toLowerCase()} tasks right now.`}
        </p>
      </div>
    );
  }

  return (
    <>
      {filtered.map((t) => (
        <div
          key={t.id}
          className={`task-full${t.accent ? ` ${t.accent}` : ''}`}
        >
          <div className="tf-top">
            <div className="tf-check" />
            <div className="tf-name">{t.title}</div>
            {t.badge && <div className={`badge ${t.badgeClass}`} style={{ flexShrink: 0, marginTop: 1 }}>{t.badge}</div>}
          </div>
          <div className="tf-bottom">
            <div className="tf-meta">{t.meta}</div>
            <div className="tf-assign">
              <div className={`tf-mini-av${t.assigneeClass ? ` ${t.assigneeClass}` : ''}`}>{t.assigneeInitial}</div>
              {t.assignee}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
