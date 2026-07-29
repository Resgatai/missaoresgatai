export async function getTemporaryImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/api/uploads/image/")) return path;
  return null;
}

export async function mapTemporaryImageUrls<T extends { id: string; imageUrl?: string | null }>(items: T[]) {
  const entries = await Promise.all(items.map(async (item) => [item.id, await getTemporaryImageUrl(item.imageUrl)] as const));
  return new Map(entries);
}