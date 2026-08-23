import { NextResponse } from "next/server";
import { CANON } from "@/lib/canon";

export async function POST(req: Request) {
  try {
    const { truthId, hypothesisText, pinnedPropositions } = await req.json();

    const targetTruth = CANON.anchorTruths.find((t) => t.id === truthId);
    if (!targetTruth) {
      return NextResponse.json({ error: `Unknown truthId: ${truthId}` }, { status: 400 });
    }

    const pinnedSet = new Set<string>(pinnedPropositions || []);
    const hasAllRequired = targetTruth.required_propositions.every((p) =>
      pinnedSet.has(p)
    );

    // Hard check: If required propositions are missing, CANNOT return believed
    if (!hasAllRequired) {
      const missing = targetTruth.required_propositions.filter(
        (p) => !pinnedSet.has(p)
      );
      return NextResponse.json({
        truth_id: truthId,
        verdict: "partial",
        coverage_score: 0.25,
        consistency_score: 0.5,
        feedback: `Curator 评估受阻：尚未收集齐该真相所需的全部必要命题（缺少：${missing.join(
          ", "
        )}），无法确证。`,
        memory_recovered_delta: 0,
      });
    }

    // Truth-specific keyword validation
    const keywords = targetTruth.keywords || [];
    const textLower = (hypothesisText || "").toLowerCase();
    const matchedCount = keywords.filter((kw) =>
      textLower.includes(kw.toLowerCase())
    ).length;

    const isBelieved = matchedCount >= 1;

    return NextResponse.json({
      truth_id: truthId,
      verdict: isBelieved ? "believed" : "partial",
      coverage_score: isBelieved ? 0.95 : 0.62,
      consistency_score: 0.98,
      feedback: isBelieved
        ? `Curator 评估通过：假说准确反映了正典事实【${targetTruth.title}】。已将该真相确证为 BELIEVED。`
        : `Curator 评估：已归档必要前置命题，但假说推论缺少对底层本质的阐释（如关键词：${keywords.slice(0, 3).join(", ")}）。`,
      memory_recovered_delta: isBelieved ? 0.103 : 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
