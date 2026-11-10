import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/data";
import { CATEGORY_CODES, type Item } from "@/lib/categories";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const Category = z.enum(CATEGORY_CODES);

// A piece the AI recommends buying. These become affiliate "Shop this" links.
const ShopPiece = z.object({
  item_type: z.string().describe("e.g. 'Chinos', 'Oxford shirt', 'Chelsea boots'"),
  color: z.string(),
  category: Category,
  why: z.string().describe("One sentence: what it adds to this closet."),
  search_query: z.string().describe("A short shopping search, e.g. 'mens navy slim chinos'."),
});
export type ShopPieceT = z.infer<typeof ShopPiece>;

/** Run one structured-output request. Refusals and unparseable output become a friendly error. */
async function run<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  effort: "low" | "medium" | "high";
}) {
  const res = await client.beta.messages.parse({
    model: env.claudeModel(),
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // retry on a fallback model if the request is declined
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) {
    throw new HttpError(502, "The AI couldn't process this request. Please try again.");
  }
  return { data: res.parsed_output as z.infer<T>, usage: res.usage };
}

function closetText(items: Item[]) {
  if (!items.length) return "(The closet is empty.)";
  return items
    .map((i) =>
      [i.code, i.item_type, i.color, i.details, i.status ? `status: ${i.status}` : "", i.favorite ? "favorite" : "", i.notes ? `notes: ${i.notes}` : ""]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");
}

const CATEGORY_GUIDE =
  "Categories: PNT = pants/trousers/jeans/shorts; SS = short-sleeve tops; LS = long-sleeve tops and sweaters; JKT = jackets, coats, blazers, vests; SHO = shoes; ACC = belts, ties, hats, bags and other accessories.";

// ---------------------------------------------------------------------------
// 1. Tag a photo of a clothing item
// ---------------------------------------------------------------------------
const TagResult = z.object({
  category: Category,
  item_type: z.string().describe("Specific type, e.g. 'Oxford shirt', 'Crewneck sweater', 'Straight-leg jeans'."),
  color: z.string().describe("Plain color words, e.g. 'Light blue', 'Heather gray', 'Navy with white stripes'."),
  details: z.string().describe("Fabric, pattern, collar, fit and other useful details, comma separated. Empty if none visible."),
  flag: z.string().describe("Anything uncertain (e.g. 'color hard to read in this light'). Empty if confident."),
  possible_duplicate_code: z.string().nullable().describe("Code of an existing piece this looks identical to, or null."),
});
export type TagResultT = z.infer<typeof TagResult>;

export async function tagPhoto(image: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }, closet: Item[]) {
  return run({
    schema: TagResult,
    effort: "low",
    system:
      "You catalog clothing for a personal wardrobe app. The user photographs one item, usually on a hanger against a wall. " +
      "Describe only what is visible. " +
      CATEGORY_GUIDE,
    content: [
      { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
      {
        type: "text",
        text:
          "Tag this item. If it matches a piece already in the closet (same type and color), give that code as possible_duplicate_code.\n\nCurrent closet:\n" +
          closetText(closet),
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// 2. Outfit suggestions from the user's own closet
// ---------------------------------------------------------------------------
const OutfitResult = z.object({
  outfits: z.array(
    z.object({
      name: z.string().describe("Short, specific name, e.g. 'Navy Friday'."),
      codes: z.array(z.string()).describe("Codes of pieces from the closet, top to bottom, 2-5 pieces."),
      why: z.string().describe("One or two sentences on why it works."),
      missing_piece: ShopPiece.nullable().describe(
        "Only if one piece the user does not own would clearly improve this outfit; otherwise null.",
      ),
    }),
  ),
});

export async function suggestOutfits(closet: Item[], styleNotes: string, occasion: string, count = 3) {
  const usable = closet.filter((i) => i.status !== "donate");
  return run({
    schema: OutfitResult,
    effort: "medium",
    system:
      "You are a practical personal stylist. Build outfits only from pieces in the user's closet, referenced by their exact codes. " +
      "Respect the user's style notes. Each outfit should be wearable together (one bottom, one or two tops/layers, shoes when available). " +
      "Avoid repeating the same combination.",
    content: [
      {
        type: "text",
        text:
          `Suggest ${count} outfits${occasion ? ` for: ${occasion}` : ""}.\n\n` +
          `Style notes: ${styleNotes || "(none)"}\n\nCloset (pieces marked donate are excluded):\n${closetText(usable)}`,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// 3. Closet review: keep / tailor / donate advice plus gaps worth buying
// ---------------------------------------------------------------------------
const ReviewResult = z.object({
  summary: z.string().describe("Three to five sentences on the closet overall."),
  advice: z.array(
    z.object({
      code: z.string(),
      verdict: z.enum(["keep", "tailor", "donate"]),
      reason: z.string(),
    }),
  ).describe("Only pieces worth calling out (duplicates, off-style, likely fit problems, standouts). Not every piece."),
  gaps: z.array(ShopPiece).describe("2-5 pieces the closet is missing that would add the most outfits."),
});
export type ReviewResultT = z.infer<typeof ReviewResult>;

export async function reviewCloset(closet: Item[], styleNotes: string) {
  return run({
    schema: ReviewResult,
    effort: "medium",
    system:
      "You review a person's wardrobe the way a thoughtful stylist would: honest, specific, and practical. " +
      "Refer to pieces by code. Base advice on the catalog details, the user's own notes and statuses, and their style notes. " +
      "For gaps, prefer versatile basics that pair with many pieces they already own.",
    content: [{ type: "text", text: `Style notes: ${styleNotes || "(none)"}\n\nCloset:\n${closetText(closet)}` }],
  });
}
