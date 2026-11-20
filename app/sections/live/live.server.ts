import type { Route } from "../../routes/+types/home";

/**
 * Placeholder for the live-conditions loader. A later ticket replaces the body
 * and the return type; the home route's call site stays as it is. The result
 * is deliberately not awaited by the route.
 */
export function loadLive(args: Route.LoaderArgs): null {
  void args;
  return null;
}
