import { CANON } from "@/lib/canon";
import { type ContractError, validationError } from "@/lib/schemas/common";
import { parseDossier, type Dossier, type ScribeGenerateResponse } from "@/lib/schemas/scribe";
import type { SynthesisResult } from "@/lib/schemas/synthesis";
import {
  loadGame,
  saveGame,
  SLOT_IDS,
  type SavePayload,
  type SaveSlotData,
  type SlotId
} from "@/lib/save-system";
import type { KvBackend } from "./backend";

export const DOSSIER_CACHE_KEY_PREFIX = "dossier:";
export const NPC_CACHE_KEY_PREFIX = "npc:";
export const PLAYER_STATE_KEY_PREFIX = "player_state:";
export const SYNTHESIS_ATTEMPTS_KEY_PREFIX = "synthesis_attempts:";
/** @deprecated Use synthesisAttemptsKey(slotId). Kept as the key prefix name. */
export const SYNTHESIS_ATTEMPTS_KEY = SYNTHESIS_ATTEMPTS_KEY_PREFIX;

export const NPC_MEMORY_TURN_LIMIT = 40;
export const SYNTHESIS_ATTEMPT_LIMIT = 20;

export type TruthStatus = "unknown" | "encountered" | "suspected" | "believed";
const TRUTH_STATUS_RANK: Record<TruthStatus, number> = {
  unknown: 0,
  encountered: 1,
  suspected: 2,
  believed: 3
};

export type StoreResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ContractError };

export function dossierCacheKey(planetId: string, landingSiteId: string): string {
  return `${DOSSIER_CACHE_KEY_PREFIX}${planetId}:${landingSiteId}`;
}

export function npcCacheKey(slotId: SlotId, npcId: string): string {
  return `${NPC_CACHE_KEY_PREFIX}${slotId}:${npcId}`;
}

export function playerStateKey(slotId: SlotId): string {
  return `${PLAYER_STATE_KEY_PREFIX}${slotId}`;
}

export function synthesisAttemptsKey(slotId: SlotId): string {
  return `${SYNTHESIS_ATTEMPTS_KEY_PREFIX}${slotId}`;
}

export type GeneratedDossierEnvelope = Extract<ScribeGenerateResponse, { status: "generated" }>;

/**
 * Contract gate: only a `status: "generated"` envelope may enter dossier_cache.
 * Bare dossiers, `cache_hit`, and degraded / template responses are refused.
 */
export function isGeneratedDossierCacheable(value: unknown): value is GeneratedDossierEnvelope {
  if (!value || typeof value !== "object") return false;
  const record = value as {
    status?: unknown;
    cacheable?: unknown;
    degraded?: unknown;
    cached?: unknown;
    dossier?: unknown;
    contract_version?: unknown;
  };
  if (record.status !== "generated") return false;
  if (record.cacheable === false) return false;
  if (record.degraded === true) return false;
  if (record.cached === true) return false;
  return parseDossier(record.dossier) !== null;
}

export function isRawDossierCacheable(value: unknown): value is Dossier {
  return parseDossier(value) !== null;
}

async function readJson<T>(backend: KvBackend, key: string): Promise<T | null> {
  const raw = await backend.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    await backend.delete(key);
    return null;
  }
}

