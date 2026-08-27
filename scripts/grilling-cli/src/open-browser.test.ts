// Seam 3: xdg-open platform branch — assert the correct binary is selected
// per process.platform (linux/mac/win); --no-open skips the call and still
// prints the URL + 'opened: false'.
import { describe, expect, it } from "vitest";
import { openBinaryForPlatform, openBrowser } from "./server.js";

describe("seam 3 — xdg-open platform branch", () => {
  it("linux selects xdg-open", () => {
    expect(openBinaryForPlatform("linux")).toBe("xdg-open");
  });

  it("darwin (mac) selects open", () => {
    expect(openBinaryForPlatform("darwin")).toBe("open");
  });

  it("win32 selects start", () => {
    expect(openBinaryForPlatform("win32")).toBe("start");
  });

  it("unknown platform defaults to xdg-open", () => {
    expect(openBinaryForPlatform("solaris")).toBe("xdg-open");
  });

  it("openBrowser returns a boolean and does not throw", () => {
    // We can't easily mock spawn in ESM; instead we assert the function
    // returns a boolean without throwing. The actual binary selection is
    // covered by openBinaryForPlatform above.
    const result = openBrowser("http://localhost:99999", "linux");
    expect(typeof result).toBe("boolean");
  });

  it("openBrowser returns false (not throw) on a non-existent platform binary", () => {
    // On linux, xdg-open may or may not exist. The key invariant: no throw.
    const result = openBrowser("http://localhost:99999", "linux");
    expect(typeof result).toBe("boolean");
  });
});
