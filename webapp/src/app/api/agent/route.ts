// http client
import axios from "axios";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  console.log("[GET][api/agent]");

  const agentId = "0ee6bd2a-636a-05b8-af03-342372e792bd";

  try {
    const response = await axios.post(
      `http://localhost:3000/${agentId}/message`,
      //   `https://041d-2800-300-6272-f6b0-d12c-8c4c-543b-6c7d.ngrok-free.app/${agentId}/message`,
      { text: "Introduce yourself in an interesting way" }
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
