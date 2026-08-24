import { NextResponse } from "next/server";
import { runScribePipeline } from "@/lib/scribe/generation";
import { scribeDegradedResponse } from "@/lib/schemas/scribe";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = undefined;
  }

  try {
    const result = await runScribePipeline(body, { abortSignal: req.signal });
    return NextResponse.json(result.response, { status: result.httpStatus });
  } catch {
    return NextResponse.json(
      scribeDegradedResponse("Scribe 管线暂不可用，已使用不可缓存模板档案。"),
      { status: 200 }
    );
  }
}
