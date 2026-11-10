import { z } from "zod";
import { requireAi, logAi, jsonError, getItems, loadImage } from "@/lib/data";
import { tagPhoto } from "@/lib/ai";

// The browser uploads the resized photo to storage first, then asks for tags by path.
export async function POST(req: Request) {
  try {
    const s = await requireAi("tag");
    const { photo_path } = z.object({ photo_path: z.string().max(200) }).parse(await req.json());
    const image = await loadImage(s.supabase, s.user.id, photo_path);
    const { data, usage } = await tagPhoto(image, await getItems());
    await logAi(s.user.id, "tag", usage);
    return Response.json({ tags: data });
  } catch (e) {
    return jsonError(e);
  }
}
