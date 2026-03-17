# Feature Spec: Push Notifications for Proactive Nudges

## Status
- Approved (CEO, D-045, 2026-03-15)

## Summary

Push notifications is the second H5 Phase 2 capability. It extends the proactive nudge surface beyond in-app cards to OS-level device notifications — surfacing the same household nudge content (overdue routines, approaching reminders, overdue planning rituals) when Olivia is not in the foreground. The household member grants notification permission once; Olivia then delivers time-sensitive nudges directly to the device lock screen or notification center. Tapping a push notification opens Olivia to the relevant screen. This is the first Olivia feature that reaches the household member outside the app.

## User Problem

In-app nudges (Phase 1) only work when the PWA is open. A household member who hasn't opened Olivia today will not see that their weekly planning ritual is overdue or that a reminder is due in two hours. The nudge tray is useful when the household is already engaged with the app — but the highest-value nudge moments are precisely the ones when the household isn't looking. Push notifications close this gap: Olivia notices a time-sensitive item and surfaces it on the device, pulling the household member back in at the right moment.

## Target Users

- Primary user: stakeholder (household primary operator) — grants push permission, receives push nudges on their primary device.
- Secondary user: spouse — receives the same household nudges on their device if they have granted push permission.
- Not applicable: server operators manage VAPID keys and background scheduler config.

## Desired Outcome

When a time-sensitive household item (overdue routine, approaching reminder, overdue planning ritual) arises and Olivia is not in the foreground, the household member receives a native device notification. Tapping it opens Olivia directly to the relevant context. Over time, overdue backlogs should be shorter because nudges now reach the household member regardless of whether they remembered to open the app.

## In Scope

