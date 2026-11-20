import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import Home from "../home";

test("home route renders the main navigation", async () => {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: Home as never,
      loader: () => ({
        live: Promise.resolve({ cities: [], stampText: "", allUnavailable: false }),
        finder: {
          filters: { state: "all", day: "today", time: "any", lights: false, parking: false },
          rows: [],
          openCount: 0,
          day: "today",
        },
      }),
    },
  ]);
  render(<Stub initialEntries={["/"]} />);
  expect(await screen.findByRole("navigation", { name: "Main" })).toBeDefined();
});
