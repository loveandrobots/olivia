import { Link } from '@tanstack/react-router';
import { House, CheckSquare, Sparkle, ListChecks, FolderSimple } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

export type NavTab = 'home' | 'tasks' | 'olivia' | 'lists' | 'memory';

const NAV_ITEMS: Array<{ tab: NavTab; to: string; icon: Icon; label: string }> = [
  { tab: 'home',   to: '/',        icon: House,        label: 'Home'   },
  { tab: 'tasks',  to: '/tasks',   icon: CheckSquare,  label: 'Tasks'  },
  { tab: 'olivia', to: '/olivia',  icon: Sparkle,      label: 'Olivia' },
  { tab: 'lists',  to: '/lists',   icon: ListChecks,   label: 'Lists'  },
  { tab: 'memory', to: '/history', icon: FolderSimple,  label: 'Memory' },
];

export function BottomNav({ activeTab, nudgeBadgeCount = 0 }: { activeTab: NavTab; nudgeBadgeCount?: number }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ tab, to, icon: IconComponent, label }) => {
        const isActive = activeTab === tab;
        return (
          <Link
            key={tab}
            to={to}
            className={`nav-btn${isActive ? ' active' : ''}`}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="nav-icon-wrap" style={{ position: 'relative', display: 'inline-flex' }}>
              <span className="nav-icon" aria-hidden="true">
                <IconComponent size={24} weight={isActive ? 'fill' : 'regular'} />
              </span>
              {tab === 'home' && nudgeBadgeCount > 0 && (
                <span
                  className="nudge-nav-badge"
                  aria-label={`${nudgeBadgeCount > 9 ? '9+' : nudgeBadgeCount} active nudges`}
                >
                  {nudgeBadgeCount > 9 ? '9+' : nudgeBadgeCount}
                </span>
              )}
            </span>
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
