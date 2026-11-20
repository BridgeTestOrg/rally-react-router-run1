import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { FinderSection } from "../FinderSection";
import type { FinderData } from "../finder.server";

const base: FinderData = {
  filters: { state: "CO", day: "sat", time: "any", lights: true, parking: false },
  day: "sat",
  openCount: 1,
  rows: [
    {
      id: "a",
      name: "Open Park",
      meta: "Denver, CO · 4 courts",
      status: "Open 7 am to 10 pm",
      isClosed: false,
      slots: [{ time: "09:00", label: "9:00 am" }],
    },
    {
      id: "b",
      name: "Shut Park",
      meta: "Denver, CO · 2 courts",
      status: "Closed Saturday for resurfacing",
      isClosed: true,
      slots: [],
    },
  ],
};

function renderWith(data: FinderData) {
  const Stub = createRoutesStub([{ path: "/", Component: () => <FinderSection data={data} /> }]);
  return render(<Stub initialEntries={["/"]} />);
}

test("renders count, rows, chips and loader-derived checked state", async () => {
  renderWith(base);
  expect(await screen.findByText("1 court open on Saturday")).toBeDefined();
  expect(screen.getByText("9:00 am")).toBeDefined();
  expect(screen.getByText("Closed")).toBeDefined();
  expect((screen.getByLabelText("CO") as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText("Lights after dark") as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText("Free parking") as HTMLInputElement).checked).toBe(false);
});

test("renders the empty state with a clear action", async () => {
  renderWith({ ...base, rows: [], openCount: 0 });
  expect(await screen.findByText("No courts match those filters.")).toBeDefined();
  expect(screen.getByText("No courts open on Saturday")).toBeDefined();
});
