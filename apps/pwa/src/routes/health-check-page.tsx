import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react';
import { useRole } from '../lib/role';
import {
  fetchStaleItems,
  confirmFreshness,
  archiveFreshnessEntity,
  completeHealthCheck,
  type StaleItem
} from '../lib/api';
import { saveHealthCheckProgress, getHealthCheckProgress, clearHealthCheckProgress } from '../lib/client-db';

const TYPE_LABELS: Record<string, string> = {
  inbox: 'Tasks',
  routine: 'Routines',
  reminder: 'Reminders',
  list: 'Lists',
  mealPlan: 'Meal Plans'
};

const TYPE_ICONS: Record<string, string> = {
  inbox: '\uD83D\uDCCB',
  routine: '\uD83D\uDD04',
  reminder: '\uD83D\uDD14',
  list: '\uD83D\uDCDD',
  mealPlan: '\uD83C\uDF7D\uFE0F'
};

export function HealthCheckPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useRole();
  const isSpouse = role === 'spouse';

  const [items, setItems] = useState<StaleItem[]>([]);
  const [totalStaleCount, setTotalStaleCount] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [archiveTarget, setArchiveTarget] = useState<StaleItem | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [result, progress] = await Promise.all([fetchStaleItems(), getHealthCheckProgress()]);
        setItems(result.items);
        setTotalStaleCount(result.totalStaleCount);
        if (progress) {
          setReviewedIds(new Set(progress.reviewedItemIds));
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    void load();
  }, []);

  const remainingItems = items.filter((item) => !reviewedIds.has(item.entityId));
  const allReviewed = remainingItems.length === 0 && items.length > 0;

  const handleStillActive = useCallback(async (item: StaleItem) => {
    try {
      await confirmFreshness(item.entityType, item.entityId, role, 1);
    } catch {
      // version conflict — proceed anyway, item was updated
    }
    setReviewedIds((prev) => new Set([...prev, item.entityId]));
    void saveHealthCheckProgress(item.entityId);
  }, [role]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return;
    try {
      await archiveFreshnessEntity(archiveTarget.entityType, archiveTarget.entityId, role, 1);
    } catch {
      // version conflict — proceed anyway
    }
    setReviewedIds((prev) => new Set([...prev, archiveTarget.entityId]));
    void saveHealthCheckProgress(archiveTarget.entityId);
    setArchiveTarget(null);
  }, [archiveTarget, role]);

  const handleComplete = useCallback(async () => {
    setCompleted(true);
    try {
      await completeHealthCheck();
      await clearHealthCheckProgress();
      void queryClient.invalidateQueries({ queryKey: ['health-check-state'] });
    } catch {
      // ignore
    }
  }, [queryClient]);

  // Auto-complete when all items reviewed
  useEffect(() => {
    if (allReviewed && !completed && !loading) {
      void handleComplete();
    }
  }, [allReviewed, completed, loading, handleComplete]);

  // Group remaining items by entity type
  const grouped = remainingItems.reduce<Record<string, StaleItem[]>>((acc, item) => {
    (acc[item.entityType] ??= []).push(item);
    return acc;
  }, {});

  const overflowCount = totalStaleCount > items.length ? totalStaleCount - items.length : 0;

  if (loading) {
    return (
      <div className="health-check-page">
        <header className="health-check-page__header">
          <button type="button" className="health-check-page__back" onClick={() => void navigate({ to: '/' })}>
            <ArrowLeft size={20} /> Back
          </button>
          <h1 className="health-check-page__title">Health check</h1>
        </header>
        <div className="health-check-page__loading">Loading...</div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="health-check-page">
        <header className="health-check-page__header">
          <button type="button" className="health-check-page__back" onClick={() => void navigate({ to: '/' })}>
            <ArrowLeft size={20} /> Back
          </button>
          <h1 className="health-check-page__title">Health check</h1>
        </header>
        <div className="health-check-page__complete">
          <CheckCircle size={48} weight="fill" className="health-check-page__check-icon" />
          <div className="health-check-page__complete-title">All caught up!</div>
          <div className="health-check-page__complete-body">
            Everything looks good. We{'\u2019'}ll check in again next month.
          </div>
          <button
            type="button"
            className="btn-primary health-check-page__home-btn"
            onClick={() => void navigate({ to: '/' })}
          >
            Go to home {'\u2192'}
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="health-check-page">
        <header className="health-check-page__header">
          <button type="button" className="health-check-page__back" onClick={() => void navigate({ to: '/' })}>
            <ArrowLeft size={20} /> Back
          </button>
          <h1 className="health-check-page__title">Health check</h1>
        </header>
        <div className="health-check-page__complete">
          <CheckCircle size={48} weight="fill" className="health-check-page__check-icon" />
          <div className="health-check-page__complete-title">Nothing to review</div>
          <div className="health-check-page__complete-body">
            All your household data looks fresh. Nice work!
          </div>
          <button
            type="button"
            className="btn-primary health-check-page__home-btn"
            onClick={() => void navigate({ to: '/' })}
          >
            Go to home {'\u2192'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="health-check-page">
      <header className="health-check-page__header">
        <button type="button" className="health-check-page__back" onClick={() => void navigate({ to: '/' })}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1 className="health-check-page__title">Health check</h1>
        <div className="health-check-page__subtitle">
          {remainingItems.length} item{remainingItems.length !== 1 ? 's' : ''} to review
        </div>
      </header>

      <div className="health-check-page__content">
        {Object.entries(grouped).map(([type, typeItems]) => (
          <div key={type} className="health-check-section">
            <div className="health-check-section__header">
              <span className="health-check-section__icon">{TYPE_ICONS[type] ?? ''}</span>
              <span className="health-check-section__label">{TYPE_LABELS[type] ?? type}</span>
            </div>
            {typeItems.map((item) => (
              <div key={item.entityId} className="health-check-item" role="article" aria-label={item.entityName}>
                <div className="health-check-item__info">
                  <div className="health-check-item__name">{item.entityName}</div>
                  <div className="health-check-item__activity">{item.lastActivityDescription}</div>
                </div>
                <div className="health-check-item__actions">
                  <button
                    type="button"
                    className="health-check-item__btn health-check-item__btn--primary"
                    disabled={isSpouse}
                    onClick={() => void handleStillActive(item)}
                  >
                    Still active
                  </button>
                  {item.entityType !== 'mealPlan' && (
                    <button
                      type="button"
                      className="health-check-item__btn health-check-item__btn--ghost"
                      disabled={isSpouse}
                      onClick={() => setArchiveTarget(item)}
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

        {overflowCount > 0 && (
          <div className="health-check-overflow">
            and {overflowCount} more {'\u2014'} we{'\u2019'}ll catch those next time
          </div>
        )}
      </div>

      {/* Archive confirmation */}
      {archiveTarget && (
        <div className="freshness-archive-confirm" role="alertdialog" aria-label="Archive confirmation">
          <div className="freshness-archive-confirm__backdrop" onClick={() => setArchiveTarget(null)} />
          <div className="freshness-archive-confirm__sheet">
            <div className="freshness-archive-confirm__title">
              Archive {archiveTarget.entityName}?
            </div>
            <div className="freshness-archive-confirm__body">
              This item will be archived. You can restore it later if needed.
            </div>
            <div className="freshness-archive-confirm__actions">
              <button type="button" className="btn-secondary" onClick={() => setArchiveTarget(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={() => void handleArchiveConfirm()}>Archive</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
