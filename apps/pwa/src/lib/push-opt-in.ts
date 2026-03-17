import { useState, useEffect, useCallback } from 'react';

const DISMISSED_KEY = 'olivia-push-opt-in-dismissed';

export type PushOptInState = 'prompt' | 'granted' | 'denied' | 'unsupported' | 'dismissed';

export function usePushOptIn() {
  const [state, setState] = useState<PushOptInState>('unsupported');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported');
      return;
    }
    const perm = Notification.permission;
    if (perm === 'granted') { setState('granted'); return; }
    if (perm === 'denied') { setState('denied'); return; }
    if (localStorage.getItem(DISMISSED_KEY)) { setState('dismissed'); return; }
    setState('prompt');
  }, []);

  const requestPermission = useCallback(async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setState(perm === 'denied' ? 'denied' : 'dismissed');
      return;
    }
    setState('granted');
    try {
      const vapidRes = await fetch('/api/push-subscriptions/vapid-public-key');
      const { vapidPublicKey } = await vapidRes.json() as { vapidPublicKey: string | null };
      if (!vapidPublicKey) return;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });
      const subJson = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
      });
    } catch (err) {
      console.warn('push subscription failed', err);
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setState('dismissed');
  }, []);

  return { state, requestPermission, dismiss };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
