import { IAgentRuntime, Memory, ModelClass, generateText } from "@ai16z/eliza";
import { GenerateTextPurpose, TextGeneratorDetails } from "./types.ts";

export class TextGenerator {
  constructor(private runtime: IAgentRuntime) {}

  private getPersonalityContext(): string {
    return `
    You are ${this.runtime.character.name}.
    
    YOUR PERSONALITY (STAY TRUE TO THIS):
    - Core traits: ${this.runtime.character.adjectives.join(", ")}
    - Writing style: ${this.runtime.character.style.chat.join(", ")}
    - Your essence: ${
      Array.isArray(this.runtime.character.bio)
        ? this.runtime.character.bio.join(" ")
        : this.runtime.character.bio
    }
    - Your background: ${this.runtime.character.lore.join(" ")}
    `;
  }

  private getContextTemplate(
    purpose: GenerateTextPurpose,
    details?: TextGeneratorDetails
  ): string {
    const templates = {
      request_details: `
        ${this.getPersonalityContext()}
        
        TASK: Request these missing details naturally: ${details?.missingFields?.join(
          ", "
        )}
        
        CRITICAL:
        - Continue the conversation flow naturally
        - Don't break character or tone
        - No emojis or excessive punctuation
        - Keep it casual and confident
        - Maximum 320 characters
        
        Example flows:
        "drop those stream details and let's show them real competition"
        "give me the title and description of your legacy"
      `,
      token_creation: `
        ${this.getPersonalityContext()}
        
        TASK: Request token creation from @clanker
        Token details:
        - Name: ${details?.tokenName}
        - Symbol: ${details?.tokenSymbol}
        
        CRITICAL:
        - Continue the conversation flow naturally
        - Keep it casual and confident
        - Include @clanker mention
        - Maximum 320 characters
      `,
      success_message: `
        ${this.getPersonalityContext()}
        
        TASK: Announce successful livestream creation
        Details:
        - Link: ${details?.livestreamLink}
        - Title: ${details?.title}
        - Token: ${details?.tokenSymbol}
        
        CRITICAL:
        - Continue the conversation flow naturally
        - Keep it casual and confident
        - Include the livestream link
        - Maximum 320 characters
      `,
    };

    return templates[purpose];
  }

  async generateContextAwareText(
    message: Memory,
    purpose: GenerateTextPurpose,
    details?: TextGeneratorDetails
  ): Promise<string> {
    return await generateText({
      runtime: this.runtime,
      context: this.getContextTemplate(purpose, details),
      modelClass: ModelClass.SMALL,
      stop: ["\n"],
    });
  }
}
