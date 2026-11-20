import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/courts", "routes/api.courts.ts"),
  route("api/conditions", "routes/api.conditions.ts"),
] satisfies RouteConfig;