async function writeJson(backend: KvBackend, key: string, value: unknown): Promise<StoreResult<true>> {
  try {
    await backend.set(key, JSON.stringify(value));
    return { ok: true, data: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "存储写入失败。";
    return { ok: false, error: validationError(`存储写入失败：${message}`) };
  }
}

export interface DossierPutResult {
  stored: boolean;
  alreadyPresent: boolean;
  dossier: Dossier;
}

export interface DossierCacheStore {
  get(planetId: string, landingSiteId: string): Promise<Dossier | null>;
  /**
   * Persist a `status: "generated"` envelope only. Bare dossiers and degraded
   * templates are refused. Write-once via backend putIfAbsent (not get+set).
   */
  putGenerated(
    planetId: string,
    landingSiteId: string,
    envelope: ScribeGenerateResponse
  ): Promise<StoreResult<DossierPutResult>>;
  delete(planetId: string, landingSiteId: string): Promise<void>;
  has(planetId: string, landingSiteId: string): Promise<boolean>;
}

export function createDossierCacheStore(backend: KvBackend): DossierCacheStore {
  return {
    async get(planetId, landingSiteId) {
      const stored = await readJson<unknown>(backend, dossierCacheKey(planetId, landingSiteId));
      const dossier = parseDossier(stored);
      if (!dossier) return null;
      if (dossier.planet_id !== planetId || dossier.landing_site_id !== landingSiteId) {
        await backend.delete(dossierCacheKey(planetId, landingSiteId));
        return null;
      }
      return dossier;
    },

    async putGenerated(planetId, landingSiteId, envelope) {
      if (!planetId || !landingSiteId) {
        return { ok: false, error: validationError("dossier_cache 需要 planetId 与 landingSiteId。") };
      }
      if (!isGeneratedDossierCacheable(envelope)) {
        return {
          ok: false,
          error: validationError("dossier_cache 只接受 status:\"generated\" 信封；裸 dossier / 降级 / 模板禁止写入。")
        };
      }

      const dossier = parseDossier(envelope.dossier);
      if (!dossier) {
        return { ok: false, error: validationError("dossier 未通过 schema，拒绝写入缓存。") };
      }
      if (dossier.planet_id !== planetId || dossier.landing_site_id !== landingSiteId) {
        return {
          ok: false,
          error: validationError("dossier 的 planet_id/landing_site_id 与缓存键不一致。")
        };
      }

      const key = dossierCacheKey(planetId, landingSiteId);
      let inserted = false;
      try {
        inserted = await backend.putIfAbsent(key, JSON.stringify(dossier));
      } catch (error) {
        const message = error instanceof Error ? error.message : "存储写入失败。";
        return { ok: false, error: validationError(`存储写入失败：${message}`) };
      }
      if (!inserted) {
        const existingDossier = parseDossier(await readJson<unknown>(backend, key));
        if (!existingDossier) {
          return { ok: false, error: validationError("dossier_cache 已有损坏条目，拒绝覆盖。") };
        }
        return {
          ok: true,
          data: { stored: false, alreadyPresent: true, dossier: existingDossier }
        };
      }
      return { ok: true, data: { stored: true, alreadyPresent: false, dossier } };
    },

    async delete(planetId, landingSiteId) {
      await backend.delete(dossierCacheKey(planetId, landingSiteId));
    },

    async has(planetId, landingSiteId) {
      return (await this.get(planetId, landingSiteId)) !== null;
    }
  };
}

export interface NpcTurn {
  role: "user" | "assistant";
  content: string;
  at: number;
  lie?: boolean;
}

export interface NpcMemory {
  slot_id: SlotId;
  npc_id: string;
  planet_id?: string;
  relationship: number;
  last_mood?: string;
  turns: NpcTurn[];
  notes: string[];
  updated_at: number;
}

export interface NpcCacheStore {
  get(slotId: SlotId, npcId: string): Promise<NpcMemory | null>;
  save(slotId: SlotId, memory: NpcMemory): Promise<StoreResult<NpcMemory>>;
  appendTurn(
    slotId: SlotId,
    npcId: string,
    turn: NpcTurn,
    extras?: Partial<Pick<NpcMemory, "planet_id" | "relationship" | "last_mood" | "notes">>
  ): Promise<StoreResult<NpcMemory>>;
  delete(slotId: SlotId, npcId: string): Promise<void>;
}

function normalizeNpcMemory(slotId: SlotId, memory: NpcMemory): NpcMemory {
  const turns = memory.turns.slice(-NPC_MEMORY_TURN_LIMIT);
  return {
    slot_id: slotId,
    npc_id: memory.npc_id,
    planet_id: memory.planet_id,
    relationship: clampInt(memory.relationship, -100, 100),
    last_mood: memory.last_mood,
    turns,
    notes: memory.notes.slice(-20),
    updated_at: memory.updated_at || Date.now()
  };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function createNpcCacheStore(backend: KvBackend): NpcCacheStore {
  return {
    async get(slotId, npcId) {
      if (!SLOT_IDS.includes(slotId) || !npcId) return null;
      const stored = await readJson<NpcMemory>(backend, npcCacheKey(slotId, npcId));
      if (!stored || stored.npc_id !== npcId || !Array.isArray(stored.turns)) return null;
      return normalizeNpcMemory(slotId, stored);
    },

    async save(slotId, memory) {
      if (!SLOT_IDS.includes(slotId)) {
        return { ok: false, error: validationError(`未知存档槽：${slotId}`) };
      }
      if (!memory.npc_id) {
        return { ok: false, error: validationError("npc_cache 需要 npc_id。") };
      }
      const normalized = normalizeNpcMemory(slotId, { ...memory, updated_at: Date.now() });
      const written = await writeJson(backend, npcCacheKey(slotId, normalized.npc_id), normalized);
      if (!written.ok) return written;
      return { ok: true, data: normalized };
    },

    async appendTurn(slotId, npcId, turn, extras) {
      const current = (await this.get(slotId, npcId)) ?? {
        slot_id: slotId,
        npc_id: npcId,
        relationship: 0,
        turns: [],
        notes: [],
        updated_at: Date.now()
      };
      return this.save(slotId, {
        ...current,
        ...extras,
        notes: extras?.notes ?? current.notes,
        turns: [...current.turns, turn]
      });
    },

    async delete(slotId, npcId) {
      await backend.delete(npcCacheKey(slotId, npcId));
    }
  };
}

export interface PlayerStateSidecar {
  collectedPropositions: string[];
  believedTruths: string[];
  completedHotspotIds: string[];
  currentSector: string;
  playTimeMinutes: number;
  elapsedSeconds?: number;
  emberCycleSecondsLeft?: number;
  memoryIntegrity: number;
  truthStates: Record<string, TruthStatus>;
  lastSynthesisTruthId?: string;
  saveName?: string;
}

/**
 * Curator-facing player snapshot.
 *
 * Progress fields (`collectedPropositions`, `believedTruths`, `completedHotspotIds`,
 * timers, sector) are owned by `lib/save-system.ts` localStorage slots in the browser.
 * This facade reads/writes those slots and keeps a sidecar for the four-state truth
 * machine that the playable UI currently derives on the fly.
 */
export interface PlayerState {
  slotId: SlotId;
  collectedPropositions: string[];
  believedTruths: string[];
  completedHotspotIds: string[];
  currentSector: string;
  memoryIntegrity: number;
  playTimeMinutes: number;
  elapsedSeconds?: number;
  emberCycleSecondsLeft?: number;
  truthStates: Record<string, TruthStatus>;
  lastSynthesisTruthId?: string;
  saveName?: string;
  timestamp?: number;
}

export interface PlayerStateWrite {
  slotId: SlotId;
  collectedPropositions?: string[];
  believedTruths?: string[];
  completedHotspotIds?: string[];
  currentSector?: string;
  playTimeMinutes?: number;
  elapsedSeconds?: number;
  emberCycleSecondsLeft?: number;
  truthStates?: Record<string, TruthStatus>;
  lastSynthesisTruthId?: string;
  saveName?: string;
}

export interface PlayerStateStore {
  load(slotId: SlotId): Promise<PlayerState | null>;
  save(patch: PlayerStateWrite): Promise<StoreResult<PlayerState>>;
  getTruthStatus(slotId: SlotId, truthId: string): Promise<TruthStatus>;
  setTruthStatus(slotId: SlotId, truthId: string, status: TruthStatus): Promise<StoreResult<PlayerState>>;
  addProposition(slotId: SlotId, propositionId: string): Promise<StoreResult<PlayerState>>;
  markBelieved(slotId: SlotId, truthId: string): Promise<StoreResult<PlayerState>>;
}

export function deriveTruthStates(
  collectedPropositions: readonly string[],
  believedTruths: readonly string[]
): Record<string, TruthStatus> {
  const states: Record<string, TruthStatus> = {};
  for (const truth of CANON.anchorTruths) {
    if (believedTruths.includes(truth.id)) {
      states[truth.id] = "believed";
      continue;
    }
    const matched = truth.required_propositions.filter((proposition) =>
      collectedPropositions.includes(proposition)
    ).length;
    if (matched > 0 && matched === truth.required_propositions.length) {
      states[truth.id] = "suspected";
    } else if (matched > 0) {
      states[truth.id] = "encountered";
    } else {
      states[truth.id] = "unknown";
    }
  }
  for (const truthId of believedTruths) {
    states[truthId] = "believed";
  }
  return states;
}

function mergeTruthStates(
  derived: Record<string, TruthStatus>,
  sidecar: Record<string, TruthStatus> | undefined,
  believedTruths: readonly string[]
): Record<string, TruthStatus> {
  const merged: Record<string, TruthStatus> = { ...derived };
  if (sidecar) {
    for (const [truthId, status] of Object.entries(sidecar)) {
      if (!(status in TRUTH_STATUS_RANK)) continue;
      // believedTruths is the only source of "believed"; sidecar cannot resurrect it.
      if (status === "believed") continue;
      const current = merged[truthId] ?? "unknown";
      if (current === "believed") continue;
      if (TRUTH_STATUS_RANK[status] >= TRUTH_STATUS_RANK[current]) {
        merged[truthId] = status;
      }
    }
  }
  for (const truthId of believedTruths) {
    merged[truthId] = "believed";
  }
  return merged;
}

function emptyPlayerState(slotId: SlotId): PlayerState {
  return {
    slotId,
    collectedPropositions: [],
    believedTruths: [],
    completedHotspotIds: [],
    currentSector: "HELIX-7",
    memoryIntegrity: 38.2,
    playTimeMinutes: 0,
    elapsedSeconds: 0,
    emberCycleSecondsLeft: 2382,
    truthStates: deriveTruthStates([], []),
    saveName: slotId === "auto" ? "AUTOSAVE // 自动回传残响记录" : undefined
  };
}

function fromSaveSlot(slot: SaveSlotData, sidecar: PlayerStateSidecar | null): PlayerState {
  const derived = deriveTruthStates(slot.collectedPropositions, slot.believedTruths);
  return {
    slotId: slot.id,
    collectedPropositions: slot.collectedPropositions,
    believedTruths: slot.believedTruths,
    completedHotspotIds: slot.completedHotspotIds,
    currentSector: slot.currentSector,
    memoryIntegrity: slot.memoryIntegrity,
    playTimeMinutes: slot.playTimeMinutes,
    elapsedSeconds: slot.elapsedSeconds,
    emberCycleSecondsLeft: slot.emberCycleSecondsLeft,
    truthStates: mergeTruthStates(derived, sidecar?.truthStates, slot.believedTruths),
    lastSynthesisTruthId: sidecar?.lastSynthesisTruthId,
    saveName: slot.name,
    timestamp: slot.timestamp
  };
}

export function createPlayerStateStore(backend: KvBackend): PlayerStateStore {
  async function loadSidecar(slotId: SlotId): Promise<PlayerStateSidecar | null> {
    return readJson<PlayerStateSidecar>(backend, playerStateKey(slotId));
  }

  async function persistSidecar(state: PlayerState): Promise<StoreResult<true>> {
    const sidecar: PlayerStateSidecar = {
      collectedPropositions: state.collectedPropositions,
      believedTruths: state.believedTruths,
      completedHotspotIds: state.completedHotspotIds,
      currentSector: state.currentSector,
      playTimeMinutes: state.playTimeMinutes,
      elapsedSeconds: state.elapsedSeconds,
      emberCycleSecondsLeft: state.emberCycleSecondsLeft,
      memoryIntegrity: state.memoryIntegrity,
      truthStates: state.truthStates,
      lastSynthesisTruthId: state.lastSynthesisTruthId,
      saveName: state.saveName
    };
    return writeJson(backend, playerStateKey(state.slotId), sidecar);
  }

  async function persistSaveSlot(state: PlayerState): Promise<void> {
    const payload: SavePayload = {
      collectedPropositions: state.collectedPropositions,
      believedTruths: state.believedTruths,
      completedHotspotIds: state.completedHotspotIds,
      currentSector: state.currentSector,
      playTimeMinutes: state.playTimeMinutes,
      elapsedSeconds: state.elapsedSeconds,
      emberCycleSecondsLeft: state.emberCycleSecondsLeft
    };
    // Browser: write through to the existing 3+auto slot schema.
    // Node: saveGame is a no-op (no window); sidecar + in-memory snapshot remain.
    saveGame(state.slotId, state.saveName ?? payload, state.saveName ? payload : undefined);
  }

  return {
    async load(slotId) {
      if (!SLOT_IDS.includes(slotId)) return null;
      const slot = loadGame(slotId);
      const sidecar = await loadSidecar(slotId);
      if (slot) return fromSaveSlot(slot, sidecar);
      if (!sidecar) return null;
      // Node / memory: save-system cannot persist; sidecar is the snapshot.
      return {
        ...emptyPlayerState(slotId),
        collectedPropositions: sidecar.collectedPropositions ?? [],
        believedTruths: sidecar.believedTruths ?? [],
        completedHotspotIds: sidecar.completedHotspotIds ?? [],
        currentSector: sidecar.currentSector ?? "HELIX-7",
        playTimeMinutes: sidecar.playTimeMinutes ?? 0,
        elapsedSeconds: sidecar.elapsedSeconds,
        emberCycleSecondsLeft: sidecar.emberCycleSecondsLeft,
        memoryIntegrity: sidecar.memoryIntegrity ?? 38.2,
        truthStates: mergeTruthStates(
          deriveTruthStates(sidecar.collectedPropositions ?? [], sidecar.believedTruths ?? []),
          sidecar.truthStates,
          sidecar.believedTruths ?? []
        ),
        lastSynthesisTruthId: sidecar.lastSynthesisTruthId,
        saveName: sidecar.saveName
      };
    },

    async save(patch) {
      if (!SLOT_IDS.includes(patch.slotId)) {
        return { ok: false, error: validationError(`未知存档槽：${patch.slotId}`) };
      }
      const current = (await this.load(patch.slotId)) ?? emptyPlayerState(patch.slotId);
      const collectedPropositions = uniqueStrings(
        patch.collectedPropositions ?? current.collectedPropositions
      );
      const believedTruths = uniqueStrings(patch.believedTruths ?? current.believedTruths);
      if (patch.believedTruths) {
        const removed = current.believedTruths.filter((id) => !believedTruths.includes(id));
        if (removed.length > 0) {
          return {
            ok: false,
            error: validationError(`不得删除已 believed 的真相：${removed.join(", ")}。`)
          };
        }
      }
      const next: PlayerState = {
        ...current,
        ...patch,
        collectedPropositions,
        believedTruths,
        completedHotspotIds: uniqueStrings(
          patch.completedHotspotIds ?? current.completedHotspotIds
        ),
        truthStates: mergeTruthStates(
          deriveTruthStates(collectedPropositions, believedTruths),
          patch.truthStates ?? current.truthStates,
          believedTruths
        )
      };
      await persistSaveSlot(next);
      const sidecarWrite = await persistSidecar(next);
      if (!sidecarWrite.ok) return sidecarWrite;
      const reloaded = (await this.load(patch.slotId)) ?? next;
      return { ok: true, data: reloaded };
    },

    async getTruthStatus(slotId, truthId) {
      const state = await this.load(slotId);
      return state?.truthStates[truthId] ?? "unknown";
    },

    async setTruthStatus(slotId, truthId, status) {
      if (!(status in TRUTH_STATUS_RANK)) {
        return { ok: false, error: validationError(`非法真相状态：${String(status)}`) };
      }
      const current = (await this.load(slotId)) ?? emptyPlayerState(slotId);
      const previous = current.truthStates[truthId] ?? "unknown";
      if (TRUTH_STATUS_RANK[status] < TRUTH_STATUS_RANK[previous]) {
        return { ok: false, error: validationError("不得把真相状态机回退。") };
      }
      const believedTruths =
        status === "believed" && !current.believedTruths.includes(truthId)
          ? [...current.believedTruths, truthId]
          : current.believedTruths;
      return this.save({
        slotId,
        believedTruths,
        truthStates: { ...current.truthStates, [truthId]: status }
      });
    },

    async addProposition(slotId, propositionId) {
      if (!propositionId) {
        return { ok: false, error: validationError("命题 id 不能为空。") };
      }
      const current = (await this.load(slotId)) ?? emptyPlayerState(slotId);
      if (current.collectedPropositions.includes(propositionId)) {
        return { ok: true, data: current };
      }
      return this.save({
        slotId,
        collectedPropositions: [...current.collectedPropositions, propositionId]
      });
    },

    async markBelieved(slotId, truthId) {
      // Persistence only. Callers (T5 Curator) must already have a passed verdict.
      return this.setTruthStatus(slotId, truthId, "believed");
    }
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.length > 0)));
}

