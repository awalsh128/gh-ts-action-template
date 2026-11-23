import { describe, expect, it, vi } from "vitest";
import { parseStyle, runAction } from "../src/action.js";

const base = { name: "Ada", style: "friendly", shout: false, uploadIo: false } as const;

describe("runAction", () => {
  it("greets friendly by default", () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    expect(runAction(base, logger)).toEqual({ greeting: "Hey Ada!" });
    expect(logger.info).toHaveBeenCalledWith("Generated greeting: Hey Ada!");
  });

  it("greets formally", () => {
    expect(runAction({ ...base, style: "formal" }, { info: vi.fn(), warn: vi.fn() }).greeting).toBe(
      "Good day, Ada.",
    );
  });

  it("upper-cases when shouting", () => {
    expect(runAction({ ...base, shout: true }, { info: vi.fn(), warn: vi.fn() }).greeting).toBe("HEY ADA!");
  });

  it("rejects a blank name", () => {
    expect(() => runAction({ ...base, name: "  " }, { info: vi.fn(), warn: vi.fn() })).toThrow(
      "must not be blank",
    );
  });
});

describe("parseStyle", () => {
  it("accepts supported styles", () => {
    expect(parseStyle("formal")).toBe("formal");
  });

  it("throws on an unknown style", () => {
    expect(() => parseStyle("rude")).toThrow('Invalid style "rude"');
  });
});
