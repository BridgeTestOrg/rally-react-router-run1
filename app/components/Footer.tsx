import { content } from "../lib/content";

export function Footer() {
  const { footer } = content;
  const link =
    "inline-flex min-h-11 items-center text-[15px] font-semibold text-on-court-strong underline underline-offset-4 hover:text-white";
  return (
    <footer className="bg-ink py-10 text-on-court">
      <div className="container-page flex flex-col gap-4 stack:flex-row stack:items-center stack:justify-between">
        <p className="text-small">{footer.legal}</p>
        <div className="flex flex-wrap gap-x-6">
          <a href="#faq" className={link}>
            {footer.faq}
          </a>
          <a href={`mailto:${footer.email}`} className={link}>
            {footer.email}
          </a>
        </div>
      </div>
    </footer>
  );
}
