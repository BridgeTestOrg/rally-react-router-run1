import { now } from "../lib/config.server";
import { parseCourtFilters } from "../lib/courts";
import { listCourts } from "../lib/courts.server";
import type { Route } from "./+types/api.courts";

export function loader({ request }: Route.LoaderArgs) {
  const filters = parseCourtFilters(new URL(request.url).searchParams);
  const requestNow = now();
  return Response.json(listCourts(filters, requestNow));
}