- Push permission request flow in the PWA: a user-initiated opt-in prompt requesting notification permission at an appropriate moment (first nudge tray encounter with active nudges, or explicit settings toggle).
- `POST /api/push-subscriptions` endpoint: accepts a `PushSubscription` object (Web Push API standard) from the PWA and stores it server-side.
- `DELETE /api/push-subscriptions/:endpoint` endpoint: removes a push subscription (for permission revocation or device token cleanup).
- `push_subscriptions` table: stores device push subscriptions per household, keyed by endpoint URL. One device = one subscription.
- VAPID key pair: server generates once, stored as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` environment variables. Public key exposed via `GET /api/push-subscriptions/vapid-public-key` for PWA subscription creation.
- Service Worker push event handler: receives push events when app is backgrounded and shows a native notification with the nudge title and action context.
- Notification tap handler: tapping the notification opens the PWA — navigates to home screen (the nudge tray is the Phase 2 navigation target; deep per-entity navigation is Phase 3).
- Server-side nudge push scheduler: a background job running inside the API process that computes the current nudge list using the same logic as `GET /api/nudges` and sends web push messages for active nudges to all subscribed household devices. Runs on a defined interval (Founding Engineer decision; recommendation: every 30 minutes).
- Push deduplication: the scheduler does not push the same `(entityType, entityId)` pair to the same device more than once per configurable window (recommendation: once per 2 hours per item per device). Tracked in a `push_notification_log` table with `(subscriptionId, entityType, entityId, sentAt)` rows, purged after the dedup window expires.
- Stale subscription cleanup: if the push delivery returns a 410 Gone (subscription expired), the server removes it from `push_subscriptions` automatically.
- VAPID email claim: VAPID key pair requires an email in the `sub` field; use a static `mailto:` address (Founding Engineer decision; can be a placeholder contact address from the server environment config).

## Boundaries, Gaps, And Future Direction

**Not in scope:**
- Deep per-entity navigation on notification tap (e.g., opening directly to a specific reminder or routine). Phase 3.
- Notification action buttons in the native notification UI (e.g., "Mark done" directly from the lock screen). Phase 3 — requires Service Worker background sync and complex action handling.
- Per-household push preference settings: quiet hours, per-category opt-out, frequency caps. Phase 3.
- Push notification history or audit log surfaced in the PWA. Phase 3.
- Multi-device push subscription management UI (e.g., a "Devices" settings screen). Phase 3.
- AI-enhanced nudge timing or prioritization for push delivery. Deferred per D-034 and D-042 (requires Phase 1 trust signal evidence; Phase 2 target 3).
- Web push for new entity types beyond the three Phase 1 nudge types (routine occurrences, reminders, planning rituals). Phase 3.

**Known gaps acceptable in Phase 2:**
- iOS Safari PWA push requires iOS 16.4+. Older iOS versions will not receive push notifications — in-app nudges remain available.
- Device-level push permission, once denied, cannot be re-requested by the app. The household member must update permissions in iOS/Android settings. The PWA should handle the denied state gracefully (no error, no repeated requests).
- Notification appears with limited context copy (nudge title + type). Rich notification body customization is deferred.
- Service Worker required: the PWA must have a registered Service Worker to receive push events. If the Service Worker is not registered (e.g., non-HTTPS development), push will not work. In-app nudges continue normally.

**Likely future direction:**
- Per-household quiet hours and category opt-out controls.
- Notification action buttons (complete, snooze directly from the OS notification drawer).
- Consolidated notification summary ("You have 3 overdue household items") when multiple nudges are batched.
- AI-enhanced timing (send pushes at times historically associated with household engagement).

## Workflow

### Permission Opt-In Flow

1. The household member encounters the nudge tray with at least one active nudge (or navigates to a future notification settings screen).
2. If push permission has not been requested on this device, the PWA shows an in-app prompt: "Get notified about overdue routines and reminders even when Olivia is closed." — with "Turn on" and "Not now" buttons.
3. If the household member taps "Turn on," the PWA calls `Notification.requestPermission()`. If granted, the PWA creates a `PushSubscription` via the Service Worker's `pushManager.subscribe()` call using the server's VAPID public key.
4. The PWA sends the `PushSubscription` object (endpoint, p256dh key, auth key) to `POST /api/push-subscriptions`.
5. The server stores the subscription. Push delivery begins on the next scheduler cycle.

### Push Delivery Flow (Server-Side)

1. The nudge push scheduler runs on its configured interval.
2. For each household with at least one `push_subscription`, the scheduler computes the active nudge list (same logic as `GET /api/nudges`).
3. For each active nudge, the scheduler checks the `push_notification_log` for recent pushes for `(subscriptionId, entityType, entityId)` within the dedup window.
4. If no recent push exists, the scheduler sends a web push message to the subscription endpoint using the web-push library + VAPID credentials. The message payload includes: `entityType`, `entityName`, `triggerReason`.
5. On success: logs to `push_notification_log`.
6. On 410 Gone: removes the subscription from `push_subscriptions`.
7. On other delivery errors: logs the error; does not retry in Phase 2 (next scheduler cycle will retry naturally).

### Notification Receipt Flow (Device)

1. The device's browser/OS receives the push event and routes it to the PWA's Service Worker.
2. The Service Worker handles the `push` event and calls `self.registration.showNotification()` with the nudge title and a brief body (e.g., "Morning routine is overdue" or "Dentist appointment reminder due in 2 hours").
3. If the household member taps the notification, the Service Worker handles `notificationclick`: focuses the PWA window if open, or opens Olivia to the home screen.
4. The notification is dismissed from the system notification center on tap.

### Permission Revocation

1. If the household member revokes notification permission in their device settings, the next push delivery to their subscription will return a 410 Gone.
2. The server removes the stale subscription automatically. Push delivery stops.
3. The PWA's next permission check (`Notification.permission === 'denied'`) updates local state; no further permission requests are made.

## Behavior

**Push trigger logic:**
- Identical to `GET /api/nudges` trigger conditions:
  - Routine occurrence overdue: `currentDueDate < today`, not yet completed or skipped.
  - Reminder approaching: `dueDate` within 24-hour threshold, not yet resolved.
  - Planning ritual overdue: routine with `ritualType = 'planning'` and `currentDueDate < today`, occurrence not completed.
- Priority ordering: planning ritual overdue → reminder approaching or overdue → routine overdue; within tier, oldest overdue first.

**Push deduplication:**
- The server does not push the same `(entityType, entityId)` to the same device more than once per dedup window (recommendation: 2 hours).
- The `push_notification_log` table tracks `(subscriptionId, entityType, entityId, sentAt)`. On each scheduler run, entries older than the dedup window are filtered from the "already sent" check — not deleted immediately (Founding Engineer may batch-purge old rows).
- If the item is resolved between scheduler runs, the next scheduler run will not find it in the nudge list and will not push it again.

**VAPID key management:**
- VAPID key pair is generated once (outside the app, e.g., using the `web-push` CLI) and stored as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` environment variables on the server.
- The public key is safe to expose to the PWA (used for subscription creation); the private key must never be logged, returned in API responses, or stored in the database.
- Key rotation is a server operator responsibility. Rotating keys requires re-requesting push subscriptions from all devices (existing subscriptions become invalid).

