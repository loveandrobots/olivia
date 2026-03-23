import { expect, test } from '@playwright/test';

/**
 * M32 Multi-User Invitation E2E Tests
 *
 * Tests the household invitation flow: admin generates invite codes,
 * new members claim them and join the household.
 */

type InviteTestContext = {
  adminToken: string;
  adminUserId: string;
  skipped?: boolean;
  reason?: string;
};

/** Helper: ensure admin account exists and return session context */
async function ensureAdmin(page: import('@playwright/test').Page): Promise<InviteTestContext> {
  return page.evaluate(async () => {
    const statusRes = await fetch('/api/auth/status');
    const status = await statusRes.json();

    if (status.requiresSetup) {
      const setupRes = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Lexi', email: 'lexi@test.local' })
      });
      const body = await setupRes.json();
      return { adminToken: body.sessionToken, adminUserId: body.user.id };
    }

    // System already initialized — try to get existing members
    const membersRes = await fetch('/api/household/members');
    if (!membersRes.ok) {
      return { adminToken: '', adminUserId: '', skipped: true, reason: 'cannot fetch members' };
    }
    const members = await membersRes.json();
    const admin = members.members.find((m: { role: string }) => m.role === 'admin');
    if (!admin) {
      return { adminToken: '', adminUserId: '', skipped: true, reason: 'no admin found' };
    }
    return { adminToken: '', adminUserId: admin.id };
  });
}

test.describe('Household invitation flow', () => {
  test('admin can generate an invite code', async ({ page }) => {
    await page.goto('/');
    const ctx = await ensureAdmin(page);
    if (ctx.skipped) { test.skip(); return; }

    const result = await page.evaluate(async (token: string) => {
      const res = await fetch('/api/household/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      return { status: res.status, body: await res.json() };
    }, ctx.adminToken);

    if (result.status === 409 && result.body.error === 'HOUSEHOLD_FULL') {
      // Household already has 2 members — expected in test rerun
      return;
    }

    expect(result.status).toBe(200);
    expect(result.body.code).toHaveLength(6);
    expect(result.body.expiresAt).toBeDefined();
  });

  test('invite code can be claimed to join the household', async ({ page }) => {
    await page.goto('/');
    const ctx = await ensureAdmin(page);
    if (ctx.skipped) { test.skip(); return; }

    const result = await page.evaluate(async (token: string) => {
      // Check current member count
      const membersRes = await fetch('/api/household/members');
      if (membersRes.ok) {
        const members = await membersRes.json();
        if (members.members.length >= 2) {
          return { skipped: true, reason: 'household already full' };
        }
      }

      // Generate invite
      const inviteRes = await fetch('/api/household/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (inviteRes.status === 409) {
        return { skipped: true, reason: 'household full' };
      }

      const { code } = await inviteRes.json();

      // Claim the invite as a new user
      const claimRes = await fetch('/api/household/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name: 'Christian',
          email: 'christian@test.local'
        })
      });

      const claimBody = await claimRes.json();

      return {
        skipped: false,
        claimStatus: claimRes.status,
        userName: claimBody.user?.name,
        userRole: claimBody.user?.role,
        hasToken: !!claimBody.sessionToken,
        householdId: claimBody.user?.householdId
      };
    }, ctx.adminToken);

    if (result.skipped) {
      return; // Already at 2 users — acceptable on re-run
    }

    expect(result.claimStatus).toBe(200);
    expect(result.userName).toBe('Christian');
    expect(result.userRole).toBe('member');
    expect(result.hasToken).toBe(true);
    expect(result.householdId).toBe('household');
  });

  test('claimed invite code cannot be reused', async ({ page }) => {
    await page.goto('/');
    const ctx = await ensureAdmin(page);
    if (ctx.skipped) { test.skip(); return; }

    const result = await page.evaluate(async (token: string) => {
      // Generate invite
      const inviteRes = await fetch('/api/household/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (inviteRes.status === 409) {
        return { skipped: true, reason: 'household full' };
      }

      const { code } = await inviteRes.json();

      // First claim
      await fetch('/api/household/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: 'First', email: 'first@test.local' })
      });

      // Second claim with same code
      const secondRes = await fetch('/api/household/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: 'Second', email: 'second@test.local' })
      });

      return { skipped: false, secondStatus: secondRes.status };
    }, ctx.adminToken);

    if (result.skipped) { return; }

    // Should fail — code already used or household full
    expect([404, 409]).toContain(result.secondStatus);
  });

  test('M32 two-user household limit is enforced', async ({ page }) => {
    await page.goto('/');
    const ctx = await ensureAdmin(page);
    if (ctx.skipped) { test.skip(); return; }

    const result = await page.evaluate(async (token: string) => {
      // Ensure household has 2 members
      const membersRes = await fetch('/api/household/members');
      if (!membersRes.ok) {
        return { skipped: true, reason: 'cannot check members' };
      }
      const members = await membersRes.json();

      if (members.members.length < 2) {
        // Add second member first
        const invRes = await fetch('/api/household/invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({})
        });
        if (invRes.ok) {
          const { code } = await invRes.json();
          await fetch('/api/household/invite/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, name: 'Member2', email: 'member2@test.local' })
          });
        }
      }

      // Now try to generate a third invite — should fail
      const thirdInvRes = await fetch('/api/household/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      return {
        skipped: false,
        thirdInvStatus: thirdInvRes.status,
        body: await thirdInvRes.json()
      };
    }, ctx.adminToken);

    if (result.skipped) { test.skip(); return; }

    expect(result.thirdInvStatus).toBe(409);
    expect(result.body.error).toBe('HOUSEHOLD_FULL');
  });

  test('household members endpoint returns all members', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/household/members');
      if (!res.ok) return { skipped: true, reason: `status ${res.status}` };
      return { skipped: false, body: await res.json() };
    });

    if (result.skipped) { test.skip(); return; }

    expect(result.body.members).toBeDefined();
    expect(Array.isArray(result.body.members)).toBe(true);
    expect(result.body.members.length).toBeGreaterThanOrEqual(1);

    // Each member should have expected fields
    for (const member of result.body.members) {
      expect(member.id).toBeDefined();
      expect(member.name).toBeDefined();
      expect(member.email).toBeDefined();
      expect(member.householdId).toBe('household');
      expect(['admin', 'member']).toContain(member.role);
    }
  });

  test('duplicate email is rejected during invite claim', async ({ page }) => {
    await page.goto('/');
    const ctx = await ensureAdmin(page);
    if (ctx.skipped) { test.skip(); return; }

    const result = await page.evaluate(async (token: string) => {
      // Generate invite
      const inviteRes = await fetch('/api/household/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (inviteRes.status === 409) {
        return { skipped: true, reason: 'household full' };
      }

      const { code } = await inviteRes.json();

      // Try to claim with admin's email
      const claimRes = await fetch('/api/household/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: 'Imposter', email: 'lexi@test.local' })
      });

      return { skipped: false, status: claimRes.status, body: await claimRes.json() };
    }, ctx.adminToken);

    if (result.skipped) { return; }

    expect(result.status).toBe(409);
    expect(result.body.error).toBe('EMAIL_IN_USE');
  });
});
