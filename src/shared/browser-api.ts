export const API = ((): typeof chrome => {
  if (typeof chrome !== "undefined" && chrome.runtime?.id) return chrome;
  if (typeof globalThis !== "undefined" && (globalThis as any).browser)
    return (globalThis as any).browser as unknown as typeof chrome;
  throw new Error("No browser API found");
})();

export const SUPPORTS = {
  declarativeNetRequest: (): boolean => !!API.declarativeNetRequest,
  offscreen: (): boolean => !!API.offscreen,
  scripting: (): boolean => !!API.scripting,
  deviceMemory: (): boolean => "deviceMemory" in Navigator.prototype,
  oscpu: (): boolean => "oscpu" in Navigator.prototype,
  connection: (): boolean => "connection" in Navigator.prototype,
  getBattery: (): boolean => "getBattery" in Navigator.prototype,
  userAgentData: (): boolean => "userAgentData" in Navigator.prototype,
  audioContext: (): boolean =>
    !!window.AudioContext || !!(window as any).webkitAudioContext,
};
