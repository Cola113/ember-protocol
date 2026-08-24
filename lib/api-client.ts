/**
 * Unified Frontend API Client for Voices, Scribe, and Curator.
 *
 * Implements P2 v1.1 contract interactions with full degradation fallbacks,
 * offline resilience, and schema conformity.
 */

import { CANON_READ } from "@/lib/canon";
import { CANON_DIALOGUES } from "@/lib/dialogues";
import {
  type VoicesChatResponse,
  type VoicesOutput,
  VOICES_GENERIC_FALLBACK
} from "@/lib/schemas/voices";
import {
  type ScribeGenerateResponse,
  type Dossier,
  scribeDegradedResponse
} from "@/lib/schemas/scribe";
import {
  type CuratorResponse,
  type SynthesisResult,
  curatorDegradedResult
} from "@/lib/schemas/curator";

export interface ClientChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  lie?: boolean;
  offer_insight_id?: string | null;
  mood?: string;
}

export interface ClientVoicesChatResult {
  ok: boolean;
  degraded: boolean;
  output: VoicesOutput;
  error?: {
    error: string;
    message: string;
  };
  source: "api" | "degraded_api" | "fallback_tree" | "generic_fallback";
}

/**
 * Sends messages to POST /api/voices/chat.
 * Server recomputes canonContext based on server-side player state.
 * Client passes safe minimal payload + slot identifier.
 */
export async function clientVoicesChat({
  npcId,
  messages,
  planetId = "helix-7",
  slot = "auto"
}: {
  npcId: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  planetId?: string;
  slot?: string;
}): Promise<ClientVoicesChatResult> {
  const safeSlot = slot || "auto";
  const endpoint = `/api/voices/chat?slot=${encodeURIComponent(safeSlot)}`;

  const body = {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    npcId,
    canonContext: {
      planet_id: planetId,
      truth_ids: [],
      known_facts: [],
      insight_gates: []
    },
    playerLog: []
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ember-slot": safeSlot
      },
      body: JSON.stringify(body)
    });

    const data = (await res.json()) as VoicesChatResponse;

    if (data.ok && !data.degraded && "output" in data) {
      return {
        ok: true,
        degraded: false,
        output: data.output,
        source: "api"
      };
    }

    if (data.degraded && "fallback" in data) {
      return {
        ok: false,
        degraded: true,
        output: data.fallback,
        error: data.error,
        source: "degraded_api"
      };
    }

    if (!data.ok && !data.degraded) {
      // Hard reject on server (e.g. unknown npcId or no constitution)
      const treeFallback = getTreeFallbackOutput(npcId, messages);
      return {
        ok: false,
        degraded: false,
        output: treeFallback,
        error: "error" in data ? data.error : undefined,
        source: "fallback_tree"
      };
    }
  } catch {
    // Network or parse error: fallback to hardcoded tree
    const treeFallback = getTreeFallbackOutput(npcId, messages);
    return {
      ok: false,
      degraded: true,
      output: treeFallback,
      error: {
        error: "model_unavailable",
        message: "网络连接失败，已回退本地残响档案。"
      },
      source: "fallback_tree"
    };
  }

  return {
    ok: false,
    degraded: true,
    output: VOICES_GENERIC_FALLBACK,
    source: "generic_fallback"
  };
}

function getTreeFallbackOutput(
  npcId: string,
  messages: Array<{ role: string; content: string }>
): VoicesOutput {
  const tree = CANON_DIALOGUES[npcId];
  if (!tree || tree.steps.length === 0) {
    return VOICES_GENERIC_FALLBACK;
  }

  const userMessages = messages.filter((m) => m.role === "user");
  const stepIdx = Math.min(userMessages.length, tree.steps.length - 1);
  const step = tree.steps[stepIdx] || tree.steps[0];

  return {
    say: step.text,
    mood: stepIdx === 0 ? "protocol-formal" : "melancholy-solemn",
    offer_insight_id: step.propositionReward ? `INSIGHT_${step.propositionReward.code.replace(/\./g, "_").toUpperCase()}` : null,
    relationship_delta: 1,
    lie: Boolean(step.hysteresisNote)
  };
}

export interface ClientScribeResult {
  ok: boolean;
  status: "generated" | "cache_hit" | "degraded" | "fallback";
  cached: boolean;
  degraded: boolean;
  dossier: Dossier;
  error?: {
    error: string;
    message: string;
  };
}

/**
 * Fetches or generates landing site dossier from POST /api/scribe/generate.
 */
