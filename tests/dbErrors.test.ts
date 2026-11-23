import { describe, expect, it } from "vitest";
import { toGameError } from "@/lib/supabase/errors";

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
