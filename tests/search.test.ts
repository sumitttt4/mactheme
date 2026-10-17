import { describe, it, expect } from "vitest";
import { searchApps, dockEntries } from "../src/search";
const apps = [
  "Code Editor",
  "Visual Studio Code",
  "Microsoft Edge",
  "Notepad",
  "Code",
].map((name, i) => ({
  id: String(i),
  name,
  target: "",
  executable: "",
  icon: null,
}));
describe("launcher", () => {
  it("ranks exact names, prefixes, then word matches", () =>
    expect(searchApps(apps, "code").map((a) => a.name)).toEqual([
      "Code",
      "Code Editor",
      "Visual Studio Code",
    ]));
  it("ignores case and whitespace", () =>
    expect(searchApps(apps, "  EDGE  ")[0]?.name).toBe("Microsoft Edge"));
  it("handles no matches", () =>
    expect(searchApps(apps, "missing")).toEqual([]));
  it("limits result rendering", () =>
    expect(
      searchApps(
        Array.from({ length: 200 }, (_, i) => ({ ...apps[0], id: String(i) })),
        "",
      ),
    ).toHaveLength(50));
  it("keeps pin order and omits uninstalled apps", () =>
    expect(dockEntries(apps, ["3", "missing", "0"]).map((a) => a.name)).toEqual(
      ["Notepad", "Code Editor"],
    ));
});
