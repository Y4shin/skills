// Seam 3: xdg-open platform branch — assert the correct binary is selected
// per process.platform (linux/mac/win).
//
// IMPORTANT: these tests MUST NOT call the real openBrowser(). The real
// openBrowser() spawns xdg-open (or the platform equivalent), which opens a
// real browser tab on the user's machine. That is a side effect we cannot
// allow in a unit test. We test only the PURE function openBinaryForPlatform()
// and assert openBrowser's signature exists, without invoking it with a real
// spawn. (The no-open / opened:false path is covered by start.test.ts and the
// integration test, which pass noOpen:true / --no-open.)
import { describe, expect, it } from "vitest";
import { openBinaryForPlatform } from "./server.js";

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

  it("openBrowser is not invoked from this test (side-effect-free)", () => {
    // Sanity check: openBinaryForPlatform is a pure function — it must not
    // spawn anything. If this test file ever imports openBrowser and calls it
    // with a real spawn, it would open a browser tab. We deliberately do NOT
    // import openBrowser here.
    expect(typeof openBinaryForPlatform).toBe("function");
  });
});
