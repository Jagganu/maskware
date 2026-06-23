import type { HardwareProfile, ShieldConfig } from "./types";

const CHANNEL_PROFILE = "maskware-profile";
const CHANNEL_DATA = "maskware-data";
const CHANNEL_CMD = "maskware-cmd";

export type ChannelMessage =
  | { type: "profile-updated"; profile: HardwareProfile }
  | { type: "shields-updated"; config: ShieldConfig }
  | { type: "page-loaded"; origin: string; url: string }
  | { type: "page-unloaded" }
  | { type: "cmd-reload-settings" }
  | { type: "cmd-new-identity" };

type MessageHandler = (msg: ChannelMessage) => void;

let profileChannel: BroadcastChannel | null = null;
let dataChannel: BroadcastChannel | null = null;
let cmdChannel: BroadcastChannel | null = null;

const handlers = new Map<string, Set<MessageHandler>>();

function getChannel(name: string): BroadcastChannel {
  if (name === CHANNEL_PROFILE) {
    if (!profileChannel) profileChannel = new BroadcastChannel(CHANNEL_PROFILE);
    return profileChannel;
  }
  if (name === CHANNEL_DATA) {
    if (!dataChannel) dataChannel = new BroadcastChannel(CHANNEL_DATA);
    return dataChannel;
  }
  if (name === CHANNEL_CMD) {
    if (!cmdChannel) cmdChannel = new BroadcastChannel(CHANNEL_CMD);
    return cmdChannel;
  }
  throw new Error(`Unknown channel: ${name}`);
}

export function subscribe(
  channel: string,
  handler: MessageHandler,
): () => void {
  const ch = getChannel(channel);
  if (!handlers.has(channel)) handlers.set(channel, new Set());
  handlers.get(channel)!.add(handler);

  const listener = (event: MessageEvent<ChannelMessage>) => handler(event.data);
  ch.addEventListener("message", listener);

  return () => {
    ch.removeEventListener("message", listener);
    handlers.get(channel)?.delete(handler);
  };
}

export function publish(channel: string, msg: ChannelMessage): void {
  getChannel(channel).postMessage(msg);
}

export function cleanup(): void {
  profileChannel?.close();
  dataChannel?.close();
  cmdChannel?.close();
  profileChannel = null;
  dataChannel = null;
  cmdChannel = null;
  handlers.clear();
}
