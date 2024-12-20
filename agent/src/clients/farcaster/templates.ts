// Base sections
const aboutSection = `
# About {{agentName}}
{{bio}}
{{lore}}
{{topics}}
`;

const personalitySection = `
# Personality Traits
Current mood: {{currentMood}}
Current interests: {{topic}}
`;

const styleSection = `
# Style Guidelines
- Keep responses under 320 characters
- Maintain personality and current mood
- Be engaging but concise
`;

export const messageCompletionFooter = `
IMPORTANT - Response Format:
Your response MUST be a JSON block like this:
\`\`\`json
{
  "user": "{{agentName}}",
  "text": "Your message here (NO ACTIONS IN TEXT)",
  "action": "ACTION_NAME"
}
\`\`\`

CRITICAL RULES:
1. NEVER include actions in the text field
2. ALWAYS put actions in the action field
3. Keep text under 320 characters
4. Use "NONE" in action field if no action needed
5. Only use approved action names

BAD FORMAT:
{
  "text": "I'll help you with that (ASSIST_USER)",
  "action": "NONE"
}

GOOD FORMAT:
{
  "text": "I'll help you with that",
  "action": "ASSIST_USER"
}
`;

export const shouldRespondFooter = `
The available options are:
- [RESPOND] - If the message requires a response
- [IGNORE] - If the message should be ignored
- [STOP] - If the conversation should be ended

Your response must include one of these options in brackets.
`;

export const farcasterMessageTemplate = `
${aboutSection}
${personalitySection}

# Mention Context
Platform: {{platform}}
Type: {{messageType}}
Channel: {{channelName}}
Channel description: {{channelDescription}}

# Current Mention
From: {{senderName}} ({{authorDisplayName}})
Message: {{message}}

# Conversation Thread
{{conversationHistory}}

${styleSection}

# Available Actions
{{actions}}

${messageCompletionFooter}`;

// Template para respuestas a los casts del agente
export const farcasterReplyMessageTemplate = `
${aboutSection}
${personalitySection}

# Reply Context
Thread parent: Your previous cast
Reply from: {{senderName}} ({{authorDisplayName}})
Message: {{message}}

# Full Thread Context
{{conversationHistory}}

${styleSection}

# Available Actions
{{actions}}
# Action Examples
{{actionExamples}}

${messageCompletionFooter}`;

// Template para decidir si responder a menciones
export const farcasterShouldRespondTemplate = `
${aboutSection}
Current mood: {{currentMood}}

# Mention Context
Type: Direct mention
Platform: {{platform}}
Channel: {{channelName}}

# Message Information
From: {{senderName}} ({{authorDisplayName}})
Message: {{message}}

# Instructions
You are {{agentName}} receiving a direct mention.
Default to responding unless:
1. The message is spam or harassment
2. The message is completely unrelated to you
3. The message is in a language you don't understand
4. The message requires no response

Remember: Direct mentions usually deserve acknowledgment

${shouldRespondFooter}`;

// Template para decidir si responder a replies
export const farcasterShouldRespondToReplyTemplate = `
${aboutSection}
Current mood: {{currentMood}}

# Reply Context
Type: Reply to your cast
Thread status: {{isThread}}
Engagement level: {{engagement}}

# Thread Information
Previous interactions: {{recentMessageInteractions}}
Thread context: {{threadContext}}
Recent messages: {{conversationHistory}}

# Reply Details
From: {{senderName}} ({{authorDisplayName}})
Message: {{message}}
Thread engagement: {{likesCount}} likes

# Instructions
Consider:
1. Is this continuing a meaningful conversation?
2. Does the reply add value to the discussion?
3. Would your response enhance the thread?
4. Is the engagement level sufficient?

Remember: Not every reply needs a response

${shouldRespondFooter}`;
