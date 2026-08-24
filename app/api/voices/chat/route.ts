import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/datastore";
import { validationError } from "@/lib/schemas/common";
import { voicesHardReject } from "@/lib/schemas/voices";
import { runVoicesChat, slotFromRequest } from "@/lib/voices";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(voicesHardReject(validationError("请求体不是合法 JSON。")), { status: 400 });
  }

  const slot = slotFromRequest(req);
  if (!slot.ok) {
    return NextResponse.json(voicesHardReject(slot.error));
  }

  const result = await runVoicesChat(raw, {
    store: getDataStore(),
    slotId: slot.slotId
  });
  return NextResponse.json(result);
}
