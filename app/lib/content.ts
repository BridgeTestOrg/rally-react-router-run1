import rally from "../../content/rally.json";

/** Every page string, typed from the bundled JSON. */
export const content = rally;

/**
 * Fills `{name}` placeholders in a content template.
 *
 * Returns plain text meant for JSX text children. It never produces trusted
 * HTML, so never pass the result to `dangerouslySetInnerHTML`. Placeholders
 * without a supplied value are left unchanged; `0` and `""` count as values.
 */
export function t(
  template: string,
  values?: Readonly<Record<string, string | number>>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}
