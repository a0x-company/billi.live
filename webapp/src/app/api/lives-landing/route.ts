import { NextResponse } from "next/server";

import { LivestreamError } from "@/types";

import axios from "axios";

const API_URL = process.env.API_URL;

export async function GET(req: Request) {
  console.log("[GET][api/lives-landing]");

  try {
    const response = await axios.get(
      `${API_URL}/livestreams/lives-for-landing`
    );
    const livestreams = response.data;

    if (!livestreams) {
      return NextResponse.json(
        { error: LivestreamError.LIVESTREAM_NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json(livestreams, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/stream", error);
    return NextResponse.json(
      { error: LivestreamError.UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
