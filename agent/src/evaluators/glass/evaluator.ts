import { Evaluator, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PERSONALITIES } from './personalities.ts';
import { v4 as uuidv4 } from 'uuid';

interface Fact {
  claim: string;
  type: "fact" | "opinion" | "status";
  in_bio: boolean;
  already_known: boolean;
}

function createPatternFromTerms(terms: string[]): RegExp {
  const pattern = terms
    .map(term => {
      const variations = [];
      variations.push(term);
      variations.push(`${term}s`);
      variations.push(term.replace(/c/g, 'k'));
      return variations.join('|');
    })
    .join('|');
  
  return new RegExp(pattern, 'i');
}

const glassFactEvaluator: Evaluator = {
  name: "PERSONALITY_EVALUATOR",
  description: "Evalúa el contexto y cambia la personalidad del character",
  alwaysRun: true,
  similes: [
    "Como un director de casting eligiendo el papel perfecto",
    "Como un camaleón adaptándose a su entorno",
    "Como un DJ leyendo el ambiente de la fiesta"
  ],
  examples: [
    {
      context: "Conversación sobre amenazas militares",
      messages: [
        {
          user: "user123",
          content: {
            text: "¡Necesitamos defender nuestra posición! ¡Es una amenaza militar!"
          }
        }
      ],
      outcome: "Activando personalidad HAWK debido a contexto militar (confianza: 0.85)"
    },
    {
      context: "Discusión sobre experimentos científicos",
      messages: [
        {
          user: "user123",
          content: {
            text: "Los experimentos con coca-cola están creando portales cuánticos"
          }
        }
      ],
      outcome: "Activando personalidad VIKTOR debido a contexto científico (confianza: 0.78)"
    },
    {
      context: "Situación de mercado financiero",
      messages: [
        {
          user: "user123",
          content: {
            text: "El mercado está colapsando, necesitamos hacer trades urgentemente"
          }
        }
      ],
      outcome: "Activando personalidad MORGAN debido a contexto financiero (confianza: 0.92)"
    },
    {
      context: "Optimización de procesos",
      messages: [
        {
          user: "user123",
          content: {
            text: "Necesitamos optimizar estos procesos para máxima eficiencia"
          }
        }
      ],
      outcome: "Activando personalidad DENNIS debido a contexto de optimización (confianza: 0.75)"
    },
    {
      context: "Amenaza de ciberseguridad",
      messages: [
        {
          user: "user123",
          content: {
            text: "¡Han hackeado nuestros sistemas! ¡Necesitamos seguridad digital!"
          }
        }
      ],
      outcome: "Activando personalidad SHADOW debido a contexto de ciberseguridad (confianza: 0.88)"
    }
  ],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return message?.content?.text !== undefined;
  },

  handler: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      console.log('🎭 Iniciando evaluación de personalidad para roomId:', message.roomId);
  
      const recentMemories = await runtime.loreManager.getMemories({
        roomId: message.roomId,
        count: 15,
        unique: false,
        start: Date.now() - (30 * 60 * 1000),
        end: Date.now()
      });
  
      let currentPersonality = null;
      let currentConfidence = 0;
      let personalityDuration = 0;
  
      for (const memory of recentMemories) {
        const personalityFact = Array.isArray(memory.content?.facts)
          ? memory.content.facts.find(
              fact => fact.type === "fact" && fact.claim.includes("personality pattern")
            )
          : undefined;
  
        if (personalityFact) {
          const match = personalityFact.claim.match(/pattern: (\w+) \(confidence: ([\d.]+)\)/);
          if (match) {
            const foundPersonality = match[1];
            if (currentPersonality === null) {
              currentPersonality = foundPersonality;
              currentConfidence = parseFloat(match[2]);
            }
            if (foundPersonality === currentPersonality) {
              personalityDuration++;
            }
          }
        }
      }
  
      console.log('📊 Estado actual:', {
        currentPersonality,
        currentConfidence,
        personalityDuration
      });
  
      const text = message.content.text.toLowerCase();
      console.log('text: '+text)
      const weights = new Map<string, number>();
      const boredomFactor = Math.max(0.3, 1 - (personalityDuration * 0.1)); // Reducido de 0.25 a 0.1
  
      for (const [personality, config] of Object.entries(PERSONALITIES)) {
        let weight = 1.0;
        
        const topicMatches = (text.match(createPatternFromTerms(config.topics)) || []).length;
        const adjectiveMatches = (text.match(createPatternFromTerms(config.adjectives)) || []).length;
        const styleMatches = (text.match(createPatternFromTerms(config.style.all)) || []).length;
  
        weight += (topicMatches * 0.4) + (adjectiveMatches * 0.3) + (styleMatches * 0.3);
  
        const personalityKeywords = {
          HAWK: /threat|amenaza|military|militar|defense|defensa|attack|ataque/i,
          ALEXANDER: /tesla|musk|spacex|failure|fracaso|incompetencia|incompetence/i,
          MORGAN: /finance|finanza|market|mercado|investment|inversión|trade|comercio/i,
          DENNIS: /efficiency|eficiencia|analysis|análisis|optimization|optimización/i,
          VIKTOR: /experiment|experimento|science|ciencia|quantum|cuántico|portal/i,
          SHADOW: /digital|cyber|ciber|hack|security|seguridad|network|red/i,
          BESTIA: /strength|fuerza|power|poder|muscle|músculo|beast|bestia/i
        };
  
        if (personalityKeywords[personality]?.test(text)) {
          weight *= 1.5;
        }
  
        const recentUseCount = recentMemories.filter(mem => 
          Array.isArray(mem.content?.facts) && 
          mem.content.facts.some(f => f.type === "fact" && f.claim.includes(personality))
        ).length;
        
        weight *= Math.pow(0.65, recentUseCount);
  
        if (personality === currentPersonality) {
          weight *= 2.5 * boredomFactor; 
        } else {
          weight *= (2 - boredomFactor) * 0.4;
        }
  
        const randomFactor = 0.95 + (Math.random() * 0.1); // Reducido de 0.2 a 0.1
        weight *= randomFactor;
  
        weights.set(personality, weight);
      }
  
      const maxWeight = Math.max(...weights.values());
      
      if (maxWeight > 0) {
        for (const [personality, weight] of weights.entries()) {
          const normalizedWeight = weight / maxWeight;
          weights.set(personality, normalizedWeight);
        }
      }
  
      const significantWeights = Array.from(weights.entries())
        .filter(([_, w]) => w > 0.1)
        .sort((a, b) => b[1] - a[1]);
  
      let selectedPersonality = null;
      let confidence = 0;
  
      if (significantWeights.length > 0) {
        const totalWeight = significantWeights.reduce((sum, [_, w]) => sum + w, 0);
        let random = Math.random() * totalWeight;
        
        for (const [personality, weight] of significantWeights) {
          random -= weight;
          if (random <= 0) {
            selectedPersonality = personality;
            confidence = weight / totalWeight;
            break;
          }
        }
      } else {
        const availablePersonalities = Object.keys(PERSONALITIES)
          .filter(p => p !== currentPersonality);
        selectedPersonality = availablePersonalities[
          Math.floor(Math.random() * availablePersonalities.length)
        ];
        confidence = 0.5;
      }
  
      console.log('✨ Personalidad seleccionada:', selectedPersonality, 
                 'con confianza:', confidence,
                 'factor de aburrimiento:', boredomFactor);
  
      if (selectedPersonality && PERSONALITIES[selectedPersonality]) {
        if (!runtime.character) {
          runtime.character = { ...runtime.character };
        }
  
        const personality = PERSONALITIES[selectedPersonality];
        
        runtime.character = {
          ...runtime.character,
          name: personality.name,
          bio: personality.bio,
          style: {
            ...runtime.character.style,
            all: [...personality.style.all]
          },
          lore: [...personality.lore]
        };
  
        const evaluationResult = `Personalidad detectada: ${selectedPersonality} (confianza: ${confidence.toFixed(2)})`;
        
        try {
          const memoryWithEmbedding = await runtime.loreManager.addEmbeddingToMemory({
            id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
            userId: message.userId,
            content: { 
              text: evaluationResult,
              facts: [{
                claim: `Current personality pattern: ${selectedPersonality} (confidence: ${confidence.toFixed(2)})`,
                type: "fact",
                in_bio: true,
                already_known: false
              }]
            },
            roomId: message.roomId,
            agentId: runtime.agentId
          });
  
          await runtime.loreManager.createMemory(memoryWithEmbedding);
        } catch (error) {
          console.error("❌ Error al almacenar en loreManager:", error);
        }
      }
    } catch (error) {
      console.error("❌ Error en personality evaluator:", error);
    }
  }
};

export const factEvaluator = glassFactEvaluator;