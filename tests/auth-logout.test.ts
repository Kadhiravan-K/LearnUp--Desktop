import { describe, it, expect, beforeEach } from 'vitest';
import { WebFallbackAdapter } from '../src/adapters/WebFallbackAdapter';
import { UserProfile } from '../src/core';

describe('LearnUp-Desktop — Logout and Profile Switching Tests', () => {
  let adapter: WebFallbackAdapter;

  beforeEach(async () => {
    localStorage.clear();
    adapter = new WebFallbackAdapter();
    await adapter.init();
  });

  it('signs out by clearing active profile', async () => {
    // Starts with default guest
    let active = await adapter.getActiveProfile();
    expect(active).not.toBeNull();
    expect(active?.id).toBe('guest_local_default');

    // Simulate handleSignOut: setActiveProfile('')
    await adapter.setActiveProfile('');
    active = await adapter.getActiveProfile();
    expect(active).toBeNull();
  });

  it('allows logging in as an existing profile after sign out', async () => {
    const customProfile: UserProfile = {
      id: 'profile_alice',
      name: 'Alice Learner',
      email: 'alice@example.com',
      color: '#8b5cf6',
      initials: 'AL',
      lockType: 'none',
      updatedAt: new Date().toISOString(),
      isGuest: false,
    };
    await adapter.saveProfile(customProfile);

    // Sign out
    await adapter.setActiveProfile('');
    expect(await adapter.getActiveProfile()).toBeNull();

    // Select Alice
    await adapter.setActiveProfile(customProfile.id);
    const active = await adapter.getActiveProfile();
    expect(active?.id).toBe('profile_alice');
    expect(active?.name).toBe('Alice Learner');
    expect(active?.email).toBe('alice@example.com');
  });

  it('allows selecting guest profile after sign out', async () => {
    // Sign out
    await adapter.setActiveProfile('');
    expect(await adapter.getActiveProfile()).toBeNull();

    // Select guest
    const profiles = await adapter.listProfiles();
    const guest = profiles.find((p) => p.isGuest);
    expect(guest).toBeDefined();

    await adapter.setActiveProfile(guest!.id);
    const active = await adapter.getActiveProfile();
    expect(active?.id).toBe(guest!.id);
    expect(active?.isGuest).toBe(true);
  });
});
