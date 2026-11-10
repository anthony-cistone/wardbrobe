import { z } from "zod";
import { getSession, jsonError, HttpError, logAi, loadImage, aiUsageThisMonth } from "@/lib/data";
import { PLANS } from "@/lib/plans";
import { analyzeInspo } from "@/lib/ai";

const NewImage = z.object({
  kind: z.enum(["inspo", "self"]),
  photo_path: z.string().max(200),
  caption: z.string().trim().max(300).default(""),
});

/**
 * Add a photo to My Style. Inspiration photos are read by the AI on Pro, so the stylist
 * knows what the look is; photos of the user are analyzed together from /api/style/self.
 */
export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const body = NewImage.parse(await req.json());
    if (!body.photo_path.startsWith(`${s.user.id}/style/`)) throw new HttpError(400, "Invalid photo.");

    if (body.kind === "self") {
      const { count } = await s.supabase.from("style_images").select("id", { count: "exact", head: true }).eq("kind", "self");
      if ((count ?? 0) >= 6) throw new HttpError(400, "You can keep up to 6 photos of yourself. Remove one first.");
    }

    let ai_notes = null;
    if (body.kind === "inspo" && s.pro) {
      const used = await aiUsageThisMonth(s.user.id);
      if (used.style < PLANS.pro.ai.style) {
        try {
          const { data, usage } = await analyzeInspo(await loadImage(s.supabase, s.user.id, body.photo_path), body.caption);
          ai_notes = data;
          await logAi(s.user.id, "style", usage);
        } catch (e) {
          console.error("inspo analysis failed", e); // keep the photo even if the AI read fails
        }
      }
    }

    const { data, error } = await s.supabase.from("style_images").insert({ ...body, ai_notes }).select().single();
    if (error) throw error;
    return Response.json({ image: data });
  } catch (e) {
    if (e instanceof z.ZodError) return Response.json({ error: "Invalid photo." }, { status: 400 });
    return jsonError(e);
  }
}
