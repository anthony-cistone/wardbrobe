import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/**
 * Stripe webhook: the only place a user's plan changes.
 * Subscribe it to: checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), sig ?? "", env.stripeWebhookSecret());
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createAdminClient();

  async function sync(sub: Stripe.Subscription) {
    const active = ["active", "trialing", "past_due"].includes(sub.status);
    const periodEnd = sub.items.data[0]?.current_period_end;
    await admin
      .from("profiles")
      .update({
        plan: active ? "pro" : "free",
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq("stripe_customer_id", typeof sub.customer === "string" ? sub.customer : sub.customer.id);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string" ? session.subscription : session.subscription.id,
        );
        await sync(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await sync(event.data.object);
      break;
  }
  return Response.json({ received: true });
}
