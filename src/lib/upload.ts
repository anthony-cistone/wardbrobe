"use client";
import { createClient } from "@/lib/supabase/client";

/** Shrink to 1280px on the long edge as JPEG: smaller uploads, cheaper AI calls, same detail. */
export async function resizeImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not read photo"))), "image/jpeg", 0.82));
}

/** Resize and upload a photo to the user's private folder. Returns the storage path. */
export async function uploadPhoto(file: File, userId: string, folder = "") {
  const blob = await resizeImage(file);
  const path = `${userId}/${folder ? folder + "/" : ""}${crypto.randomUUID()}.jpg`;
  const { error } = await createClient().storage.from("closet").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(error.message);
  return path;
}

export async function removePhoto(path: string) {
  await createClient().storage.from("closet").remove([path]);
}

export async function postJson(url: string, body?: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
  return json;
}
