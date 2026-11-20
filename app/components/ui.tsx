import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";

type Variant = "ball" | "ghost" | "court";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-pill px-6 py-3 text-center text-base leading-tight font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  ball: "bg-ball text-ball-ink hover:brightness-95 active:brightness-90",
  ghost:
    "border-2 border-white/80 text-white hover:bg-white/10 active:bg-white/20",
  court: "bg-court text-white hover:bg-court-2 active:brightness-90",
};

type LinkButtonProps = Omit<LinkProps, "className"> & {
  variant?: Variant;
  className?: string;
};

type NativeButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className"> & {
  variant?: Variant;
  className?: string;
  to?: undefined;
};

export type ButtonProps = LinkButtonProps | NativeButtonProps;

/** A router link when `to` is given, otherwise a native button (type "button"). */
export function Button(props: ButtonProps) {
  if (props.to !== undefined) {
    const { variant = "ball", className = "", ...rest } = props;
    return (
      <Link {...rest} className={`${base} ${variants[variant]} ${className}`} />
    );
  }
  const { variant = "ball", className = "", type = "button", ...rest } = props;
  return (
    <button
      {...rest}
      type={type}
      className={`${base} ${variants[variant]} ${className}`}
    />
  );
}

type BadgeTone = "success" | "warning" | "neutral";

const tones: Record<BadgeTone, string> = {
  success: "bg-success-bg text-success-text",
  warning: "bg-warning-bg text-warning-text",
  neutral: "bg-neutral-bg text-neutral-text",
};

/** Noninteractive status label. */
export function Badge({
  tone = "success",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-[13px] leading-tight font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Eyebrow plus `<h2>` for a section. Pass `id` to label the section by it. */
export function SectionHeading({
  eyebrow,
  heading,
  id,
  surface = "light",
}: {
  eyebrow: string;
  heading: string;
  id?: string;
  surface?: "light" | "dark";
}) {
  const dark = surface === "dark";
  return (
    <div>
      <p className={`text-eyebrow ${dark ? "text-ball" : "text-court-2"}`}>
        {eyebrow}
      </p>
      <h2 id={id} className={`text-section mt-3 ${dark ? "text-white" : "text-ink"}`}>
        {heading}
      </h2>
    </div>
  );
}
