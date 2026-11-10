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

type Content = Anthropic.Beta.BetaContentBlockParam[];
type Msg = { role: "user" | "assistant"; content: Content | string };

/**
 * Run one structured-output request. `context` is long, stable text (closet, profile)
 * placed in a cached system block so repeat requests, like chat turns, reuse it cheaply.
 * Refusals and unparseable output become a friendly error.
 */
async function run<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  context?: string;
  content?: Content;
  messages?: Msg[];
  effort: "low" | "medium" | "high";
}) {
  const system: Anthropic.Beta.BetaTextBlockParam[] = [{ type: "text", text: opts.system }];
  if (opts.context) system.push({ type: "text", text: opts.context, cache_control: { type: "ephemeral" } });
  const res = await client.beta.messages.parse({
    model: env.claudeModel(),
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // retry on a fallback model if the request is declined
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    system,
    messages: opts.messages ?? [{ role: "user", content: opts.content ?? [] }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) {
    throw new HttpError(502, "The AI couldn't process this request. Please try again.");
  }
  return { data: res.parsed_output as z.infer<T>, usage: res.usage };
}

export type ImageInput = { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };
const imageBlock = (img: ImageInput): Anthropic.Beta.BetaContentBlockParam => ({
  type: "image",
  source: { type: "base64", media_type: img.mediaType, data: img.base64 },
});

/** Everything the AI knows about the user's taste and look, as plain text. */
export type StyleContext = {
  styleNotes: string;
  appearanceNotes: string;
  styleSummary: string;
  board: { look: string; description: string; key_pieces: string[]; caption: string }[];
};

function styleText(c: StyleContext) {
  const board = c.board.length
    ? c.board
        .map((b, i) => `${i + 1}. ${b.look}: ${b.description} Key pieces: ${b.key_pieces.join(", ")}.${b.caption ? ` User's note: ${b.caption}` : ""}`)
        .join("\n")
    : "(No inspiration photos yet.)";
  return [
    `Style notes (in the user's words): ${c.styleNotes || "(none)"}`,
    `Appearance notes (from the user's own photos, for color and fit advice): ${c.appearanceNotes || "(none yet)"}`,
    `Style summary: ${c.styleSummary || "(none yet)"}`,
    `Style board, looks the user likes:\n${board}`,
  ].join("\n\n");
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

export async function tagPhoto(image: ImageInput, closet: Item[]) {
  return run({
    schema: TagResult,
    effort: "low",
    system:
      "You catalog clothing for a personal wardrobe app. The user photographs one item, usually on a hanger against a wall. " +
      "Describe only what is visible. " +
      CATEGORY_GUIDE,
    content: [
      imageBlock(image),
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
      why: z.string().describe("One or two sentences on why it works for this person and their style."),
      missing_pieces: z
        .array(ShopPiece)
        .describe("Pieces the user does not own that the outfit needs or that would clearly complete it (0-2). Empty if the closet covers it."),
    }),
  ),
});

export async function suggestOutfits(closet: Item[], style: StyleContext, request: string, count = 3) {
  const usable = closet.filter((i) => i.status !== "donate");
  return run({
    schema: OutfitResult,
    effort: "medium",
    system:
      "You are a practical personal stylist. Build outfits from pieces in the user's closet, referenced by their exact codes. " +
      "Aim for the looks on their style board, and use the appearance notes to pick colors and fits that flatter them. " +
      "Each outfit should be wearable together (one bottom, one or two tops/layers, shoes when available). " +
      "When the closet can't fully deliver the look they want, list the missing garments in missing_pieces; those become shopping links. " +
      "Avoid repeating the same combination.",
    context: `${styleText(style)}\n\nCloset (pieces marked donate are excluded):\n${closetText(usable)}`,
    content: [{ type: "text", text: `Suggest ${count} outfits${request ? ` for: ${request}` : ""}.` }],
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

export async function reviewCloset(closet: Item[], style: StyleContext) {
  return run({
    schema: ReviewResult,
    effort: "medium",
    system:
      "You review a person's wardrobe the way a thoughtful stylist would: honest, specific, and practical. " +
      "Refer to pieces by code. Base advice on the catalog details, the user's own notes and statuses, and their style notes. " +
      "For gaps, prefer versatile basics that pair with many pieces they already own.",
    context: `${styleText(style)}\n\nCloset:\n${closetText(closet)}`,
    content: [{ type: "text", text: "Review my closet." }],
  });
}

// ---------------------------------------------------------------------------
// 4. My Style: read an inspiration photo
// ---------------------------------------------------------------------------
const InspoNotes = z.object({
  look: z.string().describe("A short name for the look, e.g. 'Relaxed smart casual', 'Rugged workwear'."),
  description: z.string().describe("Two sentences on what makes this look work: silhouette, layering, palette, mood."),
  key_pieces: z.array(z.string()).describe("The garments that make the look, e.g. 'unstructured navy blazer'."),
  colors: z.array(z.string()),
});
export type InspoNotesT = z.infer<typeof InspoNotes>;

export async function analyzeInspo(image: ImageInput, caption: string) {
  return run({
    schema: InspoNotes,
    effort: "low",
    system:
      "You help people define their personal style. The user saved this photo because they like the look. " +
      "Describe the clothing and styling only; do not comment on the person's body or identity.",
    content: [imageBlock(image), { type: "text", text: caption ? `User's note: ${caption}` : "What is this look?" }],
  });
}

// ---------------------------------------------------------------------------
// 5. My Style: read the user's own photos for color and fit guidance
// ---------------------------------------------------------------------------
const SelfNotes = z.object({
  appearance_notes: z
    .string()
    .describe(
      "Practical styling notes, 4-8 short sentences: visible coloring (hair, eyes, skin undertone) and which color families flatter it; " +
        "build and proportions only as they affect fit (e.g. 'longer torso: tops that hit at the hip'). Kind, neutral wording.",
    ),
  flattering_colors: z.array(z.string()),
  fit_tips: z.array(z.string()),
});

export async function analyzeSelf(images: ImageInput[], style: StyleContext) {
  return run({
    schema: SelfNotes,
    effort: "medium",
    system:
      "You are a kind, practical personal stylist. The user uploaded photos of themselves so you can tailor advice. " +
      "Give guidance about colors and fit only. Never rate attractiveness, guess age, weight, ethnicity or health, " +
      "or suggest changing their body. If a photo doesn't show enough, say what to retake.",
    context: styleText(style),
    content: [...images.map(imageBlock), { type: "text", text: "Write my styling notes from these photos." }],
  });
}

// ---------------------------------------------------------------------------
// 6. My Style: stylist chat
// ---------------------------------------------------------------------------
const ChatReply = z.object({
  reply: z
    .string()
    .describe("Your answer: conversational, specific, under ~180 words. Refer to the user's pieces by code (e.g. LS-14) when you use them."),
  codes: z.array(z.string()).describe("Closet codes you mentioned, in order. Empty if none."),
  shop: z.array(ShopPiece).describe("Garments you recommend buying to get the look (0-3). Empty unless buying something genuinely helps."),
});

export async function stylistChat(
  closet: Item[],
  style: StyleContext,
  history: { role: "user" | "assistant"; content: string }[],
  message: string,
  image?: ImageInput,
) {
  const usable = closet.filter((i) => i.status !== "donate");
  const turn: Content = [];
  if (image) turn.push(imageBlock(image));
  turn.push({ type: "text", text: message || "What do you think of this look? How can I get it with what I own?" });
  return run({
    schema: ChatReply,
    effort: "medium",
    system:
      "You are the user's personal stylist inside their wardrobe app. You know their closet (pieces have codes), their style board, " +
      "and notes from their own photos. Answer questions about styles and how to get a look, starting from what they already own. " +
      "Be honest and specific. If they need something they don't own, recommend it in `shop` (those become shopping links) " +
      "and say so plainly in the reply. Never rate their attractiveness or body.",
    context: `${styleText(style)}\n\nCloset:\n${closetText(usable)}`,
    messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: turn }],
  });
}
