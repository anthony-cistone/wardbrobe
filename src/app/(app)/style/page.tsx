import { getStyleImages, requireSession } from "@/lib/data";
import { StyleBoard } from "./style-board";

export const metadata = { title: "Style board · My Style" };

export default async function StyleBoardPage() {
  const { user, pro } = await requireSession();
  const images = (await getStyleImages()).filter((i) => i.kind === "inspo");
  return <StyleBoard initial={images} userId={user.id} pro={pro} />;
}