export interface SynthesisAttemptRecord {
  id: string;
  slotId: SlotId;
  truthId: string;
  hypothesisText: string;
  pinnedPropositions: string[];
  result: SynthesisResult;
  createdAt: number;
  degraded: boolean;
}

export interface SynthesisAttemptsStore {
  list(slotId: SlotId, limit?: number): Promise<SynthesisAttemptRecord[]>;
  record(
    attempt: Omit<SynthesisAttemptRecord, "id" | "createdAt"> & { id?: string; createdAt?: number }
  ): Promise<StoreResult<SynthesisAttemptRecord>>;
  clear(slotId: SlotId): Promise<void>;
}

export function createSynthesisAttemptsStore(backend: KvBackend): SynthesisAttemptsStore {
  return {
    async list(slotId, limit = SYNTHESIS_ATTEMPT_LIMIT) {
      if (!SLOT_IDS.includes(slotId)) return [];
      const records = (await readJson<SynthesisAttemptRecord[]>(backend, synthesisAttemptsKey(slotId))) ?? [];
      if (!Array.isArray(records)) return [];
      return records
        .filter((record) => record.slotId === slotId)
        .slice(-Math.max(1, Math.min(limit, SYNTHESIS_ATTEMPT_LIMIT)))
        .reverse();
    },

    async record(attempt) {
      if (!SLOT_IDS.includes(attempt.slotId)) {
        return { ok: false, error: validationError(`未知存档槽：${attempt.slotId}`) };
      }
      if (!attempt.truthId || !attempt.hypothesisText) {
        return { ok: false, error: validationError("synthesis_attempts 需要 truthId 与 hypothesisText。") };
      }
      const record: SynthesisAttemptRecord = {
        id: attempt.id ?? `syn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        slotId: attempt.slotId,
        truthId: attempt.truthId,
        hypothesisText: attempt.hypothesisText,
        pinnedPropositions: attempt.pinnedPropositions ?? [],
        result: attempt.result,
        createdAt: attempt.createdAt ?? Date.now(),
        degraded: attempt.degraded === true
      };
      const key = synthesisAttemptsKey(attempt.slotId);
      const existing = (await readJson<SynthesisAttemptRecord[]>(backend, key)) ?? [];
      const next = [...(Array.isArray(existing) ? existing : []), record].slice(-SYNTHESIS_ATTEMPT_LIMIT);
      const written = await writeJson(backend, key, next);
      if (!written.ok) return written;
      return { ok: true, data: record };
    },

    async clear(slotId) {
      await backend.delete(synthesisAttemptsKey(slotId));
    }
  };
}
