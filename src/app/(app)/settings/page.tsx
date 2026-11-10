import Link from "next/link";
import { aiUsageThisMonth, requireSession } from "@/lib/data";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "Account" };

const AI_LABELS = {
  tag: "Photo tags",
  outfits: "Outfit requests",
  chat: "Stylist messages",
  style: "Style photo reads",
  review: "Closet reviews",
} as const;

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { profile, pro, user } = await requireSession();
  const used = await aiUsageThisMonth(user.id);
  const upgraded = (await searchParams).upgraded === "1";

  return (
    <main className="wrap py-6 max-w-2xl flex flex-col gap-5">
      <h1 className="text-[clamp(26px,4vw,38px)] font-bold">Account</h1>
      <p className="muted">
        Signed in as {user.email}. Your photos and style notes are in{" "}
        <Link className="underline" href="/style/me">My Style → About me</Link>.
      </p>
      {upgraded && !pro && (
        <p className="notice">Payment received. Pro turns on within a minute; refresh this page if it hasn&apos;t yet.</p>
      )}

      <section className="card p-4 flex flex-col gap-3">
        <h2 className="font-bold text-lg">Plan</h2>
        <p>
          You&apos;re on <b>{pro ? "Pro" : "Free"}</b>
          {pro && profile.current_period_end ? ` · renews ${new Date(profile.current_period_end).toLocaleDateString()}` : ""}
          {profile.subscription_status === "past_due" && (
            <span className="text-donate"> · payment past due, please update your card</span>
          )}
        </p>
        {pro ? (
          <>
            <table className="text-[13px]">
              <tbody>
                {(Object.keys(AI_LABELS) as (keyof typeof AI_LABELS)[]).map((k) => (
                  <tr key={k}>
                    <td className="py-0.5 pr-4">{AI_LABELS[k]} this month</td>
                    <td className="tabular-nums">
                      {used[k]} / {PLANS.pro.ai[k]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form action="/api/stripe/portal" method="post">
              <button className="btn">Manage billing or cancel</button>
            </form>
          </>
        ) : (
          <>
            <ul className="text-[13px] space-y-1">
              {PLANS.pro.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <form action="/api/stripe/checkout" method="post">
              <button className="btn pri">Upgrade to Pro · {PLANS.pro.price}/month</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
