// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cities } from "../cities";
import { listCourts, getCourtsForCity } from "../courts.server";
import { getConditions } from "../conditions.server";
import { nextOpenSlot, parseCourtFilters } from "../courts";
import { addLocalDays, isoWithOffset, zonedInstant, zonedParts } from "../time";
import { verdict } from "../verdict";
import { resetWeatherCache } from "../weather.server";

const f = (q = "") => parseCourtFilters(new URLSearchParams(q));

describe("time", () => {
  it("handles midnight and DST", () => {
    expect(zonedParts(new Date("2026-11-18T07:00:00Z"), "America/Denver").time).toBe("00:00");
    expect(zonedInstant("2026-11-01", "01:30", "America/New_York").toISOString()).toBe(
      "2026-11-01T05:30:00.000Z",
    );
    expect(() => zonedInstant("2026-03-08", "02:30", "America/New_York")).toThrow();
    expect(isoWithOffset(new Date("2026-11-17T23:35:12Z"), "America/Denver")).toBe(
      "2026-11-17T16:35:12-07:00",
    );
    expect(addLocalDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("verdict", () => {
  it("applies precedence", () => {
    expect(verdict({ tempF: 70, windMph: 18, rainPct: 0 })).toBe("not_today");
    expect(verdict({ tempF: 39, windMph: 0, rainPct: 0 })).toBe("not_today");
    expect(verdict({ tempF: 70, windMph: 11, rainPct: 29 })).toBe("playable");
    expect(verdict({ tempF: 70, windMph: 12, rainPct: 0 })).toBe("breezy");
  });
});

describe("courts", () => {
  const now = new Date("2026-11-20T18:00:00-07:00");
  it("lists all six by default and retains closure courts", () => {
    expect(listCourts(f(), now)).toHaveLength(6);
    const sat = listCourts(f("day=sat&state=CA"), now);
    const mp = sat.find((c) => c.id === "memorial-park")!;
    expect(mp.slots.sat).toEqual([]);
    expect(sat.map((c) => c.id)).toContain("memorial-park");
    expect(listCourts(f("bogus=1&state=XX"), now)).toHaveLength(6);
  });
  it("finds the next open slot", () => {
    const co = getCourtsForCity(cities[0]);
    expect(nextOpenSlot(co, now)?.time).toMatch(/^2026-11-20T\d\d:\d\d:00-07:00$/);
  });
});

describe("conditions", () => {
  it("resolves with unavailable entries when weather fails", async () => {
    resetWeatherCache();
    const out = await getConditions(new Date("2026-11-20T18:00:00-07:00"), {
      fetch: () => new Promise(() => {}),
      timeoutMs: 20,
    });
    expect(out.map((e) => e.state)).toEqual(["CO", "CA", "NJ"]);
    expect(out.every((e) => !e.available && e.verdict === null && e.nextOpen)).toBe(true);
  });
});
