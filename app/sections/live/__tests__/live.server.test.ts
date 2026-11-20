import { describe, expect, test } from "vitest";
import type { ConditionsEntry } from "../../../lib/conditions.server";
import { buildLiveViewModel, formatLiveStamp, formatNextOpen } from "../live.server";

const NOW = new Date("2026-03-10T18:00:00Z");

function entry(over: Partial<ConditionsEntry>): ConditionsEntry {
  return {
    city: "Highlands Ranch",
    state: "CO",
    available: false,
    nextOpen: null,
    tempF: null,
    windMph: null,
    rainPct: null,
    verdict: null,
    updatedAt: null,
    ...over,
  };
}

describe("formatLiveStamp", () => {
  test("just now for fresh available data", () => {
    const e = entry({ available: true, updatedAt: "2026-03-10T11:59:30-06:00" });
    expect(formatLiveStamp([e], NOW)).toMatch(/just now/);
  });
  test("oldest available timestamp wins, minutes floored", () => {
    const a = entry({ available: true, updatedAt: "2026-03-10T11:57:30-06:00" });
    const b = entry({ available: true, updatedAt: "2026-03-10T11:59:00-06:00" });
    expect(formatLiveStamp([b, a], NOW)).toMatch(/updated 2 min ago/);
  });
  test("all unavailable uses last-checked wording, even at zero minutes", () => {
    expect(formatLiveStamp([entry({})], NOW)).toMatch(/last checked 0 min ago/);
  });
});

describe("formatNextOpen", () => {
  test("no slot", () => {
    expect(formatNextOpen(null, NOW, "America/Denver").kind).toBe("noSlot");
  });
  test("unknown court is a missing-court outcome", () => {
    const r = formatNextOpen({ courtId: "nope", time: "2026-03-10T18:00:00-06:00" }, NOW, "America/Denver");
    expect(r.kind).toBe("missingCourt");
  });
});

describe("buildLiveViewModel", () => {
  test("keeps city order, is serializable, flags allUnavailable", () => {
    const vm = buildLiveViewModel([], NOW);
    expect(vm.cities.map((c) => c.state)).toEqual(["CO", "CA", "NJ"]);
    expect(vm.allUnavailable).toBe(true);
    expect(JSON.parse(JSON.stringify(vm))).toEqual(vm);
  });
});
