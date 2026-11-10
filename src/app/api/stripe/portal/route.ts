import { NextResponse } from "next/server";
import { getSession } from "@/lib/data";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";

/** Opens the Stripe customer portal: change card, cancel, see invoices. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s?.profile.stripe_customer_id) return NextResponse.redirect(new URL("/settings", req.url), 303);
  const portal = await getStripe().billingPortal.sessions.create({
    customer: s.profile.stripe_customer_id,
    return_url: `${env.siteUrl()}/settings`,
  });
  return NextResponse.redirect(portal.url, 303);
}
