/**
 * T2 unified datastore.
 *
 * Local-first providers:
 * - Browser: localStorage (`ember_protocol_ds_*`), isolated from save-system slots
 * - Node / Vercel (no Postgres): in-process memory
 *
 * Collections:
 * - dossier_cache  planetId+landingSiteId → generated dossier only
 * - npc_cache      NPC dialogue memory
 * - player_state   Curator facade over `lib/save-system.ts` + truth-state sidecar
 * - synthesis_attempts  last N Curator attempts
 *
 * Out of scope (P3): NextAuth, Neon/Postgres, cross-device sync.
 */

import { cacheHit } from "@/lib/schemas/common";
import type { Dossier } from "@/lib/schemas/scribe";
import {
  createKvBackend,
  MemoryKv,
  type KvBackend,
  type KvBackendKind
} from "@/lib/storage/backend";
import {
  createDossierCacheStore,
  createNpcCacheStore,
  createPlayerStateStore,
  createSynthesisAttemptsStore,
  dossierCacheKey,
  type DossierCacheStore,
  type NpcCacheStore,
  type PlayerStateStore,
  type SynthesisAttemptsStore
} from "@/lib/storage/stores";

export type { KvBackend, KvBackendKind } from "@/lib/storage/backend";
export { MemoryKv, LocalStorageKv, createKvBackend, detectKvKind } from "@/lib/storage/backend";
export {
  dossierCacheKey,
  npcCacheKey,
  playerStateKey,
  synthesisAttemptsKey,
  deriveTruthStates,
  isGeneratedDossierCacheable,
  isGeneratedDossierCacheable as isDossierCacheable,
  isRawDossierCacheable,
  NPC_MEMORY_TURN_LIMIT,
  SYNTHESIS_ATTEMPT_LIMIT,
  DOSSIER_CACHE_KEY_PREFIX,
  NPC_CACHE_KEY_PREFIX,
  PLAYER_STATE_KEY_PREFIX,
  SYNTHESIS_ATTEMPTS_KEY_PREFIX
} from "@/lib/storage/stores";
export type {
  DossierCacheStore,
  DossierPutResult,
  GeneratedDossierEnvelope,
  NpcCacheStore,
  NpcMemory,
  NpcTurn,
  PlayerState,
  PlayerStateStore,
  PlayerStateWrite,
  StoreResult,
  SynthesisAttemptRecord,
  SynthesisAttemptsStore,
  TruthStatus
} from "@/lib/storage/stores";

export interface DataStore {
  readonly kind: KvBackendKind;
  readonly dossierCache: DossierCacheStore;
  readonly npcCache: NpcCacheStore;
  readonly playerState: PlayerStateStore;
  readonly synthesisAttempts: SynthesisAttemptsStore;
}

export interface CreateDataStoreOptions {
  backend?: KvBackend | KvBackendKind | "auto";
}

function resolveBackend(backend: CreateDataStoreOptions["backend"] = "auto"): KvBackend {
  if (!backend || backend === "auto" || backend === "memory" || backend === "localStorage") {
    return createKvBackend(backend ?? "auto");
  }
  return backend;
}

export function createDataStore(options: CreateDataStoreOptions = {}): DataStore {
  const kv = resolveBackend(options.backend);
  return {
    kind: kv.kind,
    dossierCache: createDossierCacheStore(kv),
    npcCache: createNpcCacheStore(kv),
    playerState: createPlayerStateStore(kv),
    synthesisAttempts: createSynthesisAttemptsStore(kv)
  };
}

export function createMemoryDataStore(): DataStore {
  return createDataStore({ backend: new MemoryKv() });
}

let defaultStore: DataStore | undefined;

/** Process-wide default. Safe on Vercel without Postgres; isolate-local on serverless. */
export function getDataStore(): DataStore {
  if (!defaultStore) {
    const fromEnv = process.env.EMBER_DATASTORE?.trim();
    const backend = fromEnv === "memory" || fromEnv === "localStorage" ? fromEnv : "auto";
    defaultStore = createDataStore({ backend });
  }
  return defaultStore;
}

export function resetDefaultDataStore(): void {
  defaultStore = undefined;
}

/** Helper for T4 Scribe: GET first, map a hit to the contract cache_hit envelope. */
export function dossierCacheHitMessage(planetId: string, landingSiteId: string): ReturnType<typeof cacheHit> {
  return cacheHit(`dossier_cache 命中 ${dossierCacheKey(planetId, landingSiteId)}，不调用模型。`);
}

export function cacheHitResponse(dossier: Dossier) {
  return {
    contract_version: "v1.1" as const,
    status: "cache_hit" as const,
    cached: true as const,
    dossier
  };
}
