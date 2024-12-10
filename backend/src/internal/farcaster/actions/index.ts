import { ActionType } from "@internal/livestreams";
import { AxiosInstance } from "axios";
import { CommentStrategy } from "./comment";
import { PostStrategy } from "./post";

export interface FarcasterActionStrategy {
  execute(postId: string, additionalData?: any): Promise<void | string>;
}

export function getActionStrategy(
  actionType: ActionType,
  client: AxiosInstance
): FarcasterActionStrategy {
  switch (actionType) {
    case ActionType.COMMENT:
      return new CommentStrategy(client);
    case ActionType.POST:
      return new PostStrategy(client);
    default:
      throw new Error(`Estrategia de acción no soportada: ${actionType}`);
  }
}
