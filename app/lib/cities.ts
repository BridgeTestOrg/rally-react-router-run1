/** The three launch cities, in page order. */
export const cities = [
  {
    id: "highlands-ranch",
    name: "Highlands Ranch",
    state: "CO",
    timeZone: "America/Denver",
  },
  {
    id: "santa-monica",
    name: "Santa Monica",
    state: "CA",
    timeZone: "America/Los_Angeles",
  },
  {
    id: "hoboken",
    name: "Hoboken",
    state: "NJ",
    timeZone: "America/New_York",
  },
] as const;

export type City = (typeof cities)[number];
export type CityId = City["id"];
export type CityTimeZone = City["timeZone"];

/** True when `zone` is the time zone of one of the launch cities. */
export function isCityTimeZone(zone: unknown): zone is CityTimeZone {
  return cities.some((city) => city.timeZone === zone);
}
