import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Panel = {
  scene: string;
  caption: string;
  dialogue?: { speaker: string; text: string };
  imageUrl: string;
};

export const saveComic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      title: string;
      panels: Panel[];
      styleId?: string;
      styleName?: string;
      language?: string;
      isPublic?: boolean;
    }) => {
      if (!input?.title || input.title.length > 200) throw new Error("Invalid title");
      if (!Array.isArray(input.panels) || input.panels.length === 0 || input.panels.length > 30) {
        throw new Error("Invalid panels");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("comics")
      .insert({
        user_id: userId,
        title: data.title,
        panels: data.panels as unknown as never,
        style_id: data.styleId ?? null,
        style_name: data.styleName ?? null,
        language: data.language ?? "en",
        is_public: data.isPublic ?? true,
      })
      .select("id, share_id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, shareId: row.share_id };
  });

export const listMyComics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("comics")
      .select("id, share_id, title, panels, style_name, language, is_public, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { comics: data ?? [] };
  });

export const deleteComic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("comics")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// Public — no auth needed; reads via admin client filtered to public rows only.
export const getSharedComic = createServerFn({ method: "GET" })
  .inputValidator((input: { shareId: string }) => {
    if (!input?.shareId || input.shareId.length > 32) throw new Error("Invalid share id");
    return input;
  })
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("comics")
      .select("title, panels, style_name, language, created_at")
      .eq("share_id", data.shareId)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Comic not found");
    return row;
  });
