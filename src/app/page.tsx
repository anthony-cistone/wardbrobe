import Link from "next/link";
import { APP_NAME, PLANS } from "@/lib/plans";
import { Footer } from "@/app/components/footer";

const STEPS = [
  { t: "Snap a photo", d: "Hang it up, take a picture. That's the whole data entry." },
  { t: "AI tags it", d: "Category, type, color and details are filled in for you, and you get a code like LS-14." },
  { t: "Wear what you own", d: "Build outfits, get suggestions from your own closet, and decide what to keep, tailor or donate." },
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
            Photograph your clothes and {APP_NAME} catalogs them for you. Build outfits, get AI suggestions from what
            you already own, and finally clear out what you never wear.
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
