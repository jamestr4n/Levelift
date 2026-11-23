import { describe, expect, it, vi } from "vitest";
import { asActionResult, toGameError } from "@/lib/supabase/errors";
import { GameError } from "@/types/game";

describe("toGameError", () => {
  it("keeps our own error codes and their friendly message", () => {
    const error = toGameError({ message: "INVALID_INPUT", details: "Duration must be between 1 and 600 minutes." });
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.message).toBe("Duration must be between 1 and 600 minutes.");
  });

  it("hides unexpected database errors", () => {
    const error = toGameError({ message: 'permission denied for table wallets' });
    expect(error.code).toBe("UNKNOWN");
    expect(error.message).not.toContain("wallets");
  });
});

describe("asActionResult", () => {
  it("wraps a successful value", async () => {
    expect(await asActionResult(async () => 42)).toEqual({ ok: true, data: 42 });
  });

  it("turns a GameError into a failure that keeps its code and message", async () => {
    const result = await asActionResult(async () => {
      throw new GameError("NOT_FOUND", "No player has that username.");
    });
    expect(result).toEqual({ ok: false, code: "NOT_FOUND", message: "No player has that username." });
  });

  it("hides unexpected errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await asActionResult(async () => {
      throw new Error("connection refused to 10.0.0.1");
    });
    spy.mockRestore();
    expect(result).toEqual({ ok: false, code: "UNKNOWN", message: expect.not.stringContaining("10.0.0.1") });
  });
});
