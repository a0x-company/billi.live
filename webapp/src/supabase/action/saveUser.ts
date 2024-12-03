import supabase from "@/config/supabaseClient";
import { FarcasterUser } from "@/context/FarcasterUserContext";

export const saveUser = async (user: FarcasterUser) => {
  try {
    console.log("user", user);
    const { data, error } = await supabase.from("users").insert(user);
    if (error) {
      console.error("Error al guardar el usuario:", error);
    }
    return data;
  } catch (error) {
    console.error("Error al guardar el usuario:", error);
  }
};
