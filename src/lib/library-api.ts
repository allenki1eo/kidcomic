/**
 * Client-side Library API
 * Replaces server functions for saving/loading comics from Supabase.
 * Uses the authenticated Supabase client (RLS policies handle authorization).
 */

import { supabase } from "@/integrations/supabase/client";

export type Panel = {
  scene: string;
  caption: string;
  dialogue?: { speaker: string; text: string };
  imageUrl: string;
};

export type ComicRow = {
  id: string;
  share_id: string;
  title: string;
  panels: Panel[];
  style_name: string | null;
  language: string;
  is_public: boolean;
  created_at: string;
};

/** Require the user to be signed in. */
async function requireAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Not signed in");
  return data.session;
}

/** Save a comic to the user's gallery. */
export async function saveComic(opts: {
  title: string;
  panels: Panel[];
  styleId?: string;
  styleName?: string;
  language?: string;
  isPublic?: boolean;
}): Promise<{ id: string; shareId: string }> {
  await requireAuth();

  if (!opts.title || opts.title.length > 200) throw new Error("Invalid title");
  if (!Array.isArray(opts.panels) || opts.panels.length === 0 || opts.panels.length > 30) {
    throw new Error("Invalid panels");
  }

  const { data: row, error } = await supabase
    .from("comics")
    .insert({
      title: opts.title,
      panels: opts.panels as unknown as never,
      style_id: opts.styleId ?? null,
      style_name: opts.styleName ?? null,
      language: opts.language ?? "en",
      is_public: opts.isPublic ?? true,
    })
    .select("id, share_id")
    .single();

  if (error) throw new Error(error.message);
  return { id: row.id, shareId: row.share_id };
}

/** List all comics for the signed-in user. */
export async function listMyComics(): Promise<{ comics: ComicRow[] }> {
  await requireAuth();

  const { data, error } = await supabase
    .from("comics")
    .select("id, share_id, title, panels, style_name, language, is_public, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return { comics: (data ?? []) as unknown as ComicRow[] };
}

/** Delete a comic. */
export async function deleteComic(opts: { id: string }): Promise<{ success: boolean }> {
  await requireAuth();

  if (!opts.id) throw new Error("id required");

  const { error } = await supabase
    .from("comics")
    .delete()
    .eq("id", opts.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

/** Get a publicly shared comic by its share ID. */
export async function getSharedComic(opts: {
  shareId: string;
}): Promise<{
  title: string;
  panels: Panel[];
  style_name: string | null;
  language: string;
  created_at: string;
}> {
  if (!opts.shareId || opts.shareId.length > 32) throw new Error("Invalid share id");

  // Public comics can be read without auth — uses the anon key with RLS
  const { data: row, error } = await supabase
    .from("comics")
    .select("title, panels, style_name, language, created_at")
    .eq("share_id", opts.shareId)
    .eq("is_public", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Comic not found");
  return row as unknown as { title: string; panels: Panel[]; style_name: string | null; language: string; created_at: string };
}
