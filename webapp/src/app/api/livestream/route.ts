import { LivestreamError } from "@/types";
import { NextResponse } from "next/server";

import axios from "axios";

const API_URL = process.env.API_URL;

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
    const normalizedAddress = address.toLowerCase();
    const response = await axios.get(
      `${API_URL}/livestreams/livestream-by-token-address?tokenAddress=${normalizedAddress}`
    );
    const livestream = response.data;

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
