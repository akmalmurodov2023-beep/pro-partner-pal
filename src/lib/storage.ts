import { supabase } from "@/integrations/supabase/client";

export async function uploadFile(folder: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function openFile(path: string) {
  const url = await getSignedUrl(path);
  if (url) window.open(url, "_blank");
}