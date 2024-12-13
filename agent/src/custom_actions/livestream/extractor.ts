import { IAgentRuntime, ModelClass, generateText } from "@ai16z/eliza";
import { StreamDetails } from "./types.ts";

export class StreamDetailsExtractor {
  constructor(private runtime: IAgentRuntime) {}

  async extractStreamDetails(text: string): Promise<StreamDetails> {
    const extractionContext = `
      Extract the following information and respond with JSON format.
      
      IMPORTANT: 
      - Return ONLY the JSON object
      - Empty string ("") for missing fields
      - Include $ in symbols
      - Extract values after any separator (: or similar)
      - Remove leading/trailing whitespace
    
      Text to analyze:
      ${text}
    
      Return only JSON (no markdown, no backticks):
      {
        "title": "string",
        "description": "string",
        "tokenSymbol": "string",
        "tokenName": "string"
      }
    `;

    const details = await generateText({
      runtime: this.runtime,
      context: extractionContext,
      modelClass: ModelClass.SMALL,
      stop: ["\n"],
    });

    return JSON.parse(details);
  }
}
