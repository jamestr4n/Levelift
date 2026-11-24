/** Link to a friend's kingdom (read-only visit). */
export function kingdomHref(userId: string) {
  return `/kingdom?user=${encodeURIComponent(userId)}`;
}
