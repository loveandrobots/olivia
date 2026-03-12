import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { computeFlags } from '@olivia/domain';
import type { InboxItem } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { loadInboxView } from '../lib/sync';
import {
  DEMO_EVENTS,
  DEMO_NUDGE,
  DEMO_TASKS,
  getDisplayName,
  ownerToDisplay,
} from '../lib/demo-data';
import { BottomNav } from '../components/bottom-nav';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function getDateSubtitle(count: number): string {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const day = now.getDate();
  const things = count === 1 ? '1 thing needs you today' : `${count} things need you today`;
  return `${dayName}, ${month} ${day} · ${things}`;
}

type SummaryTask = {
  id: string;
  title: string;
  meta: string;
  badge: string;
  badgeClass: string;
  accent: 'rose' | 'peach' | 'mint' | null;
};

function inboxItemToSummary(item: InboxItem, userRole: string): SummaryTask {
  const flags = computeFlags(item);
  const isShared = item.owner === 'spouse' && userRole === 'stakeholder';
  const isStakeholderItem = item.owner === 'stakeholder' && userRole === 'spouse';

  let badge = '';
  let badgeClass = '';
  let accent: 'rose' | 'peach' | 'mint' | null = null;

  if (flags.overdue) {
    badge = 'Overdue';
    badgeClass = 'badge-rose';
    accent = 'rose';
  } else if (flags.dueSoon) {
    badge = 'Soon';
    badgeClass = 'badge-peach';
    accent = 'peach';
  } else if (isShared || isStakeholderItem) {
    badge = 'Shared';
    badgeClass = 'badge-violet';
    accent = 'mint';
  }

  let meta = '';
  if (item.dueText) {
    const ownerName = item.owner !== userRole ? ` · ${ownerToDisplay(item.owner)}` : '';
    meta = `${item.dueText}${ownerName}`;
  } else if (flags.stale) {
    meta = 'Added a while ago · no reply';
  } else {
    meta = item.owner !== 'unassigned' ? ownerToDisplay(item.owner) : 'Open';
  }

  return { id: item.id, title: item.title, meta, badge, badgeClass, accent };
}

export function HomePage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const inboxQuery = useQuery({
    queryKey: ['inbox-view', role, 'active'],
    queryFn: () => loadInboxView(role, 'active'),
  });

  const { summaryTasks, needsCount } = useMemo(() => {
    const allOpen = inboxQuery.data
      ? [...inboxQuery.data.itemsByStatus.open, ...inboxQuery.data.itemsByStatus.in_progress]
      : [];

    if (allOpen.length === 0) {
      // Fall back to demo reference state
      return {
        summaryTasks: DEMO_TASKS.map((t) => ({
          id: t.id,
          title: t.title,
          meta: t.meta,
          badge: t.badge,
          badgeClass: t.badgeClass,
          accent: t.accent,
        })),
        needsCount: 3,
      };
    }

    // Sort: overdue first, then due-soon, then shared, then others
    const sorted = [...allOpen].sort((a, b) => {
      const fa = computeFlags(a);
      const fb = computeFlags(b);
      if (fa.overdue && !fb.overdue) return -1;
      if (!fa.overdue && fb.overdue) return 1;
      if (fa.dueSoon && !fb.dueSoon) return -1;
      if (!fa.dueSoon && fb.dueSoon) return 1;
      return 0;
    });

    const top3 = sorted.slice(0, 3).map((item) => inboxItemToSummary(item, role));
    const count = allOpen.filter((item) => {
      const f = computeFlags(item);
      return f.overdue || f.dueSoon;
    }).length;

    return { summaryTasks: top3, needsCount: count };
  }, [inboxQuery.data, role]);

  const greeting = getGreeting();
  const displayName = getDisplayName(role);
  const subtitle = getDateSubtitle(needsCount);

  return (
    <div className="screen">
      <div className="screen-scroll">
        {/* Header */}
        <div className="home-header">
          <div className="home-header-row">
            <div className="wordmark">olivia</div>
            <div className="avatar-stack" aria-label="Household members">
              <div className="av av-l" title="Lexi">L</div>
              <div className="av av-a" title="Alexander">A</div>
            </div>
          </div>
          <div className="greeting">
            {greeting}
            <br />
            <em>{displayName}.</em>
          </div>
          <div className="greeting-sub">{subtitle}</div>
        </div>

        {/* Olivia nudge card */}
        {!nudgeDismissed && (
          <div
            className="nudge"
            role="region"
            aria-label="Olivia's suggestion"
            onClick={() => void navigate({ to: '/olivia' })}
          >
            <div className="nudge-deco nudge-deco-1" aria-hidden="true" />
            <div className="nudge-deco nudge-deco-2" aria-hidden="true" />
            <div className="nudge-deco nudge-deco-3" aria-hidden="true" />
            <div className="nudge-eyebrow">
              <div className="nudge-dot" aria-hidden="true" />
              Olivia noticed
            </div>
            <div className="nudge-msg">{DEMO_NUDGE.message}</div>
            <div className="nudge-actions">
              <button
                type="button"
                className="nudge-btn nudge-btn-primary"
                onClick={(e) => { e.stopPropagation(); void navigate({ to: '/olivia' }); }}
              >
                {DEMO_NUDGE.primaryCta}
              </button>
              <button
                type="button"
                className="nudge-btn nudge-btn-secondary"
                onClick={(e) => { e.stopPropagation(); setNudgeDismissed(true); }}
              >
                {DEMO_NUDGE.secondaryCta}
              </button>
            </div>
          </div>
        )}

        {/* Needs doing section */}
        <div className="section-head">
          <div className="section-title">Needs doing</div>
          <button
            type="button"
            className="section-link"
            onClick={() => void navigate({ to: '/tasks' })}
          >
            All tasks →
          </button>
        </div>

        <div className="tasks-summary">
          {summaryTasks.map((task) => (
            <div
              key={task.id}
              className={`task${task.accent ? ` ${task.accent}` : ''}`}
              onClick={() => void navigate({ to: '/tasks' })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && void navigate({ to: '/tasks' })}
            >
              <div
                className="task-checkbox"
                role="checkbox"
                aria-checked="false"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                tabIndex={-1}
                aria-label={`Mark "${task.title}" complete`}
              />
              <div className="task-info">
                <div className="task-name">{task.title}</div>
                <div className="task-meta">{task.meta}</div>
              </div>
              {task.badge && (
                <div className={`badge ${task.badgeClass}`}>{task.badge}</div>
              )}
            </div>
          ))}
        </div>

        <div className="divider" />

        {/* Coming up section */}
        <div className="section-head">
          <div className="section-title">Coming up</div>
        </div>

        <div className="upcoming-strip" role="list" aria-label="Upcoming events">
          {DEMO_EVENTS.map((event) => (
            <div key={`${event.dateNum}-${event.name}`} className="event-tile" role="listitem">
              <div className="event-date-pill">
                <div className="event-date-num">{event.dateNum}</div>
                <div className="event-date-mo">{event.dateMon}</div>
              </div>
              <div className="event-name">{event.name}</div>
              <div className="event-time">{event.time}</div>
            </div>
          ))}
        </div>

        <div className="spacer-bottom" />
      </div>

      <BottomNav activeTab="home" />
    </div>
  );
}
