import Link from "next/link";
import { APP_NAME } from "@/lib/plans";

export function Footer() {
  return (
    <footer className="border-t border-line mt-auto">
      <div className="wrap py-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] muted">
        <span>© {new Date().getFullYear()} {APP_NAME}</span>
        <Link href="/disclosure" className="underline">Affiliate disclosure</Link>
        <span>Shop links may earn us a commission at no cost to you.</span>
      </div>
    </footer>
  );
}
