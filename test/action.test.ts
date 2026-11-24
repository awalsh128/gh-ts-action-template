import { describe, expect, it, vi } from "vitest";
import { parseStyle, parseUploadMode, runAction } from "../src/action.js";

const base = { name: "Ada", style: "friendly", shout: false, uploadIo: "never", outputJson: false } as const;

describe("runAction", () => {
  it("greets friendly by default", () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    expect(runAction(base, logger).greeting).toBe("Hey Ada!");
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

  it("describes the greeting as a nested object", () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    expect(runAction({ ...base, style: "formal", shout: true }, logger).details).toEqual({
      text: "GOOD DAY, ADA.",
      style: "formal",
      shout: true,
      words: ["GOOD", "DAY,", "ADA."],
      stats: { characters: 14, words: 3 },
    });
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

describe("parseUploadMode", () => {
  it("accepts supported modes", () => {
    expect(parseUploadMode("failure")).toBe("failure");
  });

  it("throws on an unknown mode", () => {
    expect(() => parseUploadMode("true")).toThrow('Invalid upload_io "true"');
  });
});
