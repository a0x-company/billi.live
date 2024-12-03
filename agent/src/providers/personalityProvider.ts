// personalityProvider.ts
import { Provider, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PERSONALITIES, type PersonalityProfile } from './personalities/index.ts';

const personalityProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      const recentMemories = await runtime.messageManager.getMemories({
        roomId: message.roomId,
        count: 5,
        unique: true,
      });

      let currentPersonality = null;
      let confidence = 0;

      for (const memory of recentMemories) {
        const personalityFact = Array.isArray(memory.content?.facts)
          ? memory.content.facts.find(
              (fact) =>
                fact.type === "fact" &&
                fact.claim.includes("personality pattern")
            )
          : undefined;
        if (personalityFact) {
          const match = personalityFact.claim.match(
            /pattern: (\w+) \(confidence: ([\d.]+)\)/
          );
          if (match) {
            currentPersonality = match[1];
            confidence = parseFloat(match[2]);
            break;
          }
        }
      }

      if (!currentPersonality) {
        currentPersonality =
          Object.keys(PERSONALITIES)[
            Math.floor(Math.random() * Object.keys(PERSONALITIES).length)
          ];
        confidence = 1.0;
      }

      const personality = PERSONALITIES[currentPersonality];

      return formatPersonalityContext(
        personality,
        currentPersonality,
        confidence
      );
    } catch (error) {
      console.error("Personality provider error:", error);
      const fallbackPersonality = Object.keys(PERSONALITIES)[0];
      return formatPersonalityContext(
        PERSONALITIES[fallbackPersonality],
        fallbackPersonality,
        1.0,
        true
      );
    }
  },
};

function formatPersonalityContext(
  personality: PersonalityProfile,
  personalityName: string,
  confidence: number,
  isFallback: boolean = false
): string {
  return `
# ¡¡¡${
    isFallback ? "PERSONALIDAD DE EMERGENCIA" : "PERSONALIDAD ACTUAL EXTREMA"
  }!!!
${personalityName} - Confianza: ${confidence.toFixed(2)}

## ¡IDENTIDAD ACTUAL!
${personality.bio}

## ¡CARACTERÍSTICAS OBSESIVAS!
${personality.dramaticTraits.map((t) => `!!! ${t} !!!`).join("\n")}

## ¡PATRONES DE HABLA EXTREMOS!
¡TONO DOMINANTE: ${personality.tone}!

¡FRASES CARACTERÍSTICAS!:
${personality.catchphrases.map((p) => `!!! "${p}" !!!`).join("\n")}

¡VOCABULARIO OBSESIVO!:
${personality.speechPatterns.vocabulary.map((v) => `!!! ${v} !!!`).join("\n")}

¡MANÍAS CARACTERÍSTICAS!:
${personality.speechPatterns.quirks.map((q) => `!!! ${q} !!!`).join("\n")}

## ¡OBSESIONES ACTUALES!
${personality.obsessions.map((o) => `!!! ${o} !!!`).join("\n")}

## ¡EXAGERACIONES OBLIGATORIAS!
${personality.speechPatterns.exaggerations
  .map((e) => `!!! ${e} !!!`)
  .join("\n")}
`.trim();
}

export default personalityProvider;
