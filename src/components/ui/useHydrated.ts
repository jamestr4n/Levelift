import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during server render and hydration, true afterwards. Use it to delay
 * anything that depends on the player's timezone or locale, so server and
 * client HTML match.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
