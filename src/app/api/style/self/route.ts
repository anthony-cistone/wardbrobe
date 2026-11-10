import { requireAi, logAi, jsonError, HttpError, loadImage, getStyleContext } from "@/lib/data";
import { analyzeSelf } from "@/lib/ai";

/** Read all of the user's own photos and write their appearance notes (color + fit guidance). */
export async function POST() {
  try {
    const s = await requireAi("style");
    const { data: photos } = await s.supabase.from("style_images").select("photo_path").eq("kind", "self").limit(6);
    if (!photos?.length) throw new HttpError(400, "Add at least one photo of yourself first.");
    const images = await Promise.all(photos.map((p) => loadImage(s.supabase, s.user.id, p.photo_path)));
    const { data, usage } = await analyzeSelf(images, await getStyleContext());
    await logAi(s.user.id, "style", usage);

    const notes = [
      data.appearance_notes,
      data.flattering_colors.length ? `Colors that suit you: ${data.flattering_colors.join(", ")}.` : "",
      data.fit_tips.length ? `Fit: ${data.fit_tips.join(" ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const { error } = await s.supabase.from("profiles").update({ appearance_notes: notes }).eq("id", s.user.id);
    if (error) throw error;
    return Response.json({ appearance_notes: notes });
  } catch (e) {
    return jsonError(e);
  }
}
