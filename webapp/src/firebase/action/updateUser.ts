import { FarcasterUser } from "@/context/FarcasterUserContext";
import {
  DocumentData,
  QueryDocumentSnapshot,
  updateDoc,
} from "firebase/firestore";

export const updateUser = async (
  userToUpdate: QueryDocumentSnapshot<DocumentData, DocumentData>,
  user: FarcasterUser
) => {
  try {
    console.log("user", user, "userToUpdate", userToUpdate.ref);
    const result = await updateDoc(userToUpdate.ref, {
      ...user,
    });
    return result;
  } catch (error) {
    console.error("Error al guardar el usuario:", error);
  }
};
