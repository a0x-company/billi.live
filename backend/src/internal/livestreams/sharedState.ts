// sharedState.ts
export interface User {
  socketId: string;
  handle: string;
}

export const connectedUsers: { [streamId: string]: User[] } = {};