**What Olivia must never do in this workflow:**
- Send a push notification that causes a record change without explicit user tap in the app.
- Send a push for an item already completed, resolved, or skipped.
- Push the same item to the same device more than once within the dedup window.
- Expose the VAPID private key in any log, API response, or database record.
- Re-request push permission after the household member has denied it.

## Data And Memory

**New tables:**

`push_subscriptions`:
- `id` (UUID, PK)
- `householdId` (FK — scoped to the household, not individual user in Phase 2 consistent with H5 Phase 1 household-wide posture)
- `endpoint` (TEXT, unique — the push subscription endpoint URL)
- `p256dh_key` (TEXT — device public key for payload encryption)
- `auth_key` (TEXT — authentication secret)
- `createdAt`, `updatedAt` (timestamps)

`push_notification_log`:
- `id` (UUID, PK)
- `subscriptionId` (FK → `push_subscriptions`)
- `entityType` (TEXT — 'routine' | 'reminder' | 'planningRitual')
- `entityId` (UUID)
- `sentAt` (timestamp)
- Index on `(subscriptionId, entityType, entityId, sentAt)` for dedup lookups.

**New API endpoints:**
- `GET /api/push-subscriptions/vapid-public-key` — returns the VAPID public key string for PWA subscription creation. No auth required (public key is safe to expose).
- `POST /api/push-subscriptions` — accepts a `PushSubscription` object, stores to `push_subscriptions`. Returns the stored subscription record.
- `DELETE /api/push-subscriptions/:endpoint` — removes a subscription by endpoint URL. Used for explicit revocation.

