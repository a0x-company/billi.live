import { UUID } from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";

interface CastAuthor {
  object: string;
  fid: number;
  username: string;
  display_name: string;
  custody_address: string;
  pfp_url: string;
  profile?: {
    bio?: {
      text: string;
      mentioned_profiles: string[];
    };
    location?: {
      latitude: number;
      longitude: number;
      address: {
        city: string;
        state: string;
        state_code: string;
        country: string;
        country_code: string;
      };
    };
  };
  follower_count: number;
  following_count: number;
  verifications: string[];
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
  verified_accounts: Array<{
    platform: string;
    username: string;
  }>;
}

interface CastResponse {
  cast: {
    hash: string;
    parent_hash?: string;
    parent_url?: string;
    root_parent_url?: string;
    parent_author?: {
      fid: number;
    };
    author: CastAuthor;
    text: string;
    timestamp: string;
    embeds: Array<{
      url: string;
    }>;
    reactions: {
      likes: Array<{
        fid: number;
        fname: string;
      }>;
      recasts: Array<{
        fid: number;
        fname: string;
      }>;
    };
  };
}

export function castHashToUUID(castHash: string): UUID {
  // Removemos el '0x' del inicio y nos aseguramos de tener suficientes caracteres
  const hash = castHash.replace("0x", "").padEnd(32, "0");

  // Formateamos el hash en el formato UUID requerido
  // UUID format: 8-4-4-4-12 caracteres
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(
    12,
    16
  )}-${hash.slice(16, 20)}-${hash.slice(20, 32)}` as UUID;
}

export async function getCastByHash(
  hash: string,
  viewerFid?: number
): Promise<CastResponse> {
  try {
    if (!process.env.NEYNAR_API_KEY) {
      throw new Error(
        "NEYNAR_API_KEY no está definida en las variables de entorno"
      );
    }

    const url = new URL("https://api.neynar.com/v2/farcaster/cast");
    url.searchParams.append("identifier", hash);
    url.searchParams.append("type", "hash");

    if (viewerFid) {
      url.searchParams.append("viewer_fid", viewerFid.toString());
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error obteniendo cast: ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    elizaLogger.error("Error en getCastByHash:", error);
    throw error;
  }
}

export async function parseAndCleanResponse(
  responseText: string,
  attempts: number = 0
): Promise<{ text: string; action?: string; user: string }> {
  try {
    // Primero intentamos encontrar un bloque JSON
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);

      // Si hay una acción en el texto, la movemos al campo action
      const actionInText = parsed.text.match(/\(([\w_]+)\)/);
      if (actionInText && !parsed.action) {
        parsed.text = parsed.text.replace(/\([\w_]+\)/, "").trim();
        parsed.action = actionInText[1];
      }

      return parsed;
    }

    // Si no hay JSON, buscamos una acción en el texto
    const actionMatch = responseText.match(/\(([\w_]+)\)/);
    if (actionMatch) {
      const cleanText = responseText.replace(/\([\w_]+\)/, "").trim();
      return {
        user: "{{agentName}}",
        text: cleanText,
        action: actionMatch[1],
      };
    }

    // Si no hay formato especial, devolvemos el texto limpio
    return {
      user: "{{agentName}}",
      text: responseText.trim(),
    };
  } catch (error) {
    if (attempts >= 3) {
      return {
        user: "{{agentName}}",
        text: "Lo siento, estoy teniendo problemas para procesar la respuesta, puedes indicarme de nuevo lo que necesitas?",
        action: "NONE",
      };
    }
    return null;
  }
}
