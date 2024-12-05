import { getDocs, query, where } from "firebase/firestore";
import { livestreamDataCollection } from "@/firebase/client";

export interface LivepeerInfo {
  embeaddableBroadcastUrl: string;
  playbackUrl: string;
  srtIngestUrl: string;
  streamId: string;
  streamKey: string;
}

export interface Livestream {
  tokenAddress?: string;
  createdByFID?: number;
  createdByUsername?: string;
  title: string;
  createdAt: string;
  description: string;
  livepeerInfo: LivepeerInfo;
  status: string;
}

export const getLivestream = async (
  id: string,
  by: "tokenAddress" | "fid" | "username"
) => {
  console.log("[getLivestream] id", id, "by", by);
  const q = query(livestreamDataCollection, where(by, "==", id));
  console.log("[getLivestream] q", q);
  const snapshot = await getDocs(q);
  console.log("[getLivestream] snapshot", snapshot);
  if (snapshot.empty) {
    console.log("[getLivestream] snapshot is empty");
    return null;
  }
  console.log("[getLivestream] snapshot", snapshot.docs[0].data());
  return snapshot.docs[0].data() as Livestream;
};

export const getRefLivestream = async (
  id: string,
  by: "fid" | "signer_uuid"
) => {
  const q = query(livestreamDataCollection, where(by, "==", `${id}`));
  const snapshot = await getDocs(q);
  return snapshot.docs[0];
};
