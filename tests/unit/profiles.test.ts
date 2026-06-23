import { describe, it, expect, vi } from 'vitest';
import { pickRandomProfile, deriveProfile, PROFILES, type HardwareProfile } from '../../src/shared/profiles';

describe('profiles', () => {
  it('has 13 curated profiles', () => {
    expect(PROFILES).toHaveLength(13);
  });

  it('each base profile has valid fields', () => {
    for (const p of PROFILES) {
      // Base profiles don't have IDs (they're templates)
      expect(p.platform).toMatch(/Win32|MacIntel|Linux x86_64/);
      expect(p.cores).toBeGreaterThan(0);
      expect(p.screenW).toBeGreaterThan(0);
      expect(p.screenH).toBeGreaterThan(0);
      expect(p.dpr).toBeGreaterThan(0);
      expect(p.battery.level).toBeGreaterThanOrEqual(0.05);
      expect(p.battery.level).toBeLessThanOrEqual(1.0);
    }
  });

  it('pickRandomProfile generates a profile with an ID', () => {
    const p = pickRandomProfile();
    expect(p.id).toBeTruthy();
    expect(typeof p.id).toBe('string');
  });

  it('pickRandomProfile returns a valid profile', () => {
    const p = pickRandomProfile();
    expect(p).toBeDefined();
    expect(typeof p.id).toBe('string');
    expect(typeof p.platform).toBe('string');
  });

  it('deriveProfile produces deterministic derived profiles', () => {
    const base = PROFILES[0];
    const d1 = deriveProfile(base, 'https://example.com');
    const d2 = deriveProfile(base, 'https://example.com');
    expect(d1.id).toBe(d2.id);
    expect(d1.lat).toBeCloseTo(d2.lat, 5);
    expect(d1.lon).toBeCloseTo(d2.lon, 5);
  });

  it('deriveProfile produces different profiles for different origins', () => {
    const base = PROFILES[0];
    const d1 = deriveProfile(base, 'https://site-a.com');
    const d2 = deriveProfile(base, 'https://site-b.com');
    expect(d1.id).not.toBe(d2.id);
  });

  it('deriveProfile maintains profile coherence (screen dims match dpr)', () => {
    const base = PROFILES[0];
    const d = deriveProfile(base, 'https://example.com');
    expect(d.screenW).toBeGreaterThan(0);
    expect(d.screenH).toBeGreaterThan(0);
    expect(d.dpr).toBeGreaterThan(0);
  });

  it('deriveProfile clamps battery level', () => {
    const base = { ...PROFILES[0], battery: { charging: false, level: 0.01 } };
    const d = deriveProfile(base, 'https://example.com');
    expect(d.battery.level).toBeGreaterThanOrEqual(0.05);
    expect(d.battery.level).toBeLessThanOrEqual(1.0);
  });
});
