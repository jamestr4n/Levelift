"use server";
// FRONTEND-OWNED. Server-action wrappers around the mock store, so client
// components calling the mock hit the same server-side state as pages do
// (matching how the real services behave).
import type {
  PurchaseBuildingInput,
  SignInInput,
  SignUpInput,
  WorkoutInput,
} from "@/types/game";
import { mockStore } from "./store";

export async function signUp(input: SignUpInput) {
  return mockStore.signUp(input);
}
export async function signIn(input: SignInInput) {
  return mockStore.signIn(input);
}
export async function signOut() {
  return mockStore.signOut();
}
export async function isUsernameAvailable(username: string) {
  return mockStore.isUsernameAvailable(username);
}
export async function getCurrentPlayer() {
  return mockStore.getCurrentPlayer();
}
export async function getCharacter() {
  return mockStore.getCharacter();
}
export async function logWorkout(input: WorkoutInput) {
  return mockStore.logWorkout(input);
}
export async function getWorkoutHistory() {
  return mockStore.getWorkoutHistory();
}
export async function getKingdom(userId?: string) {
  return mockStore.getKingdom(userId);
}
export async function purchaseBuilding(input: PurchaseBuildingInput) {
  return mockStore.purchaseBuilding(input);
}
export async function upgradeBuilding(buildingId: string) {
  return mockStore.upgradeBuilding(buildingId);
}
export async function getFriends() {
  return mockStore.getFriends();
}
export async function getWeeklyLeaderboard() {
  return mockStore.getWeeklyLeaderboard();
}
export async function sendFriendRequest(username: string) {
  return mockStore.sendFriendRequest(username);
}
export async function getFriendRequests() {
  return mockStore.getFriendRequests();
}
export async function respondToFriendRequest(requestId: string, accept: boolean) {
  return mockStore.respondToFriendRequest(requestId, accept);
}
export async function removeFriend(userId: string) {
  return mockStore.removeFriend(userId);
}
export async function getStravaStatus() {
  return mockStore.getStravaStatus();
}
export async function syncStrava() {
  return mockStore.syncStrava();
}
export async function disconnectStrava() {
  return mockStore.disconnectStrava();
}
