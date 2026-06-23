import type { HardwareProfile } from "./types";
import { validateProfile } from "./types";
import { pickRandomProfile, deriveProfile, PROFILE_VERSION, migrateProfile } from "./profiles";

const DB_NAME = "maskware-profiles";
const DB_VERSION = 1;
const PROFILE_KEY = "active";
const PER_ORIGIN_KEY = "origins";

let dbPromise: Promise<IDBDatabase> | null = null;
const derivedProfiles = new Map<string, HardwareProfile>();

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("profiles")) {
        db.createObjectStore("profiles", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function migrateStoredProfile(profile: HardwareProfile): Promise<HardwareProfile> {
  if (profile.version < PROFILE_VERSION) {
    return migrateProfile(profile);
  }
  return profile;
}

export async function getActiveProfile(): Promise<HardwareProfile | null> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction("profiles", "readonly");
    const store = tx.objectStore("profiles");
    const req = store.get(PROFILE_KEY);
    req.onsuccess = async () => {
      const result = req.result as
        | { key: string; profile: HardwareProfile }
        | undefined;
      if (result?.profile) {
        const migrated = await migrateStoredProfile(result.profile);
        resolve(migrated);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

export async function setActiveProfile(
  profile: HardwareProfile,
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction("profiles", "readwrite");
    const store = tx.objectStore("profiles");
    store.put({ key: PROFILE_KEY, profile });
    tx.oncomplete = () => resolve();
  });
}

export async function ensureProfile(): Promise<HardwareProfile> {
  let profile = await getActiveProfile();
  if (!profile || !validateProfile(profile).valid) {
    profile = pickRandomProfile();
    await setActiveProfile(profile);
  }
  return profile;
}

export async function regenerateProfile(): Promise<HardwareProfile> {
  derivedProfiles.clear();
  const profile = pickRandomProfile();
  await setActiveProfile(profile);
  return profile;
}

export async function getDerivedProfile(
  origin: string,
): Promise<HardwareProfile> {
  const cached = derivedProfiles.get(origin);
  if (cached) return cached;

  const base = await getActiveProfile();
  if (!base) return ensureProfile().then((p) => getDerivedProfile(origin));

  const derived = deriveProfile(base, origin);
  derivedProfiles.set(origin, derived);
  return derived;
}

export async function getBatteryForTimestamp(
  profile: HardwareProfile,
  timestamp: number,
): Promise<HardwareProfile["battery"]> {
  const elapsed = (timestamp - profile.createdAt) / 1000;
  const dischargeRate = profile.isMobile ? 0.00003 : 0.00001;
  const baseLevel = profile.battery.level;
  let level = profile.battery.charging
    ? Math.min(1, baseLevel + elapsed * dischargeRate)
    : Math.max(0.05, baseLevel - elapsed * dischargeRate);
  return { ...profile.battery, level };
}
