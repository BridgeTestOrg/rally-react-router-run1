import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import Home from "../home";

test("home route renders the welcome navigation", async () => {
  const Stub = createRoutesStub([{ path: "/", Component: Home }]);
  render(<Stub initialEntries={["/"]} />);
  expect(await screen.findByRole("navigation")).toBeDefined();
});
