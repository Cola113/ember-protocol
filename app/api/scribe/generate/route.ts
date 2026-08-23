import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { planetId } = await req.json();

    // Stub for P2 Codex/Scribe integration with Vercel AI SDK
    return NextResponse.json({
      planet_id: planetId,
      dossier: {
        summary: "高频电磁脉冲正在持续向外空辐射，地表建筑保存完整。",
        environmental_hazards: "低重力，微电离风暴",
        local_phenomena: "夜间可见二次曝光暗影辉光"
      },
      cached: true
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
