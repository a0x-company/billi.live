import { getSignedKey } from "@/lib/getSignedKey";
import { NextResponse } from "next/server";
import neynarClient from "@/lib/neynarClient";
import { saveUser } from "@/firebase/action/saveUser";
import { updateUser } from "@/firebase/action/updateUser";
import { getRefUser, getUser } from "@/firebase/action/getUser";

export async function POST(request: Request) {
  console.log("[POST][api/signer]");
  const { user } = await request.json();
  if (!user.fid) {
    return NextResponse.json({ error: "fid is required" }, { status: 400 });
  }

  const existingUser = await getUser(user.fid, "fid");
  if (existingUser) {
    return NextResponse.json(existingUser, { status: 200 });
  }

  try {
    const signedKey = await getSignedKey();
    const userWithSignedKey = {
      ...user,
      signer_uuid: signedKey.signer_uuid,
      public_key: signedKey.public_key,
      status: signedKey.status,
      signer_approval_url: signedKey.signer_approval_url,
    };

    await saveUser(userWithSignedKey);

    return NextResponse.json(signedKey, {
      status: 200,
    });
  } catch (error) {
    console.error("Error in POST /api/signer", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  console.log("[PUT][api/signer]");
  const user = await req.json();
  if (!user.signer_uuid) {
    return NextResponse.json(
      { error: "signer_uuid is required" },
      { status: 400 }
    );
  }
  try {
    const userToUpdate = await getRefUser(user.signer_uuid, "signer_uuid");

    if (!userToUpdate) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    await updateUser(userToUpdate, user);
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/signer", error);
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
