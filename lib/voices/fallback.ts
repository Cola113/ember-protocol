import { CANON_DIALOGUES } from "@/lib/dialogues";
import { VOICES_GENERIC_FALLBACK, type VoicesOutput } from "@/lib/schemas/voices";
import type { NpcMemory } from "@/lib/storage/stores";

export function dialogueFallbackOutput(
  npcId: string,
  memory: NpcMemory | null,
  lastUserText: string
): VoicesOutput {
  const tree = CANON_DIALOGUES[npcId];
  if (!tree || tree.steps.length === 0) return { ...VOICES_GENERIC_FALLBACK };

  const assistantTurns = memory?.turns.filter((turn) => turn.role === "assistant").length ?? 0;
  const index = Math.min(assistantTurns, tree.steps.length - 1);
  const current = tree.steps[index];
  const matched = current.choices?.find((choice) => textOverlaps(lastUserText, choice.text));
  const step = matched ? tree.steps[matched.nextStep] ?? current : current;

  return {
    say: step.text,
    mood: tree.speechRegister || VOICES_GENERIC_FALLBACK.mood,
    offer_insight_id: null,
    relationship_delta: 0,
    lie: Boolean(step.hysteresisNote)
  };
}

function textOverlaps(userText: string, choiceText: string): boolean {
  const a = normalize(userText);
  const b = normalize(choiceText);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const head = b.slice(0, Math.min(16, b.length));
  return head.length >= 8 && a.includes(head);
}

function normalize(text: string): string {
  return text.replace(/[“”"‘’]/g, "").replace(/\s+/g, "").toLocaleLowerCase();
}
