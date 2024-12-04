import { FarcasterUser } from "@/context/FarcasterUserContext";
import { getDocs, query, where } from "firebase/firestore";
import { userDataCollection } from "../client";

export const getUser = async (id: string, by: "fid" | "signer_uuid") => {
  console.log("id: ", id);
  console.log("by: ", by);
  const q = query(userDataCollection, where(by, "==", `${id}`));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  console.log("snapshot: ", snapshot.docs[0].data());
  return snapshot.docs[0].data() as FarcasterUser;
};

export const getRefUser = async (id: string, by: "fid" | "signer_uuid") => {
  const q = query(userDataCollection, where(by, "==", `${id}`));
  const snapshot = await getDocs(q);
  return snapshot.docs[0];
};
