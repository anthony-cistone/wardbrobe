import { requireSession } from "@/lib/data";
import { AddPieces } from "./add-pieces";

export const metadata = { title: "Add & tag · Closet" };

export default async function AddPage() {
  const { pro, user } = await requireSession();
  return <AddPieces pro={pro} userId={user.id} />;
}
