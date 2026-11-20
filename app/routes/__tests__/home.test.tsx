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
        finder: null,
      }),
    },
  ]);
  render(<Stub initialEntries={["/"]} />);
  expect(await screen.findByRole("navigation", { name: "Main" })).toBeDefined();
});
