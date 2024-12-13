import neynarClient from "@/lib/neynarClient";

import { NextResponse } from "next/server";

import axios from "axios";

export async function GET(req: Request) {
  console.log("[GET][api/cast]");

  const { searchParams } = new URL(req.url);
  const pubHash = searchParams.get("pubHash");

  try {
    const response = await axios.get(
      `https://api.neynar.com/v2/farcaster/cast`,
      {
        params: {
          type: "hash",
          identifier: pubHash,
        },
        headers: {
          accept: "application/json",
          api_key: process.env.NEYNAR_API_KEY,
        },
      }
    );

    // Transformar la respuesta al formato deseado
    const formattedCast = {
      pubHash: response.data.cast.hash,
      author: {
        username: response.data.cast.author.username,
        display_name: response.data.cast.author.display_name,
        pfp_url: response.data.cast.author.pfp_url,
      },
      text: response.data.cast.text,
      timestamp: response.data.cast.timestamp,
      reactions: {
        likes_count: response.data.cast.reactions.likes_count,
        recasts_count: response.data.cast.reactions.recasts_count,
      },
      replies: {
        count: response.data.cast.replies.count,
      },
    };

    return NextResponse.json(formattedCast, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch cast" },
      { status: 500 }
    );
  }
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
