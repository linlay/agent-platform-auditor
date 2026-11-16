import { describe, it, expect } from "vitest";
import { byteSlice } from "./domain";
describe("source byte ranges", () => {
  it("highlights UTF8 Chinese by byte offset", () =>
    expect(byteSlice("a中文🚀b", 1, 7)).toBe("中文"));
  it("preserves four-byte codepoints and CRLF", () =>
    expect(byteSlice("a中文🚀\r\nb", 7, 13)).toBe("🚀\r\n"));
});
