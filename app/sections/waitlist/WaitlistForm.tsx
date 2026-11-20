import { Form, useNavigation } from "react-router";
import { Button } from "../../components/ui";
import { cities } from "../../lib/cities";
import { content } from "../../lib/content";
import type { WaitlistErrors, WaitlistValues } from "./waitlist.types";

const levelIds = ["new", "mid", "pro"] as const;
const control =
  "min-h-11 w-full min-w-0 rounded-input border bg-white px-3 text-base text-ink";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-small text-error">
      {message}
    </p>
  );
}

export function WaitlistForm({
  errors,
  values,
}: {
  errors?: WaitlistErrors;
  values?: WaitlistValues;
}) {
  const navigation = useNavigation();
  const pending =
    navigation.state === "submitting" &&
    navigation.formMethod?.toUpperCase() === "POST" &&
    navigation.formData?.get("intent") === "waitlist";

  const f = content.waitlist.fields;
  const cityValue = values ? values.city : "highlands-ranch";
  const levelValue = values ? values.level : "new";
  const knownCity = cities.some((c) => c.id === cityValue);

  return (
    <Form method="post" action="/?index#waitlist" preventScrollReset noValidate>
      <input type="hidden" name="intent" value="waitlist" />
      <div className="grid gap-5">
        <div>
          <label htmlFor="waitlist-email" className="text-label mb-1.5 block">
            {f.email}
          </label>
          <input
            id="waitlist-email"
            name="email"
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder={f.emailPlaceholder}
            defaultValue={values?.email ?? ""}
            aria-invalid={errors?.email ? true : undefined}
            aria-describedby={errors?.email ? "waitlist-email-error" : undefined}
            className={`${control} ${errors?.email ? "border-error" : "border-line"}`}
          />
          <FieldError id="waitlist-email-error" message={errors?.email} />
        </div>

        <div>
          <label htmlFor="waitlist-city" className="text-label mb-1.5 block">
            {f.city}
          </label>
          <select
            id="waitlist-city"
            name="city"
            defaultValue={cityValue}
            aria-invalid={errors?.city ? true : undefined}
            aria-describedby={errors?.city ? "waitlist-city-error" : undefined}
            className={`${control} ${errors?.city ? "border-error" : "border-line"}`}
          >
            {!knownCity && (
              <option value={cityValue} disabled>
                {cityValue || content.waitlist.errors.city}
              </option>
            )}
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {content.waitlist.cities[c.id]}
              </option>
            ))}
          </select>
          <FieldError id="waitlist-city-error" message={errors?.city} />
        </div>

        <fieldset
          className="min-w-0"
          aria-describedby={errors?.level ? "waitlist-level-error" : undefined}
        >
          <legend className="text-label mb-1.5">{f.level}</legend>
          <div className="flex flex-wrap gap-2">
            {levelIds.map((id) => (
              <label key={id} className="relative min-w-0 flex-1">
                <input
                  type="radio"
                  name="level"
                  value={id}
                  defaultChecked={levelValue === id}
                  className="peer sr-only"
                />
                <span
                  className={`flex min-h-11 items-center justify-center rounded-input border px-3 text-center text-small font-semibold text-ink peer-checked:border-court peer-checked:bg-court peer-checked:text-white peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus ${errors?.level ? "border-error" : "border-line"}`}
                >
                  {content.waitlist.levels[id]}
                </span>
              </label>
            ))}
          </div>
          <FieldError id="waitlist-level-error" message={errors?.level} />
        </fieldset>

        {errors?.form && (
          <p className="text-small font-semibold text-error">{errors.form}</p>
        )}
        <Button type="submit" variant="court" disabled={pending} className="w-full">
          {pending && <span className="spinner" aria-hidden="true" />}
          {pending ? content.waitlist.submitting : content.waitlist.submit}
        </Button>
        <p className="text-small text-muted">{content.waitlist.fine}</p>
      </div>
    </Form>
  );
}
