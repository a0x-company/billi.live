// http client
import axios from "axios";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  console.log("[GET][api/agent]");

  const agentId = "8cc63a38-6ebd-0139-82ee-75727e511406";

  try {
    const response = await axios.post(
      // `http://localhost:3000/${agentId}/message`,
      `https://7691-2800-300-6272-f6b0-58d2-d20c-c1c5-26b8.ngrok-free.app/${agentId}/message`,
      {
        text: "Introduce yourself in an interesting way in english",
      }
    );

    const responseData = response.data;

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error in GET /api/agent", error);
    console.error(error);
    return NextResponse.json(
      { message: "Error talking with agent" },
      { status: 500 }
    );
  }
}

const API_URL = process.env.API_URL;

export async function POST(req: Request) {
  console.log("[POST][api/agent]");

  const { text, streamId } = await req.json();

  try {
    const response = await axios.post(
      `${API_URL}/livestreams/convert-text-to-speech`,
      {
        text: text,
        streamId: streamId,
      }
    );

    const responseData = response.data;

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error in GET /api/agent", error);
    console.error(error);
    return NextResponse.json(
      { message: "Error talking with agent" },
      { status: 500 }
    );
  }
}
