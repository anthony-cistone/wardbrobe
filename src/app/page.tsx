import Link from "next/link";
import { APP_NAME, PLANS } from "@/lib/plans";
import { Footer } from "@/app/components/footer";

const STEPS = [
  { t: "Closet", d: "Photograph your clothes. AI tags each piece with type, color and details, and you sort what to keep, tailor or donate." },
  { t: "My Style", d: "Pin looks you love, add a few photos of yourself, and ask your AI stylist how to get those looks from what you own." },
  { t: "Outfits", d: "Ask for outfits for any occasion and save the ones you like. Missing a piece? Every gap links to where to buy it." },
];

export default function Landing() {
  return (
    <>
      <header className="wrap flex items-center justify-between py-5">
        <span className="font-display text-xl font-bold">{APP_NAME}</span>
        <nav className="flex gap-2">
          <Link className="btn" href="/login">Sign in</Link>
          <Link className="btn pri" href="/login?mode=signup">Start free</Link>
        </nav>
      </header>

      <main className="wrap">
        <section className="py-14 md:py-20 max-w-3xl">
          <h1 className="text-[clamp(34px,6vw,60px)] font-bold leading-[1.02]">Your whole closet, on one screen.</h1>
          <p className="mt-5 text-lg muted max-w-xl">
            Catalog your closet, build a board of the styles you love, and get outfits that suit you, from clothes you
            already own. When something&apos;s missing, we&apos;ll show you exactly what to buy.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn pri" href="/login?mode=signup">Create a free account</Link>
            <a className="btn" href="#pricing">See pricing</a>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3 pb-16">
          {STEPS.map((s, i) => (
            <div key={s.t} className="card p-5">
              <div className="code">0{i + 1}</div>
              <h3 className="text-lg font-bold mt-1">{s.t}</h3>
              <p className="muted mt-1">{s.d}</p>
            </div>
          ))}
        </section>

        <section id="pricing" className="pb-20">
          <h2 className="text-3xl font-bold mb-6">Pricing</h2>
          <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
            {(["free", "pro"] as const).map((k) => {
              const p = PLANS[k];
              return (
                <div key={k} className={`card p-6 flex flex-col ${k === "pro" ? "border-accent border-2" : ""}`}>
                  <h3 className="text-xl font-bold">{p.name}</h3>
                  <p className="mt-1">
                    <span className="font-display text-4xl font-bold">{p.price}</span>
                    <span className="muted"> / month</span>
                  </p>
                  <ul className="mt-4 space-y-2 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2"><span aria-hidden className="text-accent">✓</span>{f}</li>
                    ))}
                  </ul>
                  <Link className={`btn mt-6 justify-center ${k === "pro" ? "pri" : ""}`} href="/login?mode=signup">
                    {k === "pro" ? "Start free, upgrade anytime" : "Start free"}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="muted mt-4 text-[13px]">Cancel anytime from Settings. Billing is handled securely by Stripe.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
