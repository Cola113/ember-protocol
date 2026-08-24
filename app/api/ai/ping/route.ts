import { NextResponse } from "next/server";
import { pingAi, readAiConfig } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Minimal T2 test surface for AI SDK wiring.
 * Missing key returns the contract model_unavailable envelope (HTTP 200).
 */
export async function GET() {
  const config = readAiConfig();
  const result = await pingAi();
  if (!result.ok) {
    return NextResponse.json({
      contract_version: "v1.1",
      ok: false,
      degraded: true,
      provider: config.provider,
      modelId: config.modelId,
      configured: config.configured,
      error: result.error
    });
  }
  return NextResponse.json({
    contract_version: "v1.1",
    ok: true,
    degraded: false,
    provider: result.data.provider,
    modelId: result.data.modelId,
    ping: result.data.ping
  });
}
