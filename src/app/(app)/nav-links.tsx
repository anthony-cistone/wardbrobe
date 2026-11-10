"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/closet", label: "Closet" },
  { href: "/add", label: "Add pieces" },
  { href: "/outfits", label: "Outfits" },
  { href: "/review", label: "Review" },
  { href: "/settings", label: "Settings" },
] as const;

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="chip sm" aria-pressed={path.startsWith(l.href)} aria-current={path.startsWith(l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
