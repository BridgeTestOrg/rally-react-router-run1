import { Link } from "react-router";

import logo from "../assets/logo.svg";
import { content } from "../lib/content";
import { Button } from "./ui";

export function Header() {
  return (
    <header className="bg-court">
      <div className="container-page flex min-h-[72px] items-center justify-between gap-4 py-3">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 font-display text-2xl font-extrabold text-white"
        >
          <img src={logo} alt="" width={30} height={30} />
          <span>{content.site.name}</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav aria-label={content.header.navLabel} className="hidden stack:block">
            <ul className="flex items-center gap-2">
              {content.header.nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-pill px-3 text-[15px] font-semibold text-on-court-strong hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <Button to="#waitlist" variant="ball" className="min-h-11 px-5 py-2">
            {content.header.cta}
          </Button>
        </div>
      </div>
    </header>
  );
}
