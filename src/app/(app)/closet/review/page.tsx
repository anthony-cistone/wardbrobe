import Link from "next/link";
import { getItems, requireSession } from "@/lib/data";
import { Photo } from "@/app/components/photo";
import { ShopLinks } from "@/app/components/shop-links";
import { RunReview } from "./run-review";

export const metadata = { title: "Review · Closet" };

type Advice = { code: string; verdict: "keep" | "tailor" | "donate"; reason: string };

export default async function ReviewPage() {
  const { supabase, pro } = await requireSession();
  const [items, { data: review }, { data: gaps }] = await Promise.all([
    getItems(),
    supabase.from("reviews").select("summary,advice,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("shop_suggestions").select("id,item_type,color,why").eq("source", "review").eq("dismissed", false).order("created_at"),
  ]);
  const byCode = new Map(items.map((i) => [i.code.toUpperCase(), i]));
  const advice = ((review?.advice ?? []) as Advice[]).filter((a) => byCode.has(a.code.toUpperCase()));

  return (
    <main className="wrap py-5 max-w-4xl">
      <p className="muted">An honest look at what you own: what to keep, what to tailor, what to let go, and what&apos;s missing.</p>

      {pro ? <RunReview hasReview={!!review} /> : (
        <p className="notice mt-4">The AI closet review is part of Pro. <Link className="underline" href="/settings">Upgrade</Link></p>
      )}

      {review && (
        <>
          <section className="card p-4 mt-5">
            <p className="muted text-[12px]">Reviewed {new Date(review.created_at).toLocaleDateString()}</p>
            <p className="mt-1 whitespace-pre-line">{review.summary}</p>
          </section>

          {gaps && gaps.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xl font-bold mb-2">What&apos;s missing</h2>
              <div className="grid gap-3 sm:grid-cols-2">{gaps.map((g) => <ShopLinks key={g.id} s={g} />)}</div>
            </section>
          )}

          {advice.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xl font-bold mb-2">Piece by piece</h2>
              <p className="muted text-[13px] mb-3">Suggestions only. Set the status yourself in your <Link className="underline" href="/closet">closet</Link>.</p>
              <div className="flex flex-col gap-2">
                {advice.map((a) => {
                  const i = byCode.get(a.code.toUpperCase())!;
                  return (
                    <div key={a.code} className="card p-2.5 flex gap-3 items-start">
                      <Photo src={i.photo_url} alt={i.item_type} className="w-12 h-20 rounded shrink-0" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="code">{i.code}</span>
                          <span className={`stat ${a.verdict}`}>{a.verdict}</span>
                          {i.status && i.status !== a.verdict && <span className="muted text-[12px]">you marked: {i.status}</span>}
                        </div>
                        <p className="font-semibold">{i.item_type} · <span className="muted font-normal">{i.color}</span></p>
                        <p className="text-[13px]">{a.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
