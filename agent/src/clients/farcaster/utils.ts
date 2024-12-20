import { elizaLogger } from "@ai16z/eliza";
import { ConversationMessage } from "./types.ts";

export const parseAndCleanResponse = async (
  text: string,
  attempt: number
): Promise<{ text: string; action: string } | null> => {
  try {
    const jsonMatch = text.match(/```json\s*({[\s\S]*?})\s*```/);
    if (!jsonMatch) {
      elizaLogger.error(`Attempt ${attempt + 1}: No JSON block found`);
      return null;
    }

    const jsonStr = jsonMatch[1].trim();
    let parsed = JSON.parse(jsonStr);

    if (!parsed.text || typeof parsed.text !== "string") {
      elizaLogger.error(
        `Attempt ${attempt + 1}: Missing 'text' field or not a string`
      );
      return null;
    }

    let cleanedText = parsed.text.trim();

    const actionInText = cleanedText.match(/\(([\w_]+)\)/);
    if (actionInText) {
      cleanedText = cleanedText.replace(/\s*\([\w_]+\)\s*/, "").trim();

      if (!parsed.action || parsed.action === "NONE") {
        parsed.action = actionInText[1];
        elizaLogger.warn(
          `Action found in text "(${actionInText[1]})" moved to action field`
        );
      } else if (parsed.action !== actionInText[1]) {
        elizaLogger.warn(
          `Conflicting actions: text=(${actionInText[1]}) vs field=${parsed.action}. Using action field.`
        );
      }
    }

    if (!cleanedText) {
      elizaLogger.error(`Attempt ${attempt + 1}: Text is empty after cleaning`);
      return null;
    }

    return {
      text: cleanedText.slice(0, 320),
      action: parsed.action || "NONE",
    };
  } catch (error) {
    elizaLogger.error(
      `Error parsing response (attempt ${attempt + 1}):`,
      error
    );
    return null;
  }
};

export const validateWebhookPayload = (payload: any): boolean => {
  if (!payload || typeof payload !== "object") return false;
  if (!payload.type || !payload.data) return false;
  if (!payload.data.hash || !payload.data.author) return false;
  return true;
};

export const formatConversationHistory = (
  messages: ConversationMessage[]
): string => {
  return messages
    .map((msg) => `${msg.author}: ${msg.text}`)
    .join("\n")
    .slice(0, 1000);
};

export const cleanupActionResponses = (
  map: Map<string, number>,
  timeout: number
): void => {
  const now = Date.now();
  for (const [key, timestamp] of map.entries()) {
    if (now - timestamp > timeout) {
      map.delete(key);
    }
  }
};
