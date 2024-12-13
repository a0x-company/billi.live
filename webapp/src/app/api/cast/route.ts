import neynarClient from "@/lib/neynarClient";
import { NextResponse, NextRequest } from "next/server";

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

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams;
  const hash = query.get("hash");

  if (!hash) {
    return NextResponse.json({ error: "Hash is required" }, { status: 400 });
  }
  try {
    const cast = await neynarClient.lookupCastByHashOrWarpcastUrl({
      identifier: hash,
      type: "hash",
    });
    return NextResponse.json(cast, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
