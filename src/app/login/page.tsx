import Link from "next/link";
import { APP_NAME } from "@/lib/plans";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = one(sp.next);
  return (
    <main className="wrap py-12 flex flex-col items-center">
      <Link href="/" className="font-display text-xl font-bold mb-6">{APP_NAME}</Link>
      <LoginForm
        initialMode={one(sp.mode) === "signup" ? "signup" : "signin"}
        next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/closet"}
        linkError={one(sp.error) === "link"}
      />
    </main>
  );
}
