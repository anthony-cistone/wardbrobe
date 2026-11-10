import { aiUsageThisMonth, requireSession } from "@/lib/data";
import { PLANS } from "@/lib/plans";
import { StyleNotes } from "./style-notes";

export const metadata = { title: "Settings" };

const AI_LABELS = { tag: "Photo tags", outfits: "Outfit suggestions", review: "Closet reviews" } as const;

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { profile, pro, user } = await requireSession();
  const used = await aiUsageThisMonth(user.id);
  const upgraded = (await searchParams).upgraded === "1";

  return (
    <main className="wrap py-6 max-w-2xl flex flex-col gap-5">
      <h1 className="text-[clamp(26px,4vw,38px)] font-bold">Settings</h1>
      {upgraded && !pro && (
        <p className="notice">Payment received. Pro turns on within a minute; refresh this page if it hasn&apos;t yet.</p>
      )}

      <section className="card p-4">
        <h2 className="font-bold text-lg">Style notes</h2>
        <p className="muted text-[13px] mb-2">
          The AI reads these for outfit suggestions and reviews. For example: business casual, mostly desk days, sleeves
          often run short on me, avoid loud colors.
        </p>
        <StyleNotes initial={profile.style_notes} />
      </section>

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
