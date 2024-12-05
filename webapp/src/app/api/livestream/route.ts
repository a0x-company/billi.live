import { LivestreamError } from "@/components/token-detail/token-detail";
import { getLivestream } from "@/firebase/action/livestream/getLivestream";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  console.log("[GET][api/stream]");
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) {
    return NextResponse.json(
      { error: LivestreamError.ADDRESS_REQUIRED },
      { status: 400 }
    );
  }

  try {
    console.log("[GET][api/stream] address", address);
    const livestream = await getLivestream(address, "tokenAddress");
    if (!livestream) {
      return NextResponse.json(
        { error: LivestreamError.LIVESTREAM_NOT_FOUND },
        { status: 404 }
      );
    }
    return NextResponse.json(livestream, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/stream", error);
    return NextResponse.json(
      { error: LivestreamError.UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
