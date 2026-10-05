import { describe, expect, it, vi } from "vitest";

import { normalizeRoute, parseRoute } from "../src/app/router";

describe("router", () => {
  it.each([
    ["#focus", "focus"],
    ["#garden", "garden"],
    ["#unknown", "focus"],
    ["", "focus"],
  ] as const)("maps %s to %s", (hash, expected) => {
    expect(parseRoute(hash)).toBe(expected);
  });

  it("canonicalizes an unknown hash without a network navigation", () => {
    const replace = vi.fn();
    const location = { hash: "#other", replace } as unknown as Location;

    expect(normalizeRoute(location)).toBe("focus");
    expect(replace).toHaveBeenCalledWith("#focus");
  });
});
