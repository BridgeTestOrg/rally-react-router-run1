import { beforeAll, describe, expect, it, vi } from "vitest";

type Loader = typeof import("../finder.server").loadFinder;
let loadFinder: Loader;

beforeAll(async () => {
  vi.stubEnv("RALLY_NOW", "2026-11-17T17:40:00-07:00");
  ({ loadFinder } = await import("../finder.server"));
});

const load = (qs: string) =>
  loadFinder({ request: new Request(`http://x/${qs}`) } as Parameters<Loader>[0]);

describe("loadFinder", () => {
  it("defaults malformed filters independently", () => {
    const d = load("?state=ZZ&day=sat&time=bogus&lights=yes");
    expect(d.filters).toMatchObject({ state: "all", day: "sat", time: "any", lights: false });
  });

  it("returns serializable data and closed rows without chips", () => {
    const d = load("");
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
    for (const r of d.rows.filter((r) => r.isClosed)) expect(r.slots).toEqual([]);
    expect(d.openCount).toBe(d.rows.filter((r) => !r.isClosed).length);
  });

  it("retains a closure row on Saturday with its reason", () => {
    const d = load("?day=sat");
    const closed = d.rows.filter((r) => r.isClosed);
    expect(closed.length).toBeGreaterThan(0);
    expect(closed[0]!.status).toMatch(/^Closed Saturday for /);
  });

  it("omits non-closed rows without slots", () => {
    const d = load("?state=CO&day=tomorrow");
    for (const r of d.rows) expect(r.isClosed || r.slots.length > 0).toBe(true);
  });
});
