import { z } from "zod";
import { requireAi, logAi, jsonError, HttpError, getItems } from "@/lib/data";
import { tagPhoto } from "@/lib/ai";

// The browser uploads the resized photo to storage first, then asks for tags by path.
export async function POST(req: Request) {
  try {
    const s = await requireAi("tag");
    const { photo_path } = z.object({ photo_path: z.string().max(200) }).parse(await req.json());
    if (!photo_path.startsWith(`${s.user.id}/`)) throw new HttpError(400, "Invalid photo.");

    const { data: file, error } = await s.supabase.storage.from("closet").download(photo_path);
    if (error || !file) throw new HttpError(404, "Photo not found. Try uploading again.");
    if (file.size > 5_000_000) throw new HttpError(413, "Photo is too large.");
    const mediaType = (["image/jpeg", "image/png", "image/webp"].includes(file.type) ? file.type : "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/webp";
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    const { data, usage } = await tagPhoto({ base64, mediaType }, await getItems());
    await logAi(s.user.id, "tag", usage);
    return Response.json({ tags: data });
  } catch (e) {
    return jsonError(e);
  }
}
