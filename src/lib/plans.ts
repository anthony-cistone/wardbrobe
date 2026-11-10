export type Plan = "free" | "pro";
export type AiKind = "tag" | "outfits" | "review" | "chat" | "style";

export const APP_NAME = "Wardrobe";

/** Single source of truth for what each plan includes. Shown on the pricing page too. */
export const PLANS = {
  free: {
    name: "Free",
    price: "$0",
    maxItems: 30,
    ai: { tag: 0, outfits: 0, review: 0, chat: 0, style: 0 } as Record<AiKind, number>,
    features: [
      "Up to 30 pieces in your closet",
      "Sort by category, color and keep / tailor / donate",
      "A style board of looks you like",
      "Build and save outfits",
    ],
  },
  pro: {
    name: "Pro",
    price: "$7",
    maxItems: Infinity,
    // Monthly caps keep AI costs predictable.
    ai: { tag: 500, outfits: 100, review: 20, chat: 300, style: 150 } as Record<AiKind, number>,
    features: [
      "Unlimited pieces",
      "AI tags each photo: type, color, details",
      "AI stylist chat that knows your closet, your style board and you",
      "Styling advice based on your own photos: colors and fits that suit you",
      "Outfit suggestions, with shop links for any missing piece",
      "AI closet review: keep, tailor, donate, and what's missing",
    ],
  },
} as const;

export function isPro(plan: string | null | undefined, status?: string | null) {
  return plan === "pro" && (status == null || ["active", "trialing", "past_due"].includes(status));
}
