import { getStyleImages, requireSession } from "@/lib/data";
import { AboutMe } from "./about-me";

export const metadata = { title: "About me · My Style" };

export default async function AboutMePage() {
  const { user, pro, profile } = await requireSession();
  const photos = (await getStyleImages()).filter((i) => i.kind === "self");
  return (
    <AboutMe
      userId={user.id}
      pro={pro}
      initialPhotos={photos}
      initialStyleNotes={profile.style_notes}
      initialAppearance={profile.appearance_notes}
    />
  );
}
