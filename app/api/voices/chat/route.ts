import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, npcId, canonContext } = await req.json();

    // Stub for P2 Grok/Voices integration with Vercel AI SDK
    return NextResponse.json({
      say: "“这是引导扇区的预热脉冲。每次冷启动，天线都会向窑发送握手请求……”",
      mood: "neutral-melancholy",
      offer_insight_id: "Helix.Signal.Unassigned",
      relationship_delta: 1,
      lie: false,
      timestamp: Date.now()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
