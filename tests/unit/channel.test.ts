import { describe, it, expect, beforeAll, vi } from 'vitest';

const mockListeners: Record<string, Array<(e: MessageEvent) => void>> = {};
const mockChannels: Record<string, { postMessage: (msg: unknown) => void; close: () => void }> = {};

class MockBroadcastChannel {
  name: string;
  constructor(name: string) {
    this.name = name;
    mockChannels[name] = this;
    mockListeners[name] = [];
  }
  postMessage(msg: unknown) {
    (mockListeners[this.name] ?? []).forEach((fn) => fn({ data: msg } as MessageEvent));
  }
  addEventListener(_type: string, fn: (e: MessageEvent) => void) {
    mockListeners[this.name] ??= [];
    mockListeners[this.name]!.push(fn);
  }
  removeEventListener(_type: string, fn: (e: MessageEvent) => void) {
    mockListeners[this.name] = (mockListeners[this.name] ?? []).filter((f) => f !== fn);
  }
  close() {
    delete mockChannels[this.name];
    delete mockListeners[this.name];
  }
}

(globalThis as any).BroadcastChannel = MockBroadcastChannel;

import { subscribe, publish, cleanup } from '../../src/shared/channel';

describe('channel communication', () => {
  beforeAll(() => {
    cleanup();
  });

  it('publishes and receives profile-updated messages', () => {
    const received: any[] = [];
    const unsub = subscribe('maskware-profile', (msg) => received.push(msg));

    publish('maskware-profile', { type: 'profile-updated', profile: { id: 'test' } as any });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('profile-updated');
    expect((received[0] as any).profile.id).toBe('test');

    unsub();
  });

  it('unsubscribes correctly', () => {
    const received: any[] = [];
    const unsub = subscribe('maskware-data', (msg) => received.push(msg));

    publish('maskware-data', { type: 'page-loaded', origin: 'https://test.com', url: 'https://test.com/' });
    expect(received).toHaveLength(1);

    unsub();
    publish('maskware-data', { type: 'page-loaded', origin: 'https://test2.com', url: 'https://test2.com/' });
    expect(received).toHaveLength(1);
  });

  it('handles multiple subscribers', () => {
    const results: number[] = [];
    const unsub1 = subscribe('maskware-cmd', () => results.push(1));
    const unsub2 = subscribe('maskware-cmd', () => results.push(2));

    publish('maskware-cmd', { type: 'cmd-reload-settings' });
    expect(results).toEqual([1, 2]);

    unsub1();
    results.length = 0;
    publish('maskware-cmd', { type: 'cmd-new-identity' });
    expect(results).toEqual([2]);
  });
});