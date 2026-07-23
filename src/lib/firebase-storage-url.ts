import { firebaseStorage } from "@/lib/firebase-admin";

export async function getTemporaryImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  try {
    const [url] = await firebaseStorage().file(path).getSignedUrl({ action: "read", expires: Date.now() + 60 * 60 * 1000 });
    return url;
  } catch {
    return null;
  }
}

export async function mapTemporaryImageUrls<T extends { id: string; imageUrl?: string | null }>(items: T[]) {
  const entries = await Promise.all(items.map(async (item) => [item.id, await getTemporaryImageUrl(item.imageUrl)] as const));
  return new Map(entries);
}
