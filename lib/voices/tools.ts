import { tool } from "ai";
import { CANON, CANON_READ, getCanonContext } from "@/lib/canon";
import {
  ConsultCanonInputSchema,
  OfferClueInputSchema,
  RecallPlayerLogInputSchema
} from "@/lib/schemas/voices";
import type { NpcMemory } from "@/lib/storage/stores";
import type { VoicesPlayerSnapshot } from "./context";
import type { VoicesSubject } from "./subject";

export interface VoicesToolContext {
  subject: VoicesSubject;
  player: VoicesPlayerSnapshot;
  memory: NpcMemory | null;
}

export interface ConsultCanonHit {
  field: string;
  text: string;
}

export interface ConsultCanonResult {
  query: string;
  hits: ConsultCanonHit[];
}

export interface RecallPlayerLogHit {
  source: "proposition" | "believed_truth" | "hotspot" | "memory";
  id: string;
  text: string;
}

export interface RecallPlayerLogResult {
  topic: string;
  hits: RecallPlayerLogHit[];
}

export interface OfferClueResult {
  allowed: boolean;
  clue_id: string;
  offer_insight_id: string | null;
  reason: string;
}

export function consultCanon(ctx: VoicesToolContext, query: string): ConsultCanonResult {
  const needle = query.trim().toLocaleLowerCase();
  const corpus = promptSafeCanonCorpus(ctx.subject);
  const hits = corpus.filter((entry) => entry.text.toLocaleLowerCase().includes(needle)).slice(0, 8);
  return { query, hits };
}

export function recallPlayerLog(ctx: VoicesToolContext, topic: string): RecallPlayerLogResult {
  const needle = topic.trim().toLocaleLowerCase();
  const hits: RecallPlayerLogHit[] = [];
  for (const proposition of ctx.player.collectedPropositions) {
    if (matches(proposition, needle)) {
      hits.push({ source: "proposition", id: proposition, text: proposition });
    }
  }
  for (const truthId of ctx.player.believedTruths) {
    const truth = CANON_READ.getAnchorTruth(truthId);
    const haystack = `${truthId} ${truth?.title ?? ""} ${truth?.code ?? ""}`;
    if (matches(haystack, needle)) {
      hits.push({
        source: "believed_truth",
        id: truthId,
        text: truth ? `${truth.code}: ${truth.title}` : truthId
      });
    }
  }
  for (const hotspotId of ctx.player.completedHotspotIds) {
    if (matches(hotspotId, needle)) {
      hits.push({ source: "hotspot", id: hotspotId, text: hotspotId });
    }
  }
  for (const turn of ctx.memory?.turns.slice(-12) ?? []) {
    if (matches(turn.content, needle)) {
      hits.push({
        source: "memory",
        id: `${turn.role}:${turn.at}`,
        text: turn.content.slice(0, 240)
      });
    }
  }
  return { topic, hits: hits.slice(0, 12) };
}

export function offerClue(ctx: VoicesToolContext, clueId: string): OfferClueResult {
  const { subject } = ctx;
  const asInsight = CANON_READ.isRegisteredInsight(clueId);
  const asProposition = CANON_READ.isRegisteredProposition(clueId);

  if (!asInsight && !asProposition) {
    return {
      allowed: false,
      clue_id: clueId,
      offer_insight_id: null,
      reason: "未登记的 insight/clue，禁止交付。"
    };
  }

  if (asInsight) {
    const onRoster = subject.roster.registered_insight_ids.includes(clueId);
    const onGate = subject.constitution.insight_gates.some((gate) => gate.insight_id === clueId);
    if (!onRoster && !onGate) {
      return {
        allowed: false,
        clue_id: clueId,
        offer_insight_id: null,
        reason: "该洞察不属于当前 NPC/星球宪章。"
      };
    }
    return {
      allowed: true,
      clue_id: clueId,
      offer_insight_id: clueId,
      reason: "已登记洞察，允许写入 offer_insight_id。"
    };
  }

  const gate = subject.constitution.insight_gates.find((entry) => entry.unlocks_clue_ids.includes(clueId));
  if (!gate) {
    return {
      allowed: false,
      clue_id: clueId,
      offer_insight_id: null,
      reason: "该线索不属于当前星球 insight_gates。"
    };
  }
  return {
    allowed: true,
    clue_id: clueId,
    offer_insight_id: gate.insight_id,
    reason: `线索映射到已登记洞察 ${gate.insight_id}。输出 offer_insight_id 必须用洞察 id，不能用命题 id。`
  };
}

export function createVoicesTools(ctx: VoicesToolContext) {
  return {
    consult_canon: tool({
      description:
        "查阅正典只读面（星球公开面、降落点名称、NPC 公开人格、believed_facts、词汇）。不含 true_facts / forbidden_claims / 真相 ID。",
      parameters: ConsultCanonInputSchema,
      execute: async ({ query }) => consultCanon(ctx, query)
    }),
    recall_player_log: tool({
      description: "回忆服务端玩家进度：已钉命题、已 believed 真相、完成热点、与该 NPC 的记忆。忽略客户端 playerLog。",
      parameters: RecallPlayerLogInputSchema,
      execute: async ({ topic }) => recallPlayerLog(ctx, topic)
    }),
    offer_clue: tool({
      description:
        "在条件满足时交付已登记线索。clue_id 必须是已登记 insight 或本星 insight_gates 中的 clue。成功时用返回的 offer_insight_id，禁止发明 id。",
      parameters: OfferClueInputSchema,
      execute: async ({ clue_id }) => offerClue(ctx, clue_id)
    })
  };
}

function promptSafeCanonCorpus(subject: VoicesSubject): ConsultCanonHit[] {
  const planet = CANON_READ.getPlanet(subject.planetId);
  const face = getCanonContext(subject.planetId);
  const hits: ConsultCanonHit[] = [];
  const push = (field: string, text: string | undefined) => {
    if (text && text.trim()) hits.push({ field, text: text.trim() });
  };
  push("display_name", face.display_name);
  push("category", face.category);
  push("apparent_civilization", face.apparent_civilization);
  push("initial_state", face.initial_state);
  push("era_voice", subject.constitution.era_voice);
  push("npc_name", subject.roster.display_name);
  push("npc_role", subject.roster.role);
  push("npc_personality", subject.roster.personality);
  push("speech_register", subject.roster.speech_register);
  for (const fact of subject.constitution.believed_facts) push("believed_fact", fact);
  for (const word of subject.constitution.vocabulary) push("vocabulary", word);
  for (const site of planet?.landing_sites ?? []) {
    push("landing_site", site.name);
    for (const hotspot of site.hotspots) {
      push("hotspot", hotspot.name);
    }
  }
  const planetRecord = CANON.planets.find((entry) => entry.id === subject.planetId);
  push("planet_name", planetRecord?.name);
  return hits;
}

function matches(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const lower = haystack.toLocaleLowerCase();
  if (lower.includes(needle)) return true;
  return needle.split(/\s+/).filter(Boolean).some((token) => lower.includes(token));
}
