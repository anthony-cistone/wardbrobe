"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** The three sections of the app. */
const SECTIONS = [
  { href: "/closet", label: "Closet" },
  { href: "/style", label: "My Style" },
  { href: "/outfits", label: "Outfits" },
] as const;

const active = (path: string, href: string) => path === href || path.startsWith(href + "/");

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Sections">
      {SECTIONS.map((l) => (
        <Link key={l.href} href={l.href} className="chip" aria-pressed={active(path, l.href)} aria-current={active(path, l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Tabs inside a section, e.g. Closet → All pieces / Add pieces / Review. */
export function SubNav({ title, tabs }: { title: string; tabs: { href: string; label: string }[] }) {
  const path = usePathname();
  // The most specific tab that matches wins, so /closet/add doesn't also light up /closet.
  const current = [...tabs].sort((a, b) => b.href.length - a.href.length).find((t) => active(path, t.href))?.href;
  return (
    <div className="wrap pt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
      <h1 className="text-[clamp(26px,4vw,38px)] font-bold leading-none">{title}</h1>
      <nav className="flex gap-1 border-b border-line flex-1 min-w-0 overflow-x-auto" aria-label={`${title} pages`}>
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={current === t.href ? "page" : undefined}
            className="px-3 py-2 -mb-px border-b-2 border-transparent font-semibold text-[13px] muted whitespace-nowrap aria-[current=page]:border-accent aria-[current=page]:text-ink"
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