export async function clientScribeGenerate({
  planetId,
  landingSiteId
}: {
  planetId: string;
  landingSiteId: string;
}): Promise<ClientScribeResult> {
  try {
    const res = await fetch("/api/scribe/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planetId, landingSiteId })
    });

    if (!res.ok) {
      const degraded = scribeDegradedResponse("Scribe 接口响应异常，已使用模板地方志。", {
        planet_id: planetId,
        landing_site_id: landingSiteId
      });
      return {
        ok: true,
        status: "degraded",
        cached: false,
        degraded: true,
        dossier: degraded.dossier,
        error: degraded.error
      };
    }

    const data: ScribeGenerateResponse = await res.json();

    if (data.status === "generated") {
      return {
        ok: true,
        status: "generated",
        cached: false,
        degraded: false,
        dossier: data.dossier
      };
    }

    if (data.status === "cache_hit") {
      return {
        ok: true,
        status: "cache_hit",
        cached: true,
        degraded: false,
        dossier: data.dossier
      };
    }

    return {
      ok: true,
      status: "degraded",
      cached: false,
      degraded: true,
      dossier: data.dossier,
      error: data.error
    };
  } catch {
    const degraded = scribeDegradedResponse("网络连接不可用，已加载本地模板地方志。", {
      planet_id: planetId,
      landing_site_id: landingSiteId
    });
    return {
      ok: false,
      status: "fallback",
      cached: false,
      degraded: true,
      dossier: degraded.dossier,
      error: degraded.error
    };
  }
}

export interface ClientCuratorResult {
  ok: boolean;
  status: "scored" | "rejected" | "degraded" | "offline_fallback";
  degraded: boolean;
  verdict: "passed" | "partial" | "failed";
  coverage: number;
  correctness: number;
  coherence: number;
  feedback: string;
  missingRequiredPropositions?: string[];
  error?: {
    error: string;
    message: string;
  };
}

/**
 * Submits hypothesis to POST /api/curator/synthesize.
 * Manages hard gate rejections, degraded ratings, and state synchronizations.
 */
export async function clientCuratorSynthesize({
  truthId,
  hypothesisText,
  pinnedPropositions,
  slot = "auto"
}: {
  truthId: string;
  hypothesisText: string;
  pinnedPropositions: string[];
  slot?: string;
}): Promise<ClientCuratorResult> {
  const safeSlot = slot || "auto";
  const endpoint = `/api/curator/synthesize?slot=${encodeURIComponent(safeSlot)}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ember-slot": safeSlot
      },
      body: JSON.stringify({
        truthId,
        hypothesisText,
        pinnedPropositions
      })
    });

    const data: CuratorResponse = await res.json();

    if (data.status === "scored") {
      return {
        ok: true,
        status: "scored",
        degraded: false,
        verdict: data.result.verdict,
        coverage: data.result.coverage,
        correctness: data.result.correctness,
        coherence: data.result.coherence,
        feedback: data.result.feedback
      };
    }

    if (data.status === "rejected") {
      return {
        ok: false,
        status: "rejected",
        degraded: false,
        verdict: data.result.verdict,
        coverage: data.result.coverage,
        correctness: data.result.correctness,
        coherence: data.result.coherence,
        feedback: data.result.feedback,
        missingRequiredPropositions: data.missing_required_propositions,
        error: data.error
      };
    }

    if (data.status === "degraded") {
      return {
        ok: false,
        status: "degraded",
        degraded: true,
        verdict: data.result.verdict,
        coverage: data.result.coverage,
        correctness: data.result.correctness,
        coherence: data.result.coherence,
        feedback: data.result.feedback,
        error: data.error
      };
    }
  } catch {
    // Offline / network fallback with local canon hard gate check
    const anchor = CANON_READ.getAnchorTruth(truthId);
    if (anchor) {
      const missing = anchor.required_propositions.filter(
        (p) => !pinnedPropositions.includes(p)
      );
      if (missing.length > 0) {
        return {
          ok: false,
          status: "rejected",
          degraded: false,
          verdict: "failed",
          coverage: 0,
          correctness: 0,
          coherence: 0,
          missingRequiredPropositions: missing,
          feedback: `硬门拒绝：缺少必要命题 ${missing.join(", ")}，不得进入评分，也不得标记为 believed。`,
          error: {
            error: "canon_violation",
            message: `硬门拒绝：缺少必要命题 ${missing.join(", ")}。`
          }
        };
      }

      // Local keyword matching heuristic
      const keywords = anchor.keywords || [];
      const textLower = hypothesisText.toLowerCase();
      const matched = keywords.filter((k) => textLower.includes(k.toLowerCase()));
      const isPass = matched.length >= 1;

      return {
        ok: isPass,
        status: "offline_fallback",
        degraded: true,
        verdict: isPass ? "passed" : "partial",
        coverage: isPass ? 0.92 : 0.45,
        correctness: isPass ? 0.9 : 0.5,
        coherence: isPass ? 0.85 : 0.6,
        feedback: isPass
          ? `[本地离线公证通过] 假说准确涵盖了正典事实【${anchor.title}】的核心机制。`
          : `[本地离线推演未完全收敛] 假说尚缺少核心推论关键字（如：${keywords.slice(0, 2).join(", ")}）。`,
        error: {
          error: "model_unavailable",
          message: "网络不可用，已运行本地离线启发式公证。"
        }
      };
    }
  }

  const degraded = curatorDegradedResult(truthId);
  return {
    ok: false,
    status: "degraded",
    degraded: true,
    verdict: degraded.result.verdict,
    coverage: degraded.result.coverage,
    correctness: degraded.result.correctness,
    coherence: degraded.result.coherence,
    feedback: degraded.result.feedback,
    error: degraded.error
  };
}
