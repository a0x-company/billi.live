import { getDocs, query, where } from "firebase/firestore";
import { livestreamDataCollection } from "@/firebase/client";
import { Livestream } from "@/types";

export const getLivestream = async (
  id: string,
  by: "tokenAddress" | "fid" | "handle"
) => {
  const normalizedId = id.toLowerCase();
  const q = query(livestreamDataCollection, where(by, "==", normalizedId));
  const snapshot = await getDocs(q);
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
