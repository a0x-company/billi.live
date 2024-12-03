import { Evaluator, IAgentRuntime, Memory, State } from "@ai16z/eliza";

interface Fact {
  claim: string;
  type: "fact" | "opinion" | "status";
  in_bio: boolean;
  already_known: boolean;
}

const glassFactEvaluator: Evaluator = {
    name: "GLASS_FACT_EVALUATOR",
    description: "Evalúa el contexto para determinar cambios de personalidad",
    similes: ["PERSONALITY_EVALUATOR"],
    alwaysRun: true,
  
    validate: async (runtime: IAgentRuntime, message: Memory) => {
      return message?.content?.text !== undefined;
    },
  
    handler: async (runtime: IAgentRuntime, message: Memory) => {
      try {
        const recentMemories = await runtime.messageManager.getMemories({
          roomId: message.roomId,
          count: 5,
          unique: true
        });
  
        const text = message.content.text.toLowerCase();
        let detectedPersonality = null;
        const weights = new Map<string, number>();
  
        const personalityPatterns = {
          HAWK: {
            patterns: [
              /militar|amenaza|guerra|conflicto|estrategia|BRRRR|apache|sida|táctico|10,000 pies/i,
              /military|threat|war|conflict|strategy|tactical|defense|attack|mission|alert/i
            ],
            baseWeight: 1.0
          },
          ALEXANDER: {
            patterns: [
              /tesla|musk|spacex|16k|estadio|ladies|incompetencia|fracaso/i,
              /failure|stadium|incompetence|criticism|luxury|wealth|elite|performance|technology/i
            ],
            baseWeight: 1.0
          },
          MORGAN: {
            patterns: [
              /finanzas|mercado|inversiones|porsche verde|mamma mia|bellissimo|sombras/i,
              /finance|market|investment|stocks|money|wealth|power|influence|trade/i
            ],
            baseWeight: 1.0
          },
          DENNIS: {
            patterns: [
              /eficiencia|análisis|porcentaje|optimización|mittelmäßigkeit|eine analyse/i,
              /efficiency|analysis|percentage|optimization|metrics|performance|data|precision/i
            ],
            baseWeight: 1.0
          },
          VIKTOR: {
            patterns: [
              /coca-cola|portal|experimento|interdimensional|tovarisch|científico/i,
              /experiment|science|quantum|dimension|portal|research|discovery|theory/i
            ],
            baseWeight: 1.0
          },
          SHADOW: {
            patterns: [
              /digital|servidor|control|información|watashi|desu|tecnología/i,
              /digital|server|control|information|network|system|data|security/i
            ],
            baseWeight: 1.0
          }
        };
  
        for (const [personality, config] of Object.entries(personalityPatterns)) {
          let weight = config.baseWeight;
          
          // Puntos por patrones encontrados
          const matchCount = config.patterns.reduce((count, pattern) => {
            const matches = (text.match(pattern) || []).length;
            return count + matches;
          }, 0);
          weight += matchCount * 0.5;
  
          const recentUseCount = recentMemories.filter(mem => 
            (mem.content?.facts as Fact[])?.some(f => 
              f.type === "fact" && 
              f.claim.includes(personality)
            )
          ).length;
          weight *= Math.pow(0.7, recentUseCount); 
          weights.set(personality, weight);
        }
  
        const significantWeights = Array.from(weights.entries())
          .filter(([_, w]) => w > 0.1);
  
        if (significantWeights.length > 0) {
          const totalWeight = significantWeights.reduce((sum, [_, w]) => sum + w, 0);
          let random = Math.random() * totalWeight;
          
          for (const [personality, weight] of significantWeights) {
            random -= weight;
            if (random <= 0) {
              detectedPersonality = personality;
              break;
            }
          }
        } else {
          const recentPersonalities = new Set(recentMemories
            .map(mem => (mem.content?.facts as Fact[])?.find(f => 
              f.type === "fact" && 
              f.claim.includes("personality pattern")
            )?.claim.split(":")[1]?.trim())
            .filter(Boolean)); 
          const availablePersonalities = Object.keys(personalityPatterns)
            .filter(p => !recentPersonalities.has(p));
  
          if (availablePersonalities.length > 0) {
            detectedPersonality = availablePersonalities[
              Math.floor(Math.random() * availablePersonalities.length)
            ];
          } else {
            detectedPersonality = Object.keys(personalityPatterns)[
              Math.floor(Math.random() * Object.keys(personalityPatterns).length)
            ];
          }
        }
  
        const facts: Fact[] = [{
          claim: `Current personality pattern: ${detectedPersonality} (confidence: ${weights.get(detectedPersonality)?.toFixed(2) || 'random'})`,
          type: "fact",
          in_bio: true,
          already_known: false
        }];
  
        await runtime.messageManager.createMemory({
          id: message.id,
          content: { 
            text: message.content.text,
            facts,
            personalityWeights: Object.fromEntries(weights)
          },
          roomId: message.roomId,
          userId: message.userId,
          agentId: runtime.agentId
        });
  
      } catch (error) {
        console.error("Failed to evaluate facts:", error);
      }
    },
  
    examples: [{
      context: "Evaluating personality patterns",
      messages: [{
        user: "{{user1}}",
        content: {
          text: "BRRRR! Military alert!"
        }
      }],
      outcome: "HAWK personality pattern detected with high confidence"
    }]
  };

export const factEvaluator = glassFactEvaluator;
