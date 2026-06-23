import { describe, it, expect } from 'vitest';
import { hashString, blake3seed, clamp, SeededRNG } from '../../src/shared/crypto';

describe('crypto utilities', () => {
  describe('hashString', () => {
    it('produces consistent hashes for same input', () => {
      expect(hashString('test')).toBe(hashString('test'));
    });

    it('produces different hashes for different input', () => {
      expect(hashString('a')).not.toBe(hashString('b'));
    });

    it('returns a number', () => {
      expect(typeof hashString('test')).toBe('number');
    });
  });

  describe('blake3seed', () => {
    it('returns deterministic number from string', () => {
      expect(blake3seed('test')).toBe(blake3seed('test'));
      expect(typeof blake3seed('something')).toBe('number');
    });
  });

  describe('clamp', () => {
    it('clamps to minimum', () => {
      expect(clamp(-1, 0, 100)).toBe(0);
    });

    it('clamps to maximum', () => {
      expect(clamp(200, 0, 100)).toBe(100);
    });

    it('returns value unchanged within range', () => {
      expect(clamp(50, 0, 100)).toBe(50);
    });
  });

  describe('SeededRNG', () => {
    it('produces deterministic sequence', () => {
      const rng1 = new SeededRNG(42);
      const rng2 = new SeededRNG(42);
      expect(rng1.next()).toBe(rng2.next());
      expect(rng1.next()).toBe(rng2.next());
    });

    it('produces different sequences for different seeds', () => {
      const rng1 = new SeededRNG(1);
      const rng2 = new SeededRNG(2);
      expect(rng1.next()).not.toBe(rng2.next());
    });

    it('int returns value in range', () => {
      const rng = new SeededRNG(42);
      for (let i = 0; i < 100; i++) {
        const v = rng.int(-10, 10);
        expect(v).toBeGreaterThanOrEqual(-10);
        expect(v).toBeLessThanOrEqual(10);
      }
    });

    it('pick selects from array', () => {
      const rng = new SeededRNG(1);
      const arr = ['a', 'b', 'c'];
      const val = rng.pick(arr);
      expect(arr).toContain(val);
    });

    it('shuffle returns same length array', () => {
      const rng = new SeededRNG(1);
      const arr = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(arr);
      expect(shuffled).toHaveLength(arr.length);
      expect(shuffled.sort()).toEqual(arr.sort());
    });
  });
});