**Config additions:**
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` env vars — required for push delivery. If absent, the scheduler logs a warning and skips push delivery (does not fail startup).
- `VAPID_CONTACT_EMAIL` — the `mailto:` contact in VAPID headers (required by the web-push spec).

## Permissions And Trust Model

- Advisory-only: a push notification surfaces information and invites action. It does not change any household record. The household member must tap and act inside the app.
- Push permission is explicitly user-initiated (the household member taps "Turn on" in the opt-in prompt). Olivia does not attempt to request push permission without a user-visible opt-in moment.
- Denying push permission is a valid user choice. The app must not present push opt-in repeatedly after a denial.
- Push subscription data (endpoint, keys) is sensitive: it uniquely identifies a device and enables sending arbitrary web push content to that device. It must not be returned in GET responses accessible to other household members in Phase 2.
- The VAPID private key must be treated with the same confidentiality as `ANTHROPIC_API_KEY`: never logged at INFO or above, never returned in any API response, never stored in the database.

## AI Role

- No AI involvement in push notification delivery. Trigger logic and delivery are deterministic.
- Future AI extension (Phase 3+): smart timing (send push based on household engagement patterns); smart batching (send one consolidated push for multiple nudges rather than individual pushes).
- Parts of the workflow that must not depend on AI: all trigger logic, push delivery, deduplication, subscription management.

## Risks And Failure Modes

- **Push delivery failure (non-410):** network errors or temporary provider failures on delivery. The scheduler logs the error and does not retry in Phase 2 — the next scheduler interval is the natural retry. Acceptable in Phase 2.
- **Stale subscription (410 Gone):** push subscription endpoint has expired (device OS invalidated it). The server removes the subscription automatically. The device will not receive push until the household member re-subscribes (next opt-in flow). In Phase 2, there is no proactive re-subscription nudge — household member may simply not receive push until they re-engage with the app.
- **Scheduler performance:** the scheduler queries `GET /api/nudges` logic for all households with subscriptions on each cycle. If households or subscriptions grow large, this query may become expensive. Mitigation: the nudge query is already designed to be computed efficiently from existing entity indexes. Founding Engineer should verify query performance before enabling the scheduler in production.
- **Duplicate push on multi-device household:** if both the stakeholder and spouse have push subscriptions, both devices receive push for the same household nudge. This is correct behavior in Phase 2 (household-wide nudges, not member-targeted). It may feel redundant in a co-located household. Phase 3 mitigation: per-member push targeting.
- **iOS PWA push requirements:** iOS 16.4+ and the PWA must be added to the Home Screen (not just opened in Safari). PWA push in iOS does not work from browser tabs. This constraint must be surfaced in the opt-in prompt or a help tooltip.
- **VAPID key rotation:** if the VAPID private key is compromised or needs rotation, all existing push subscriptions become invalid. The household must re-subscribe. Phase 2 has no automated re-subscription flow — this is a known operational gap.
- **Notification permission UX on iOS:** iOS presents the native permission dialog only once per app. If the household member dismisses it without granting, the app cannot re-request. The in-app opt-in prompt must appear only after the household has seen in-app nudges and understands their value — not on first launch.

## UX Notes

- The opt-in prompt should appear only after the household member has seen at least one active in-app nudge. Leading with a push permission request before demonstrating in-app nudge value is a high-friction pattern that typically gets denied.
- Prompt framing should be concrete and benefit-oriented: "Get notified about your routine schedule and reminders even when Olivia is closed." Not: "Enable notifications."
- Native notification copy should be brief, specific, and household-appropriate: "Morning routine is overdue" or "Grocery store trip — due in 2 hours." Not vague: "You have household items to review."
- On iOS, include a note that the app must be added to the Home Screen for push to work. This can be in a help tooltip adjacent to the opt-in prompt.
- Notification tap opens Olivia to the home screen (nudge tray). This is consistent with Phase 1 nudge placement. Phase 3 deep-link navigation can direct the tap to the specific entity.
- If push permission is denied, the opt-in UI should gracefully hide (not show an error or loop). In-app nudges continue unaffected.
- The absence of push subscription is not visible or disruptive to the household member — the in-app experience is identical whether or not push is enabled.

## Acceptance Criteria

1. The PWA presents an in-app opt-in prompt for push notifications when at least one active nudge is present and push permission has not yet been granted on the device.
2. Tapping "Turn on" in the opt-in prompt triggers `Notification.requestPermission()` and, on grant, creates a `PushSubscription` and sends it to `POST /api/push-subscriptions`.
3. The server stores the push subscription in `push_subscriptions` associated with the household.
4. `GET /api/push-subscriptions/vapid-public-key` returns the VAPID public key for use in subscription creation.
5. When a household has active nudges (overdue routine, approaching reminder, or overdue planning ritual) and at least one active push subscription, the server-side scheduler delivers a web push to the subscribed device(s) on its scheduled interval.
6. The Service Worker receives the push event and shows a native device notification with the nudge entity name and triggering condition.
7. Tapping the notification opens or focuses Olivia and navigates to the home screen.
8. The scheduler does not push the same `(entityType, entityId)` to the same device more than once within the configured dedup window (recommendation: 2 hours).
9. If push delivery returns 410 Gone, the server removes the subscription from `push_subscriptions` automatically.
10. If `VAPID_PUBLIC_KEY` or `VAPID_PRIVATE_KEY` are not set, the scheduler logs a warning and skips push delivery; the API server starts normally; in-app nudges are unaffected.
11. Push is not delivered for items that are already completed, resolved, or skipped.
12. If the household member denies notification permission, the PWA does not re-request permission and does not show an error.
13. The VAPID private key is not logged at INFO or above, not returned in any API response, and not stored in any database table.
14. All existing API tests pass (regression — push notification infrastructure does not break existing nudge or household endpoints).
15. The in-app nudge experience (Phase 1) is fully functional regardless of whether push permission has been granted.

## Validation And Testing

**Household validation:**
- After shipping, observe whether household members opt in to push (opt-in rate is a proxy for in-app nudge utility having been validated per D-042 sequencing rationale).
- Track whether push-notified items are resolved faster than items surfaced only via in-app nudges.
- Monitor stale subscription rate (410 response rate) as an indicator of device/subscription churn.

**Unit tests:**
- Scheduler dedup logic: given an existing `push_notification_log` entry within the window, the same item is not re-queued for push.
- Scheduler dedup logic: given an entry outside the dedup window, the item is re-queued.
- Stale subscription cleanup: 410 response from web-push triggers subscription removal.
- `GET /api/push-subscriptions/vapid-public-key`: returns the configured VAPID public key.
- `POST /api/push-subscriptions`: stores a valid subscription; returns 400 on missing required fields.

**Integration tests:**
- Full push delivery: active nudge exists → scheduler runs → push sent to subscription endpoint (mocked web-push) → `push_notification_log` entry created.
- Dedup: scheduler runs twice within dedup window → second run does not push the same item again.
- 410 cleanup: mock web-push returns 410 → subscription removed from `push_subscriptions` on next scheduler run.
- Regression: all existing nudge API tests and household endpoint tests pass with push tables and scheduler in place.

**Manual validation:**
- On a real device (iOS 16.4+ Home Screen PWA or Android Chrome), grant push permission via opt-in prompt.
- With an overdue routine, confirm a push notification appears on the device within one scheduler interval.
- Tap the notification, confirm Olivia opens to the home screen showing the nudge tray.
- Revoke notification permission in device settings; confirm no further pushes are received; confirm in-app nudges still work.

## Dependencies And Related Learnings

- `docs/specs/proactive-household-nudges.md` — Phase 1 in-app nudge spec. Push notifications extend the same nudge trigger logic and entity types. The Phase 2 spec adds delivery infrastructure only; trigger logic is unchanged.
- D-042: Push notifications confirmed as the second H5 Phase 2 target, sequenced after real AI provider wiring.
- D-039: Push deferred from Phase 1 specifically to validate in-app nudge utility before adding delivery complexity.
- D-002: Advisory-only trust model. A push notification must not modify household records.
- D-008: AiProvider adapter boundary — not directly applicable to push, but the general pattern of keeping infrastructure behind abstraction layers applies. The web-push library and VAPID credentials should be encapsulated in a push delivery service class, not scattered through the scheduler logic.
- L-024: Client-local dismiss state validated in Phase 1. In Phase 2, dismiss state remains client-local; a dismissed in-app nudge does not suppress push delivery for the same item on the same day (push and in-app are independent surfaces).
- L-025: Page Visibility API used for in-app nudge polling. Push delivery is server-initiated — no Page Visibility API dependency on the server side.

## Open Questions

1. **Scheduler interval:** How often should the nudge push scheduler run? Recommendation: every 30 minutes. Founding Engineer decision — must balance freshness (shorter interval = more timely pushes) against API/database load and push fatigue.

2. **Dedup window:** How long before re-pushing the same item to the same device? Recommendation: 2 hours. Shorter windows risk push fatigue if items stay overdue for multiple days; longer windows reduce timely re-notification after snooze.

3. **Household-level vs. member-level push subscriptions:** Phase 2 is household-wide (all subscribed devices receive the same nudges). Should the database schema be designed now to support per-member targeting in Phase 3? **Recommendation: yes — include a nullable `userId` column in `push_subscriptions` from the start.** Founding Engineer decision on whether to wire it in Phase 2 or leave it null for now.

4. **iOS Home Screen requirement:** Should the opt-in prompt include an explicit "add to Home Screen first" instruction for iOS users? Recommendation: yes, surface a brief iOS-specific note adjacent to the prompt. Visual spec decision for Designer.

5. **VAPID contact email:** What email address should be used in the VAPID `mailto:` claim? Founding Engineer / server operator decision. A placeholder like `mailto:household@olivia.local` is acceptable for Phase 2.

6. **Scheduler placement:** Should the nudge push scheduler run as a separate process, as a cron inside the API process, or as a recurring DB-backed job? **Recommendation: in-process recurring interval inside the API server** (consistent with the simplicity precedents in this codebase — no external job queue needed at household scale). Founding Engineer decision.

## Facts, Assumptions, And Decisions

**Facts:**
- Web Push API + VAPID is the standard cross-platform mechanism for PWA push notifications. No proprietary push SDK is needed for web.
- iOS PWA push requires iOS 16.4+ and Home Screen installation. Push from Safari browser tabs is not supported.
- `push_subscriptions` is the only new table expected in Phase 2 besides the dedup log.
- The Phase 1 nudge trigger logic (`GET /api/nudges` computed query) is the correct source for push trigger decisions.

**Assumptions:**
- In-app nudge utility has been validated by the time Phase 2 ships, per D-042 sequencing rationale (real AI wiring first, push second).
- A household-wide push posture (all subscribed devices receive all nudges) is acceptable in Phase 2. Per-member targeting is a Phase 3 refinement.
- A 30-minute scheduler interval is sufficiently timely for household nudge delivery without introducing excessive API load at household scale.

**Decisions:**
- Push permission is opt-in only — no automatic permission request at app launch.
- Notification tap navigates to home screen (nudge tray), not deep-linked to specific entity. Phase 3.
- VAPID keys are server-side environment variables, never stored in the database.
- Push delivery failures (non-410) are not retried in Phase 2; the next scheduler cycle is the natural retry.

## Deferred Decisions

- Per-member push targeting and quiet hours — Phase 3.
- Notification action buttons (complete/snooze from lock screen) — Phase 3.
- Deep per-entity navigation on notification tap — Phase 3.
- Batched notification summary ("3 overdue items") — Phase 3.
- AI-enhanced push timing — Phase 3+ per D-034 and D-042.
- VAPID key rotation workflow — server operator responsibility, not specified in Phase 2.
