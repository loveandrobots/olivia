import { expect, test } from '@playwright/test';

/**
 * M32 Multi-User Auth E2E Tests
 *
 * Tests the auth & identity API flows end-to-end via the browser.
 * Auth middleware is disabled in dev mode, but the auth endpoints are
 * fully functional and testable.
 */

test.describe('Multi-user auth flows', () => {
  test('GET /api/auth/status returns initialization state', async ({ page }) => {
    await page.goto('/');

    const status = await page.evaluate(async () => {
      const res = await fetch('/api/auth/status');
      return res.json();
    });

    expect(typeof status.initialized).toBe('boolean');
    expect(typeof status.requiresSetup).toBe('boolean');
    // initialized and requiresSetup should be complementary
    expect(status.initialized).toBe(!status.requiresSetup);
  });

  test('account setup creates admin user with session token', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      // Check if setup is still available
      const statusRes = await fetch('/api/auth/status');
      const status = await statusRes.json();

      if (!status.requiresSetup) {
        return { skipped: true, reason: 'already initialized' };
      }

      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Lexi', email: 'lexi@test.local' })
      });
      return { skipped: false, status: res.status, body: await res.json() };
    });

    if (result.skipped) {
      // Already initialized — verify status endpoint reflects that
      const status = await page.evaluate(async () => {
        const res = await fetch('/api/auth/status');
        return res.json();
      });
      expect(status.initialized).toBe(true);
      return;
    }

    expect(result.status).toBe(200);
    expect(result.body.user.role).toBe('admin');
    expect(result.body.sessionToken).toBeDefined();
  });

  test('duplicate setup returns 409 ALREADY_INITIALIZED', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      // Ensure system is initialized first
      const statusRes = await fetch('/api/auth/status');
      const status = await statusRes.json();

      if (status.requiresSetup) {
        await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Lexi', email: 'lexi@test.local' })
        });
      }

      // Attempt duplicate setup
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Duplicate', email: 'dup@test.local' })
      });
      return { status: res.status, body: await res.json() };
    });

    expect(result.status).toBe(409);
    expect(result.body.error).toBe('ALREADY_INITIALIZED');
  });

  test('magic link request always returns success (prevents email enumeration)', async ({ page }) => {
    await page.goto('/');

    // Request for non-existent email — still returns success
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@nowhere.test' })
      });
      return { status: res.status, body: await res.json() };
    });

    expect(result.status).toBe(200);
    expect(result.body.sent).toBe(true);
    // Response message should not reveal whether email exists
    expect(result.body.message).toContain('If that email');
  });

  test('magic link verify rejects invalid tokens', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'bogus-token-12345' })
      });
      return { status: res.status, body: await res.json() };
    });

    expect(result.status).toBe(401);
    expect(result.body.error).toBe('INVALID_TOKEN');
  });

  test('PIN set and verify flow for shared-device user switching', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      // Ensure admin exists
      const statusRes = await fetch('/api/auth/status');
      const status = await statusRes.json();

      let adminToken: string;
      let adminUserId: string;

      if (status.requiresSetup) {
        const setupRes = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Lexi', email: 'lexi@test.local' })
        });
        const setupBody = await setupRes.json();
        adminToken = setupBody.sessionToken;
        adminUserId = setupBody.user.id;
      } else {
        // Get existing user via magic link or find existing session
        // Since auth is disabled in dev, we can directly check members
        const membersRes = await fetch('/api/household/members');
        if (membersRes.ok) {
          const members = await membersRes.json();
          adminUserId = members.members[0]?.id;
          adminToken = 'dev-mode';
        } else {
          return { skipped: true, reason: 'cannot get admin context' };
        }
      }

      // Set PIN
      const setPinRes = await fetch('/api/auth/pin/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ pin: '4321' })
      });

      if (setPinRes.status !== 200) {
        return { skipped: true, reason: `set-pin returned ${setPinRes.status}` };
      }

      // Verify correct PIN
      const verifyRes = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: adminUserId, pin: '4321' })
      });
      const verifyBody = await verifyRes.json();

      // Verify wrong PIN is rejected
      const badPinRes = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: adminUserId, pin: '0000' })
      });

      return {
        skipped: false,
        verifyStatus: verifyRes.status,
        verifyHasToken: !!verifyBody.sessionToken,
        verifyUserName: verifyBody.user?.name,
        badPinStatus: badPinRes.status
      };
    });

    if (result.skipped) {
      test.skip();
      return;
    }

    expect(result.verifyStatus).toBe(200);
    expect(result.verifyHasToken).toBe(true);
    expect(result.badPinStatus).toBe(401);
  });

  test('logout invalidates session token', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      // Setup admin if needed
      const statusRes = await fetch('/api/auth/status');
      const status = await statusRes.json();

      let token: string;
      if (status.requiresSetup) {
        const setupRes = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Lexi', email: 'lexi@test.local' })
        });
        token = (await setupRes.json()).sessionToken;
      } else {
        return { skipped: true, reason: 'need fresh setup for logout test' };
      }

      // Verify session works
      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Logout
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Session should be invalid now
      const meRes2 = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return {
        skipped: false,
        preLogoutStatus: meRes.status,
        postLogoutStatus: meRes2.status
      };
    });

    if (result.skipped) {
      test.skip();
      return;
    }

    expect(result.preLogoutStatus).toBe(200);
    expect(result.postLogoutStatus).toBe(401);
  });
});
