import { now } from "../lib/config.server";
import { getConditions } from "../lib/conditions.server";
import type { Route } from "./+types/api.conditions";

export async function loader(_args: Route.LoaderArgs) {
  const requestNow = now();
  return Response.json(await getConditions(requestNow));
}
