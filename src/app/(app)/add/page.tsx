import { requireSession } from "@/lib/data";
import { AddPieces } from "./add-pieces";

export const metadata = { title: "Add pieces" };

export default async function AddPage() {
  const { pro, user } = await requireSession();
  return <AddPieces pro={pro} userId={user.id} />;
}
