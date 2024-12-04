import { db, userDataCollection } from "@/firebase/client";
import { FarcasterUser } from "@/context/FarcasterUserContext";
import { addDoc } from "firebase/firestore";

export const saveUser = async (user: FarcasterUser) => {
  try {
    console.log("user", user);
    const docRef = await addDoc(userDataCollection, user);
    if (docRef) {
      console.log("Documento creado con éxito:", docRef.id);
    }
    return docRef;
  } catch (error) {
    console.error("Error al guardar el usuario:", error);
  }
};
