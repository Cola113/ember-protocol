/**
 * Isomorphic KV backends for the T2 datastore.
 * Browser default: localStorage. Node / Vercel default: process memory.
 * No Postgres, NextAuth, or cross-device sync in T2.
 */

export type KvBackendKind = "memory" | "localStorage";

export interface KvBackend {
  readonly kind: KvBackendKind;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
}

export class MemoryKv implements KvBackend {
  readonly kind = "memory" as const;
  private readonly map = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  async set(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async keys(prefix?: string): Promise<string[]> {
    const all = Array.from(this.map.keys());
    return prefix ? all.filter((key) => key.startsWith(prefix)) : all;
  }

  async clear(): Promise<void> {
    this.map.clear();
  }
}

/** Prefix is isolated from save-system's `ember_protocol_save_*` keys. */
export const DATASTORE_LOCALSTORAGE_PREFIX = "ember_protocol_ds_";

export class LocalStorageKv implements KvBackend {
  readonly kind = "localStorage" as const;

  constructor(private readonly prefix = DATASTORE_LOCALSTORAGE_PREFIX) {}

  private namespaced(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<string | null> {
    const storage = browserStorage();
    if (!storage) return null;
    try {
      return storage.getItem(this.namespaced(key));
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    const storage = browserStorage();
    if (!storage) {
      throw new Error("localStorage is not available in this runtime.");
    }
    storage.setItem(this.namespaced(key), value);
  }

  async delete(key: string): Promise<void> {
    const storage = browserStorage();
    if (!storage) return;
    try {
      storage.removeItem(this.namespaced(key));
    } catch {
      // ignore quota / private-mode races
    }
  }

  async keys(prefix?: string): Promise<string[]> {
    const storage = browserStorage();
    if (!storage) return [];
    const found: string[] = [];
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const fullKey = storage.key(index);
        if (!fullKey || !fullKey.startsWith(this.prefix)) continue;
        const relative = fullKey.slice(this.prefix.length);
        if (!prefix || relative.startsWith(prefix)) found.push(relative);
      }
    } catch {
      return [];
    }
    return found;
  }

  async clear(): Promise<void> {
    const owned = await this.keys();
    await Promise.all(owned.map((key) => this.delete(key)));
  }
}

export function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function detectKvKind(): KvBackendKind {
  return browserStorage() ? "localStorage" : "memory";
}

export function createKvBackend(kind: KvBackendKind | "auto" = "auto"): KvBackend {
  const resolved = kind === "auto" ? detectKvKind() : kind;
  if (resolved === "localStorage") {
    if (!browserStorage()) return new MemoryKv();
    return new LocalStorageKv();
  }
  return new MemoryKv();
}
