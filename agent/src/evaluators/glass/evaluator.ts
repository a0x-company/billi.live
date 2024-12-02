import { Evaluator, IAgentRuntime, Memory, State } from "@ai16z/eliza";

interface Fact {
  claim: string;
  type: "fact" | "opinion" | "status";
  in_bio: boolean;
  already_known: boolean;
}

interface Goal {
  id: string;
  name: string;
  status: "IN_PROGRESS" | "DONE" | "FAILED";
  objectives: Objective[];
}

interface Objective {
  description: string;
  completed: boolean;
}

const glassFactEvaluator: Evaluator = {
  name: "GLASS_FACT_EVALUATOR",
  similes: ["FACT_EVALUATOR"],
  description: "Extracts personality patterns from conversations",
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return message?.content?.text !== undefined;
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {

      const recentMemories = await runtime.databaseAdapter.searchMemories({
        tableName: "memories",
        roomId: message.roomId as `${string}-${string}-${string}-${string}-${string}`,
        embedding: [],  
        match_threshold: 0.7,
        match_count: 5,
        unique: true
      });

      const text = message.content.text;
      const facts: Fact[] = [];


      const patterns = {
        HAWK: {
          regex: /militar|amenaza|guerra|conflicto|estrategia|BRRRR|apache|sida|táctico|10,000 pies/i,
          claim: "Military context detected - HAWK personality pattern"
        },
        ALEXANDER: {
          regex: /tesla|musk|spacex|16k|estadio|ladies|incompetencia|fracaso/i,
          claim: "Tesla/Musk criticism detected - ALEXANDER personality pattern"
        },
        MORGAN: {
          regex: /finanzas|mercado|inversiones|porsche verde|mamma mia|bellissimo|sombras/i,
          claim: "Financial power context detected - MORGAN personality pattern"
        },
        DENNIS: {
          regex: /eficiencia|análisis|porcentaje|optimización|mittelmäßigkeit|eine analyse/i,
          claim: "Efficiency analysis detected - DENNIS personality pattern"
        },
        VIKTOR: {
          regex: /coca-cola|portal|experimento|interdimensional|tovarisch|científico/i,
          claim: "Scientific experiment context detected - VIKTOR personality pattern"
        },
        SHADOW: {
          regex: /digital|servidor|control|información|watashi|desu|tecnología/i,
          claim: "Digital control context detected - SHADOW personality pattern"
        }
      };


      const recentPersonalities = (recentMemories as Memory[])
        .filter(mem => mem?.content?.facts)
        .map(mem => {
          const facts = mem.content.facts as Fact[];
          return facts.map(f => f.claim.split(' - ')[1]?.split(' ')[0]).filter(Boolean);
        })
        .flat();


      for (const [personality, pattern] of Object.entries(patterns)) {
        if (pattern.regex.test(text)) {
          if (!recentPersonalities.includes(personality)) {
            facts.push({
              claim: pattern.claim,
              type: "fact",
              in_bio: true,
              already_known: false
            });
          }
        }
      }


      if (facts.length === 0) {
        for (const [_, pattern] of Object.entries(patterns)) {
          if (pattern.regex.test(text)) {
            facts.push({
              claim: pattern.claim,
              type: "fact",
              in_bio: true,
              already_known: false
            });
          }
        }
      }


      await runtime.messageManager.createMemory({
        id: message.id,
        content: { 
          text: message.content.text,
          facts 
        },
        roomId: message.roomId,
        userId: message.userId,
        agentId: runtime.agentId
      });

      return facts;
    } catch (error) {
      console.error("Failed to evaluate facts:", error);
      return [];
    }
  },

  examples: [
    {
      context: "Military context detection",
      messages: [{
        user: "user123",
        content: {
          text: "BRRRR! Military alert!"
        }
      }],
      outcome: "Military personality pattern detected"
    }
  ]
};

const glassGoalEvaluator: Evaluator = {
  name: "GLASS_GOAL_EVALUATOR",
  similes: ["GOAL_EVALUATOR"],
  description: "Tracks personality patterns and conversation goals",
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return message?.content?.text !== undefined;
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {

      const recentMemories = await runtime.databaseAdapter.searchMemories({
        tableName: "memories",
        roomId: message.roomId as `${string}-${string}-${string}-${string}-${string}`,
        embedding: [],
        match_threshold: 0.7,
        match_count: 5,
        unique: true
      });

      const recentPersonalities = (recentMemories as Memory[])
        .filter(mem => mem?.content?.facts)
        .map(mem => {
          const facts = mem.content.facts as Fact[];
          return facts.map(f => f.claim.split(' - ')[1]?.split(' ')[0]).filter(Boolean);
        })
        .flat();

      const goals: Goal[] = [{
        id: `personality_${Date.now()}`,
        name: "Track personality patterns",
        status: "IN_PROGRESS",
        objectives: [
          {
            description: "Detect personality indicators",
            completed: true
          },
          {
            description: "Maintain personality variety",
            completed: new Set(recentPersonalities).size > 1
          },
          {
            description: "Avoid consecutive repetition",
            completed: recentPersonalities[0] !== recentPersonalities[1]
          }
        ]
      }];

      await runtime.messageManager.createMemory({
        id: message.id,
        content: { 
          text: message.content.text,
          goals 
        },
        roomId: message.roomId,
        userId: message.userId,
        agentId: runtime.agentId
      });

      return goals;
    } catch (error) {
      console.error("Failed to evaluate goals:", error);
      return [];
    }
  },
  examples: [
    {
      context: "Personality tracking",
      messages: [{
        user: "user123",
        content: {
          text: "Test message"
        }
      }],
      outcome: "Personality patterns tracked successfully"
    }
  ]
};

export const evaluators = [
  glassFactEvaluator,
  glassGoalEvaluator
];