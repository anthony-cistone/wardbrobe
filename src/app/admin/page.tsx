import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_NAME } from "@/lib/plans";

export const metadata = { title: "Owner dashboard" };

type ClickRow = { shop_suggestions: { item_type: string; color: string } | null };

function thirtyDaysAgo() {
  return new Date(Date.now() - 30 * 864e5).toISOString();
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="muted text-[13px]">{label}</div>
      <div className="font-display text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

/** Owner-only numbers: subscribers, AI spend, and affiliate clicks. Set ADMIN_EMAILS to your email. */
export default async function AdminPage() {
  const s = await getSession();
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!s || !admins.includes((s.user.email ?? "").toLowerCase())) notFound();

  const db = createAdminClient();
  const since = thirtyDaysAgo();
  const [users, pros, clicks, usage] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "pro"),
    db.from("affiliate_clicks").select("retailer, shop_suggestions(item_type,color)").gte("created_at", since).limit(5000),
    db.from("ai_usage").select("input_tokens,output_tokens").gte("created_at", since),
  ]);

  const rows = (clicks.data ?? []) as unknown as (ClickRow & { retailer: string })[];
  const byRetailer = new Map<string, number>();
  const byPiece = new Map<string, number>();
  for (const r of rows) {
    byRetailer.set(r.retailer, (byRetailer.get(r.retailer) ?? 0) + 1);
    if (r.shop_suggestions) {
      const k = `${r.shop_suggestions.color} ${r.shop_suggestions.item_type}`.toLowerCase();
      byPiece.set(k, (byPiece.get(k) ?? 0) + 1);
    }
  }

  let inTok = 0;
  let outTok = 0;
  for (const u of usage.data ?? []) {
    inTok += u.input_tokens ?? 0;
    outTok += u.output_tokens ?? 0;
  }
  // Rough estimate at Claude Opus 5.5 list prices: $4 per million input tokens, $20 per million output.
  const aiCost = (inTok * 4 + outTok * 20) / 1e6;

  return (
    <main className="wrap py-6 flex flex-col gap-5">
      <Link href="/closet" className="code">
        ← {APP_NAME}
      </Link>
      <h1 className="text-3xl font-bold">Owner dashboard</h1>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Accounts" value={users.count ?? 0} />
        <Stat label="Pro subscribers" value={pros.count ?? 0} />
        <Stat label="Shop clicks, 30 days" value={rows.length} />
        <Stat label="AI cost, 30 days (est.)" value={"$" + aiCost.toFixed(2)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-bold mb-2">Clicks by retailer</h2>
          {[...byRetailer]
            .sort((a, b) => b[1] - a[1])
            .map(([r, n]) => (
              <p key={r} className="flex justify-between">
                <span>{r}</span>
                <span className="tabular-nums">{n}</span>
              </p>
            ))}
          {!byRetailer.size && <p className="muted">No clicks yet.</p>}
        </section>
        <section className="card p-4">
          <h2 className="font-bold mb-2">Most-clicked suggestions</h2>
          {[...byPiece]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([p, n]) => (
              <p key={p} className="flex justify-between">
                <span>{p}</span>
                <span className="tabular-nums">{n}</span>
              </p>
            ))}
          {!byPiece.size && <p className="muted">No clicks yet.</p>}
        </section>
      </div>
      <p className="muted text-[13px]">
        Commission earned shows up in your Amazon Associates and Skimlinks/Sovrn dashboards. Each link carries the
        suggestion ID as a sub-ID, so you can match sales to suggestions.
      </p>
    </main>
  );
}
