import { describe, expect, it } from "vitest";
import { mapAuthError, validateSignUp } from "@/lib/auth/errors";

const valid = { email: "hero@example.com", password: "long-enough", username: "Hero_1" };

describe("validateSignUp", () => {
  it("accepts valid input (username case does not matter)", () => {
    expect(validateSignUp(valid)).toBeNull();
  });

  it.each([
    ["bad email", { ...valid, email: "not-an-email" }],
    ["short password", { ...valid, password: "short" }],
    ["short username", { ...valid, username: "ab" }],
    ["username with spaces", { ...valid, username: "has space" }],
    ["long username", { ...valid, username: "a".repeat(21) }],
  ])("rejects %s", (_, input) => {
    expect(validateSignUp(input)).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });
});

describe("mapAuthError", () => {
  it.each([
    ["invalid_credentials", "INVALID_CREDENTIALS"],
    ["email_exists", "EMAIL_TAKEN"],
    ["user_already_exists", "EMAIL_TAKEN"],
    ["weak_password", "INVALID_INPUT"],
    ["over_request_rate_limit", "RATE_LIMITED"],
    ["something_new", "UNKNOWN"],
  ])("maps %s to %s", (code, expected) => {
    expect(mapAuthError({ code, message: "raw" })).toMatchObject({ ok: false, code: expected });
  });

  it("never leaks the raw Supabase message", () => {
    const result = mapAuthError({ code: "unexpected_failure", message: "Database error saving new user" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).not.toContain("Database");
  });
});
