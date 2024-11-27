import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { NextRequest } from "next/server";

const client = new NeynarAPIClient({
  apiKey: process.env.NEYNAR_API_KEY as string,
});

export async function GET(request: NextRequest) {
  console.log("[GET][api/fetch-user]");
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const { data } = await client.lookupUserByVerification({
    address: address as string,
  });
  console.log(data);
  return NextResponse.json(data);
}
