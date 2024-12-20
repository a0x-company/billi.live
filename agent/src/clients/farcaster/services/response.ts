import { elizaLogger, generateMessageResponse, ModelClass } from '@ai16z/eliza';
import { parseAndCleanResponse } from '../utils';
import { farcasterMessageTemplate, farcasterReplyMessageTemplate, farcasterShouldRespondTemplate, farcasterShouldRespondToReplyTemplate } from '../templates';

export class ResponseService {
  constructor(private runtime: any) {}

  private getTemplateForType(type: 'mention' | 'reply', isResponseTemplate: boolean = true) {
    if (isResponseTemplate) {
      // Templates for responses
      if (type === 'mention') {
        return this.runtime.character.templates?.farcasterMessageHandlerTemplate || 
               farcasterMessageTemplate;
      }
      return this.runtime.character.templates?.farcasterReplyMessageHandlerTemplate || 
             farcasterReplyMessageTemplate;
    } else {
      // Templates for shouldRespond
      if (type === 'mention') {
        return this.runtime.character.templates?.farcasterShouldRespondTemplate || 
               farcasterShouldRespondTemplate;
      }
      return this.runtime.character.templates?.farcasterShouldRespondToReplyTemplate || 
             farcasterShouldRespondToReplyTemplate;
    }
  }

  async generateResponseWithRetries(state: any, type: 'mention' | 'reply') {
    const template = this.getTemplateForType(type, true);
    const context = this.runtime.composeContext({ state, template });
    
    let attempts = 0;
    let parsedResponse = null;
    let response = null;

    while (attempts < 3 && !parsedResponse) {
      const attemptContext = attempts > 0
        ? context + `\n\nNOTE: Attempt ${attempts + 1}/3. Previous response didn't have the correct JSON format. Make sure to respond with the format:\n\`\`\`json\n{ "user": "{{agentName}}", "text": "your message", "action": "OPTIONAL_ACTION${type === 'mention' ? ' , NONE if no action detected' : ''}" }\n\`\`\``
        : context;

      elizaLogger.log(`Attempt ${attempts + 1} to generate response...`);

      response = await generateMessageResponse({
        runtime: this.runtime,
        context: attemptContext,
        modelClass: ModelClass.SMALL,
      });

      parsedResponse = await parseAndCleanResponse(response?.text || "", attempts);
      attempts++;
    }

    if (!parsedResponse?.text) {
      elizaLogger.error("Could not generate a valid response after 3 attempts");
      return null;
    }

    return parsedResponse;
  }

  async createResponseCallback(hasRespondedInAction: Map<string, number>, replyToCast: Function) {
    return async (content: any, hash?: string, fromAction: boolean = false) => {
      elizaLogger.log("=== CALLBACK CONTENT ===", {
        text: content.text,
        action: content.action,
        fromAction: fromAction,
      });

      const reply = await replyToCast(content.text, hash);

      if (reply) {
        if (fromAction) {
          hasRespondedInAction.set(hash, Date.now());
        }
        const memory = {
          id: reply.id,
          userId: this.runtime.agentId,
          agentId: this.runtime.agentId,
          roomId: reply.roomId,
          content: {
            text: content.text,
            action: content.action,
            fromAction: fromAction,
          },
          createdAt: Date.now(),
        };

        elizaLogger.log("New memory created:", {
          id: memory.id,
          text: memory.content.text,
          action: memory.content.action,
          roomId: memory.roomId,
        });

        await this.runtime.messageManager.createMemory(memory);
        return [memory];
      }
      return [];
    };
  }

  async shouldRespond(state: any, type: 'mention' | 'reply'): Promise<boolean> {
    const template = this.getTemplateForType(type, false);
    const context = this.runtime.composeContext({ state, template });
    
    try {
      const response = await generateMessageResponse({
        runtime: this.runtime,
        context,
        modelClass: ModelClass.SMALL,
      });

      const decision = response?.text?.match(/\[(RESPOND|IGNORE|STOP)\]/)?.[1];
      elizaLogger.log(`Response decision for ${type}:`, decision);

      if (decision === 'STOP') {
        elizaLogger.warn('STOP signal received in conversation');
        return false;
      }

      return decision === 'RESPOND';
    } catch (error) {
      elizaLogger.error(`Error evaluating whether to respond to ${type}:`, error);
      return false;
    }
  }
}