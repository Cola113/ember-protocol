import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { truthId, hypothesisText, pinnedPropositions } = await req.json();

    // Stub for P2 Pi/Curator synthesis scoring against Canon Ledger
    const hasKeyword = hypothesisText && (
      hypothesisText.includes("引导") || 
      hypothesisText.includes("载波") || 
      hypothesisText.includes("计算机") || 
      hypothesisText.includes("写回") || 
      hypothesisText.includes("握手")
    );

    return NextResponse.json({
      truth_id: truthId,
      verdict: hasKeyword ? "believed" : "partial",
      coverage_score: hasKeyword ? 0.94 : 0.65,
      consistency_score: 0.98,
      feedback: hasKeyword
        ? "Curator 评估：假说准确识别了星弧硬件拓扑与引导载波本质。已将该真相确证为 BELIEVED。"
        : "Curator 评估：假说抓住了部分表象，但缺少对底层系统职能的阐释。",
      memory_recovered_delta: hasKeyword ? 0.103 : 0
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
