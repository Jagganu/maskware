import { describe, it, expect } from 'vitest';
import { validateProfile, REQUIRED_FIELDS, type HardwareProfile } from '../../src/shared/types';

describe('types validation', () => {
  const validProfile: HardwareProfile = {
    id: 'test-123',
    version: 2,
    createdAt: Date.now(),
    platform: 'Win32',
    oscpu: 'Windows NT 10.0',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    gpuVendor: 'Google Inc.',
    gpuRenderer: 'ANGLE (NVIDIA GeForce RTX 3080)',
    shortGpu: 'NVIDIA GeForce RTX 3080',
    fullGpu: 'NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0',
    cores: 16,
    memory: 32,
    screenW: 1920,
    screenH: 1080,
    availW: 1920,
    availH: 1040,
    dpr: 1,
    colorDepth: 24,
    touchPts: 0,
    isMobile: false,
    timezone: 'America/New_York',
    language: 'en-US',
    languages: ['en-US', 'en'],
    city: 'New York',
    country: 'US',
    lat: 40.7128,
    lon: -74.006,
    connectionType: 'wifi',
    connectionEffective: '4g',
    downlink: 10,
    rtt: 50,
    battery: { charging: false, level: 0.85 },
    plugins: [],
    mimeTypes: [],
    clockSkew: 0,
  };

  it('validates a complete profile', () => {
    const result = validateProfile(validProfile);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('rejects null', () => {
    const result = validateProfile(null);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(REQUIRED_FIELDS);
  });

  it('rejects missing fields', () => {
    const partial = { ...validProfile };
    delete (partial as any).platform;
    const result = validateProfile(partial);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('platform');
  });

  it('REQUIRED_FIELDS matches HardwareProfile keys', () => {
    const profileKeys = Object.keys(validProfile) as (keyof HardwareProfile)[];
    for (const field of REQUIRED_FIELDS) {
      expect(profileKeys).toContain(field);
    }
  });
});
