import { supabase } from "@/integrations/supabase/client";

// In-memory cache: path -> { url, expiresAt }
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const TTL_MS = 55 * 60 * 1000; // refresh slightly before 1h signed URL expiry

export async function uploadFile(folder: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const cached = urlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
  if (data?.signedUrl) {
    urlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + TTL_MS });
    return data.signedUrl;
  }
  return null;
}

export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const toFetch: string[] = [];
  for (const p of paths) {
    if (!p) continue;
    const cached = urlCache.get(p);
    if (cached && cached.expiresAt > Date.now()) result[p] = cached.url;
    else toFetch.push(p);
  }
  if (toFetch.length > 0) {
    const { data } = await supabase.storage.from("documents").createSignedUrls(toFetch, 3600);
    if (data) {
      for (const item of data) {
        if (item.path && item.signedUrl) {
          urlCache.set(item.path, { url: item.signedUrl, expiresAt: Date.now() + TTL_MS });
          result[item.path] = item.signedUrl;
        }
      }
    }
  }
  return result;
}

export async function openFile(path: string) {
  const url = await getSignedUrl(path);
  if (url) window.open(url, "_blank");
}