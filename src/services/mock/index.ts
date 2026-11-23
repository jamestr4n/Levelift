// FRONTEND-OWNED. Development-only mock service. Never used in production.
import type { GameService } from "@/types/game";
import * as actions from "./actions";

export const mockService: GameService = { ...actions };
