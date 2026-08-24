/**
 * Playable progress slots (3 manual + auto) in `ember_protocol_save_*` localStorage keys.
 *
 * T2 `lib/datastore.ts` player_state is a facade over this module:
 * - collectedPropositions / believedTruths / completedHotspotIds / timers stay here
 * - truth-state sidecar lives under `ember_protocol_ds_player_state:*`
 * Do not add NextAuth or cloud sync here (P3).
 */
export const SAVE_SCHEMA_VERSION = 1;

export const SLOT_IDS = ["slot_1", "slot_2", "slot_3", "auto"] as const;
export type SlotId = (typeof SLOT_IDS)[number];

export interface SaveSlotData {
  version: number;
  id: SlotId;
  name: string;
  timestamp: number;
  collectedPropositions: string[];
  believedTruths: string[];
  completedHotspotIds: string[];
  currentSector: string;
  memoryIntegrity: number;
  playTimeMinutes: number;
  elapsedSeconds?: number;
  emberCycleSecondsLeft?: number;
}

const STORAGE_KEY_PREFIX = "ember_protocol_save_";

export function calculateMemoryIntegrity(believedCount: number, propCount: number): number {
  // Base 38.2% + 10.3% per believed truth + 1.2% per proposition (capped at 100%)
  const integrity = 38.2 + believedCount * 10.3 + propCount * 1.2;
  return Math.min(100, parseFloat(integrity.toFixed(1)));
}

/**
 * Validates raw object from localStorage and returns normalized SaveSlotData or null if corrupted
 */
export function validateAndNormalizeSave(
  raw: unknown,
  expectedSlotId?: SlotId
): SaveSlotData | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Record<string, unknown>;

  // Validate slot ID
  const id = typeof data.id === "string" ? data.id : expectedSlotId;
  if (!id || !SLOT_IDS.includes(id as SlotId)) return null;
  if (expectedSlotId && id !== expectedSlotId) return null;

  // Validate timestamp
  const timestamp =
    typeof data.timestamp === "number" && !isNaN(data.timestamp) && data.timestamp > 0
      ? data.timestamp
      : null;
  if (!timestamp) return null;

  // Validate string arrays
  if (
    !Array.isArray(data.collectedPropositions) ||
    !data.collectedPropositions.every((x) => typeof x === "string")
  ) {
    return null;
  }

  if (
    !Array.isArray(data.believedTruths) ||
    !data.believedTruths.every((x) => typeof x === "string")
  ) {
    return null;
  }

  if (
    !Array.isArray(data.completedHotspotIds) ||
    !data.completedHotspotIds.every((x) => typeof x === "string")
  ) {
    return null;
  }

  const name =
    typeof data.name === "string" && data.name.trim().length > 0
      ? data.name.trim()
      : `ARCHIVE // 记忆插槽 ${id.toUpperCase()}`;

  const currentSector =
    typeof data.currentSector === "string" && data.currentSector.trim().length > 0
      ? data.currentSector.trim()
      : "HELIX-7";

  const elapsedSeconds =
    typeof data.elapsedSeconds === "number" && !isNaN(data.elapsedSeconds)
      ? Math.max(0, data.elapsedSeconds)
      : typeof data.playTimeMinutes === "number" && !isNaN(data.playTimeMinutes)
      ? Math.max(0, data.playTimeMinutes * 60)
      : 0;

  const playTimeMinutes =
    typeof data.playTimeMinutes === "number" && !isNaN(data.playTimeMinutes)
      ? Math.max(0, data.playTimeMinutes)
      : Math.floor(elapsedSeconds / 60);

  const emberCycleSecondsLeft =
    typeof data.emberCycleSecondsLeft === "number" && !isNaN(data.emberCycleSecondsLeft)
      ? Math.max(0, data.emberCycleSecondsLeft)
      : 2382;

  const memoryIntegrity =
    typeof data.memoryIntegrity === "number" && !isNaN(data.memoryIntegrity)
      ? data.memoryIntegrity
      : calculateMemoryIntegrity(
          data.believedTruths.length,
          data.collectedPropositions.length
        );

  return {
    version:
      typeof data.version === "number" && !isNaN(data.version)
        ? data.version
        : SAVE_SCHEMA_VERSION,
    id: id as SlotId,
    name,
    timestamp,
    collectedPropositions: data.collectedPropositions as string[],
    believedTruths: data.believedTruths as string[],
    completedHotspotIds: data.completedHotspotIds as string[],
    currentSector,
    memoryIntegrity,
    playTimeMinutes,
    elapsedSeconds,
    emberCycleSecondsLeft,
  };
}

