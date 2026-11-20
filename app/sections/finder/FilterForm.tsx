import type { ChangeEvent } from "react";
import { Form, useSubmit } from "react-router";
import { Button } from "../../components/ui";
import { content } from "../../lib/content";
import { DEFAULT_FILTERS, type CourtFilters } from "./filters";

interface Option<V extends string> {
  value: V;
  /** Submitted value; the All state submits "" while its filter key is "all". */
  submit: string;
  label: string;
}

const f = content.finder;

const STATE_OPTIONS: Option<CourtFilters["state"]>[] = [
  { value: "all", submit: "", label: f.states.all },
  { value: "CO", submit: "CO", label: f.states.CO },
  { value: "CA", submit: "CA", label: f.states.CA },
  { value: "NJ", submit: "NJ", label: f.states.NJ },
];
const DAY_OPTIONS: Option<CourtFilters["day"]>[] = [
  { value: "today", submit: "today", label: f.days.today },
  { value: "tomorrow", submit: "tomorrow", label: f.days.tomorrow },
  { value: "sat", submit: "sat", label: f.days.sat },
];
const TIME_OPTIONS: Option<CourtFilters["time"]>[] = [
  { value: "any", submit: "any", label: f.times.any },
  { value: "am", submit: "am", label: f.times.am },
  { value: "pm", submit: "pm", label: f.times.pm },
  { value: "eve", submit: "eve", label: f.times.eve },
];

const legend = "text-[13px] font-semibold text-muted mb-2 px-0";
const segment =
  "flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center px-2 py-2 text-center text-[14px] font-semibold transition-colors peer-checked:bg-court peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-[-3px] peer-focus-visible:outline-focus bg-paper text-ink hover:bg-ground active:brightness-95 peer-disabled:cursor-not-allowed peer-disabled:opacity-60";

function RadioGroup<V extends string>(props: {
  name: string;
  legend: string;
  options: Option<V>[];
  current: V;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={legend}>{props.legend}</legend>
      <div className="flex min-w-0 overflow-hidden rounded-input border border-line">
        {props.options.map((o) => (
          <label key={o.value} className="relative flex min-w-0 flex-1">
            <input
              type="radio"
              name={props.name}
              value={o.submit}
              checked={props.current === o.value}
              onChange={props.onChange}
              className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <span className={segment}>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FilterForm({ filters }: { filters: CourtFilters }) {
  const submit = useSubmit();
  const current = filters ?? DEFAULT_FILTERS;

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const form = e.currentTarget.form;
    if (!form) return;
    // Serialize synchronously, before React restores controlled values.
    const data = new FormData(form);
    await submit(data, {
      method: "get",
      action: "/#courts",
      replace: true,
      preventScrollReset: true,
    });
  }

  return (
    <Form
      method="get"
      action="/#courts"
      replace
      preventScrollReset
      aria-label={f.formLabel}
      className="min-w-0 space-y-5 rounded-card border border-line bg-ground p-4"
    >
      <RadioGroup
        name="state"
        legend={f.groups.state}
        options={STATE_OPTIONS}
        current={current.state}
        onChange={onChange}
      />
      <RadioGroup
        name="day"
        legend={f.groups.day}
        options={DAY_OPTIONS}
        current={current.day}
        onChange={onChange}
      />
      <RadioGroup
        name="time"
        legend={f.groups.time}
        options={TIME_OPTIONS}
        current={current.time}
        onChange={onChange}
      />
      <fieldset className="min-w-0">
        <legend className={legend}>{f.groups.mustHave}</legend>
        <div className="space-y-2">
          {(
            [
              ["lights", f.lights, current.lights],
              ["parking", f.parking, current.parking],
            ] as const
          ).map(([name, label, checked]) => (
            <label
              key={name}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-input border border-line bg-paper px-3 py-2 text-[14px] font-semibold text-ink hover:bg-ground"
            >
              <input
                type="checkbox"
                name={name}
                value="1"
                checked={checked}
                onChange={onChange}
                className="size-5 shrink-0 accent-court"
              />
              <span className="min-w-0">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <noscript>
        <Button type="submit" variant="court">
          {f.submitNoScript}
        </Button>
      </noscript>
    </Form>
  );
}
