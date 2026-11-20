import type { CityId } from "../../lib/cities.ts";

/** Browser-safe waitlist contract: no server, route or configuration imports. */

export type WaitlistLevel = "new" | "mid" | "pro";

/** Validated input, ready to store. */
export type WaitlistInput = {
  email: string;
  city: CityId;
  level: WaitlistLevel;
};

/** Untrusted submitted strings, kept exactly as sent. */
export type WaitlistValues = {
  email: string;
  city: string;
  level: string;
};

export type WaitlistErrors = {
  email?: string;
  city?: string;
  level?: string;
  form?: string;
};

export type WaitlistSuccess = {
  kind: "success";
  place: number;
  city: CityId;
  email: string;
};

export type WaitlistDuplicate = {
  kind: "duplicate";
  email: string;
  city: CityId;
  joinedOn: string;
};

export type WaitlistFailure = {
  errors: WaitlistErrors;
  values: WaitlistValues;
};

export type WaitlistResult = WaitlistSuccess | WaitlistDuplicate;
export type WaitlistActionData = WaitlistResult | WaitlistFailure;
