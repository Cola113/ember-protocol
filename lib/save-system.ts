export interface SaveSlotData {
  id: string;
  name: string;
  timestamp: number;
  collectedPropositions: string[];
  believedTruths: string[];
  completedHotspotIds: string[];
  currentSector: string;
  selectedPlanetId?: string;
  currentView?: string;
  memoryIntegrity: number;
  playTimeMinutes: number;
}

export const SLOT_IDS = ["slot_1", "slot_2", "slot_3", "auto"] as const;
export type SlotId = (typeof SLOT_IDS)[number];

const STORAGE_KEY_PREFIX = "ember_protocol_save_";

export function calculateMemoryIntegrity(believedCount: number, propCount: number): number {
  // Base 38.2% + 10.3% per believed truth + 1.2% per proposition (capped at 100%)
  const integrity = 38.2 + believedCount * 10.3 + propCount * 1.2;
  return Math.min(100, parseFloat(integrity.toFixed(1)));
}

export function getAllSaveSlots(): Record<SlotId, SaveSlotData | null> {
  if (typeof window === "undefined") {
    return {
      slot_1: null,
      slot_2: null,
      slot_3: null,
      auto: null,
    };
  }

  const result: Record<SlotId, SaveSlotData | null> = {
    slot_1: null,
    slot_2: null,
    slot_3: null,
    auto: null,
  };

  SLOT_IDS.forEach((id) => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
      if (raw) {
        result[id] = JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`Failed to parse save data for ${id}:`, e);
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
  selectedPlanetId?: string;
  currentView?: string;
  playTimeMinutes?: number;
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

  const slotData: SaveSlotData = {
    id: slotId,
    name,
    timestamp: Date.now(),
    collectedPropositions: payload.collectedPropositions,
    believedTruths: payload.believedTruths,
    completedHotspotIds: payload.completedHotspotIds,
    currentSector: payload.currentSector || (payload.selectedPlanetId ? payload.selectedPlanetId.toUpperCase() : "HELIX-7"),
    selectedPlanetId: payload.selectedPlanetId,
    currentView: payload.currentView,
    memoryIntegrity,
    playTimeMinutes: payload.playTimeMinutes || 0,
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
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slotId}`);
    return raw ? JSON.parse(raw) : null;
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
