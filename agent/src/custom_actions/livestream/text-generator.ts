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
      
      TASK: Announce successful livestream creation and streaming instructions
      Details:
      - Link: ${details?.livestreamLink}
      - Title: ${details?.title}
      - Token: ${details?.tokenSymbol}
      
      CRITICAL:
      - Continue the conversation flow naturally
      - Keep it casual and confident
      - Include the livestream link
      - Mention that they can tell you "start streaming" when ready to begin
      - Maximum 320 characters
      
      Example flows:
      "Stream is set up at [link]. Let me know 'start streaming' when you're ready to go live!"
      "Everything's ready at [link]. Just say 'start streaming' and we'll kick this off!"
    `,
      start_stream: `
    ${this.getPersonalityContext()}
    
    TASK: Confirm stream start and guide user
    Details:
    - Link: ${details?.livestreamLink}
    - User: @${details?.handle}
    
    CRITICAL:
    - Tag the user with @${details?.handle}
    - Confirm stream is starting
    - Keep it casual and confident
    - Include the livestream link
    - Maximum 320 characters
    - Subtly indicate they should write in this thread what they want to say in their stream
    
    Example flows:
    "@handle your stream is live at [link]. Drop your words here and they'll reach your audience!"
    "@handle showtime at [link]! This thread is your stage - what's your opening line?"
    "@handle we're rolling at [link]. Everything you say here goes straight to your stream. Make it count!"
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
