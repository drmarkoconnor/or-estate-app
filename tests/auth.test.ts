import { describe, it, expect } from "vitest";
import { requireEnv } from "../netlify/lib/env";

describe("requireEnv", () => {
  it("throws when missing", () => {
    expect(() => requireEnv("__MISSING__" as any)).toThrowError();
  });
  it("returns when present", () => {
    process.env.FOO = "bar";
    expect(requireEnv("FOO")).toBe("bar");
  });
});
