export type Plan = "free" | "pro";
export type AiKind = "tag" | "outfits" | "review";

export const APP_NAME = "Wardrobe";

/** Single source of truth for what each plan includes. Shown on the pricing page too. */
export const PLANS = {
  free: {
    name: "Free",
    price: "$0",
    maxItems: 30,
    ai: { tag: 0, outfits: 0, review: 0 } as Record<AiKind, number>,
    features: ["Up to 30 pieces", "Lookbook with filters and search", "Keep / tailor / donate tracking", "Build and save outfits"],
  },
  pro: {
    name: "Pro",
    price: "$7",
    maxItems: Infinity,
    // Monthly caps keep AI costs predictable.
    ai: { tag: 500, outfits: 100, review: 20 } as Record<AiKind, number>,
    features: [
      "Unlimited pieces",
      "AI tags each photo: type, color, details",
      "AI outfit suggestions from your own closet",
      "AI closet review: keep, tailor, donate, and what's missing",
      "Everything in Free",
    ],
  },
} as const;

export function isPro(plan: string | null | undefined, status?: string | null) {
  return plan === "pro" && (status == null || ["active", "trialing", "past_due"].includes(status));
}
