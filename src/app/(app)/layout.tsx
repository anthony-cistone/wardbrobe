import Link from "next/link";
import { requireSession } from "@/lib/data";
import { APP_NAME } from "@/lib/plans";
import { Footer } from "@/app/components/footer";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile, pro } = await requireSession();
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <Link href="/closet" className="font-display text-lg font-bold">{APP_NAME}</Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-3">
            {pro ? <span className="tag">Pro</span> : <Link href="/settings" className="btn pri">Upgrade</Link>}
            <span className="muted text-[13px] hidden sm:inline">{profile.email}</span>
            <form action="/auth/signout" method="post"><button className="btn">Sign out</button></form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
}
