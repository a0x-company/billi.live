import { getSignedKey } from "@/lib/getSignedKey";
import { NextResponse } from "next/server";
import neynarClient from "@/lib/neynarClient";
import { saveUser } from "@/supabase/action/saveUser";

export async function POST(request: Request) {
  console.log("[POST][api/signer]");
  const { user } = await request.json();
  try {
    const signedKey = await getSignedKey();
    console.log("signedKey: ", signedKey);
    const userWithSignedKey = {
      ...user,
      signer_uuid: signedKey.signer_uuid,
      public_key: signedKey.public_key,
      status: signedKey.status,
      signer_approval_url: signedKey.signer_approval_url,
    };
    console.log("userWithSignedKey: ", userWithSignedKey);
    await saveUser(userWithSignedKey);

    return NextResponse.json(signedKey, {
      status: 200,
    });
  } catch (error) {
    console.error("Error in POST /api/signer", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  console.log("[GET][api/signer]");
  const { searchParams } = new URL(req.url);
  const signer_uuid = searchParams.get("signer_uuid");

  if (!signer_uuid) {
    return NextResponse.json(
      { error: "signer_uuid is required" },
      { status: 400 }
    );
  }

  try {
    const signer = await neynarClient.lookupSigner({ signerUuid: signer_uuid });

    return NextResponse.json(signer, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
