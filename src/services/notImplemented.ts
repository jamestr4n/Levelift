import { GameError } from "@/types/game";

export function notImplemented(name: string): never {
  throw new GameError("NOT_IMPLEMENTED", `${name} is not implemented yet`);
}
