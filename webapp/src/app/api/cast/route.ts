import neynarClient from "@/lib/neynarClient";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pubHash = searchParams.get("pubHash");

  const cast = {
    pubHash: "0x984d5117df404f47bd5a72cb5852921aeddb4fad",
    author: {
      username: "heybilli",
      display_name: "Billi",
      pfp_url:
        "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/c25730b6-e1db-45ff-e874-f72d5dc05a00/rectcrop3",
    },
    text: "GM mfers",
    timestamp: "2024-12-11T21:54:52.000Z",
    reactions: {
      likes_count: 4,
      recasts_count: 0,
    },
    replies: {
      count: 7,
    },
  };

  return NextResponse.json(cast, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const cast = await neynarClient.publishCast({
      signerUuid: body.signer_uuid,
      text: body.text,
    });

    return NextResponse.json(cast, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
