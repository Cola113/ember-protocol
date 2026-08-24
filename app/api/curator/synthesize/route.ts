import { NextResponse } from "next/server";
import { curatorSlotFromRequest, runCuratorSynthesis } from "@/lib/curator";
import { getDataStore } from "@/lib/datastore";
import { validationError } from "@/lib/schemas/common";
import { curatorDegradedResult } from "@/lib/schemas/curator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        contract_version: "v1.1",
        status: "rejected",
        degraded: false,
        truth_id: "unknown",
        error: validationError("请求体不是合法 JSON。")
      },
      { status: 400 }
    );
  }

  const slot = curatorSlotFromRequest(req);
  if (!slot.ok) {
    return NextResponse.json(
      {
        contract_version: "v1.1",
        status: "rejected",
        degraded: false,
        truth_id: "unknown",
        error: slot.error
      },
      { status: 400 }
    );
  }

  try {
    const result = await runCuratorSynthesis(body, {
      store: getDataStore(),
      slotId: slot.slotId,
      abortSignal: req.signal
    });
    return NextResponse.json(result.response, { status: result.httpStatus });
  } catch {
    return NextResponse.json(curatorDegradedResult("unknown", "Curator 管线暂不可用，已按合同降级。"), { status: 200 });
  }
}
