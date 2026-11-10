import { NextResponse } from "next/server";
import { getSession } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";

/** Starts a Stripe Checkout session for the Pro plan. Called from a form POST. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.redirect(new URL("/login?next=/settings", req.url), 303);
  if (s.pro) return NextResponse.redirect(new URL("/settings", req.url), 303);

  const stripe = getStripe();
  let customer = s.profile.stripe_customer_id;
  if (!customer) {
    const c = await stripe.customers.create({ email: s.user.email, metadata: { user_id: s.user.id } });
    customer = c.id;
    await createAdminClient().from("profiles").update({ stripe_customer_id: customer }).eq("id", s.user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: s.user.id,
    line_items: [{ price: env.stripeProPriceId(), quantity: 1 }],
    subscription_data: { metadata: { user_id: s.user.id } },
    allow_promotion_codes: true,
    success_url: `${env.siteUrl()}/settings?upgraded=1`,
    cancel_url: `${env.siteUrl()}/settings`,
  });
  return NextResponse.redirect(session.url!, 303);
}