export function getAllSaveSlots(): Record<SlotId, SaveSlotData | null> {
  const result: Record<SlotId, SaveSlotData | null> = {
    slot_1: null,
    slot_2: null,
    slot_3: null,
    auto: null,
  };

  if (typeof window === "undefined") {
    return result;
  }

  SLOT_IDS.forEach((id) => {
    try {
      const rawStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
      if (rawStr) {
        const parsed = JSON.parse(rawStr);
        result[id] = validateAndNormalizeSave(parsed, id);
      }
    } catch (e) {
      console.warn(`Failed to parse or validate save data for ${id}:`, e);
      result[id] = null;
    }
  });

  return result;
}

export interface SavePayload {
  collectedPropositions: string[];
  believedTruths: string[];
  completedHotspotIds: string[];
  currentSector?: string;
  playTimeMinutes?: number;
  elapsedSeconds?: number;
  emberCycleSecondsLeft?: number;
}

export function saveGame(
  slotId: SlotId,
  nameOrPayload: string | SavePayload,
  maybePayload?: SavePayload
): SaveSlotData {
  let name = "AUTOSAVE // 自动回传残响记录";
  let payload: SavePayload;

  if (typeof nameOrPayload === "string") {
    name = nameOrPayload;
    payload = maybePayload || {
      collectedPropositions: [],
      believedTruths: [],
      completedHotspotIds: [],
    };
  } else {
    payload = nameOrPayload;
  }

  const memoryIntegrity = calculateMemoryIntegrity(
    payload.believedTruths.length,
    payload.collectedPropositions.length
  );

  const elapsedSeconds =
    typeof payload.elapsedSeconds === "number" && !isNaN(payload.elapsedSeconds)
      ? Math.max(0, payload.elapsedSeconds)
      : typeof payload.playTimeMinutes === "number" && !isNaN(payload.playTimeMinutes)
      ? Math.max(0, payload.playTimeMinutes * 60)
      : 0;

  const playTimeMinutes =
    typeof payload.playTimeMinutes === "number" && !isNaN(payload.playTimeMinutes)
      ? Math.max(0, payload.playTimeMinutes)
      : Math.floor(elapsedSeconds / 60);

  const emberCycleSecondsLeft =
    typeof payload.emberCycleSecondsLeft === "number" && !isNaN(payload.emberCycleSecondsLeft)
      ? Math.max(0, payload.emberCycleSecondsLeft)
      : 2382;

  const slotData: SaveSlotData = {
    version: SAVE_SCHEMA_VERSION,
    id: slotId,
    name,
    timestamp: Date.now(),
    collectedPropositions: payload.collectedPropositions,
    believedTruths: payload.believedTruths,
    completedHotspotIds: payload.completedHotspotIds,
    currentSector: payload.currentSector || "HELIX-7",
    memoryIntegrity,
    playTimeMinutes,
    elapsedSeconds,
    emberCycleSecondsLeft,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${slotId}`, JSON.stringify(slotData));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  }

  return slotData;
}

export function loadGame(slotId: SlotId): SaveSlotData | null {
  if (typeof window === "undefined") return null;
  try {
    const rawStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slotId}`);
    if (!rawStr) return null;
    const parsed = JSON.parse(rawStr);
    return validateAndNormalizeSave(parsed, slotId);
  } catch (e) {
    console.error(`Failed to load ${slotId}:`, e);
    return null;
  }
}

export function deleteSaveGame(slotId: SlotId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slotId}`);
  } catch (e) {
    console.error(`Failed to delete save ${slotId}:`, e);
  }
}
