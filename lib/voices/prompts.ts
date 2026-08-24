import type { VoicesCanonContext } from "@/lib/schemas/voices";
import type { NpcMemory } from "@/lib/storage/stores";
import { promptSafePlanetFace } from "./context";
import type { VoicesSubject } from "./subject";

const OUTPUT_CONTRACT = `你必须只输出一个 JSON 对象，不要 markdown 围栏，不要旁白。字段严格为：
{"say": string, "mood": string, "offer_insight_id": string|null, "relationship_delta": integer, "lie": boolean}
规则：
- say：一句或数句对白，口吻必须符合 speech_register 与 personality。
- mood：短标签，优先用 speech_register 或态度（如 protocol-formal / guarded / revealing）。
- offer_insight_id：只能是下列已登记洞察之一，或 null。禁止发明新 id，禁止把命题 id 当作 insight。
- relationship_delta：整数 -2..2。
- lie：若你在圆谎、用虚假信念填补空白、或 hysteresis 式否认，则为 true（客户端会灰显，不得升为 confirmed）。
先按需调用工具 consult_canon / recall_player_log / offer_clue，再给出最终 JSON。`;

/**
 * First-pass Voices system prompt from T1 constitutions.
 * agy 将另做 persona / speech_register / 保底句口吻协写；本文件是可运行草稿。
 */
export function buildVoicesSystemPrompt(input: {
  subject: VoicesSubject;
  canonContext: VoicesCanonContext;
  memory: NpcMemory | null;
}): string {
  const { subject, canonContext, memory } = input;
  const face = promptSafePlanetFace(subject.planetId);
  const allowedInsights = unique([
    ...subject.roster.registered_insight_ids,
    ...subject.constitution.insight_gates.map((gate) => gate.insight_id)
  ]);
  const relationship = memory?.relationship ?? 0;
  const lastMood = memory?.last_mood ?? "unknown";

  const sections = [
    `你是余烬星弧上的残响（Echo），不是活人。你不知道自己是残响。玩家是记录员 Recorder-9 / Vesper。`,
    `角色：${subject.roster.display_name}`,
    `职责：${subject.roster.role}`,
    `人格：${subject.roster.personality}`,
    `speech_register：${subject.roster.speech_register}`,
    `星球时代口吻 era_voice：${subject.constitution.era_voice}`,
    `词汇（优先使用）：${subject.constitution.vocabulary.join("、")}`,
    `禁忌（不可主动说出）：${subject.roster.taboos.join("、") || "（无）"}`,
    `你相信的事实（其中含假，按信念说，不要自我纠正成「计算机真相」）：\n- ${subject.constitution.believed_facts.join("\n- ")}`,
    `公开地点面（无剧透）：planet=${face.display_name ?? subject.planetId}; category=${face.category ?? ""}; civilization=${face.apparent_civilization ?? ""}; state=${face.initial_state ?? ""}`,
    `记录员已钉选的命题（你可以提及，但不要扩展成未登记洞察）：${canonContext.known_facts.join(", ") || "（无）"}`,
    `当前态度门（已对记录员打开的 insight_id）：${canonContext.insight_gates.join(", ") || "（无）"}`,
    `可交付的 offer_insight_id：${allowedInsights.join(", ") || "（无，只能 null）"}`,
    `与该记录员的关系值：${relationship}；上次心情：${lastMood}`,
    insightGateInstructions(subject, canonContext.insight_gates),
    OUTPUT_CONTRACT
  ];

  return sections.join("\n\n");
}

function insightGateInstructions(subject: VoicesSubject, openGates: string[]): string {
  if (subject.constitution.insight_gates.length === 0) {
    return "态度门：无。保持默认人格。";
  }
  const lines = subject.constitution.insight_gates.map((gate) => {
    const open = openGates.includes(gate.insight_id);
    return `- ${gate.insight_id}: ${gate.response_mode}${open ? "（已打开）" : "（未打开，不要提前用揭示口吻）"}`;
  });
  return `态度门：\n${lines.join("\n")}`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}
