import Link from "next/link";
import { APP_NAME } from "@/lib/plans";
import { Footer } from "@/app/components/footer";

export const metadata = { title: "Affiliate disclosure" };

export default function Disclosure() {
  return (
    <>
      <main className="wrap py-12 max-w-2xl">
        <Link href="/" className="code">← {APP_NAME}</Link>
        <h1 className="text-3xl font-bold mt-3">Affiliate disclosure</h1>
        <div className="mt-4 space-y-3">
          <p>
            When {APP_NAME} suggests a piece your closet is missing, we may show &quot;Shop this&quot; links to retailers.
            Some of these are affiliate links: if you buy through them, we may earn a commission at no extra cost to you.
          </p>
          <p>
            Suggestions are generated from your own closet and style notes. Retailers do not pay to be suggested, and
            whether a link earns a commission does not affect what the AI recommends.
          </p>
          <p>As an Amazon Associate we earn from qualifying purchases.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
