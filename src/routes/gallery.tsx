import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { listMyComics, deleteComic } from "@/server/library.functions";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/gallery")({
  component: GalleryPage,
  head: () => ({
    meta: [
      { title: "My Comics — Bible Buddies" },
      { name: "description", content: "Your personal library of AI Bible comics." },
    ],
  }),
});

type Row = {
  id: string;
  share_id: string;
  title: string;
  panels: Array<{ imageUrl: string }>;
  style_name: string | null;
  language: string;
  is_public: boolean;
  created_at: string;
};

async function authedFetch<T>(fn: () => Promise<T>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Not signed in");
  return fn();
}

function GalleryPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { comics } = await authedFetch(() => listMyComics());
        setRows(comics as unknown as Row[]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this comic? This can't be undone.")) return;
    try {
      await authedFetch(() => deleteComic({ data: { id } }));
      setRows((r) => r?.filter((x) => x.id !== id) ?? null);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const copyShare = (shareId: string) => {
    const url = `${window.location.origin}/c/${shareId}`;
    navigator.clipboard.writeText(url);
    toast.success("🔗 Share link copied!");
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <Toaster position="top-center" />
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/" className="font-display text-sm text-muted-foreground hover:underline">
              ← Make a new comic
            </Link>
            <h1 className="mt-2 font-display text-4xl">🏛️ My Comics</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="panel-card bg-[var(--color-secondary)] px-4 py-2 font-display text-sm transition-transform hover:-translate-y-0.5"
          >
            Sign out
          </button>
        </header>

        {!rows && !err && <p className="mt-12 text-center text-muted-foreground">Loading…</p>}
        {err && <p className="mt-12 text-center text-destructive">{err}</p>}
        {rows && rows.length === 0 && (
          <div className="panel-card mt-10 bg-[var(--color-accent)] p-10 text-center">
            <p className="font-display text-2xl">No comics yet ✨</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Make your first one and tap "Save to my gallery"!
            </p>
            <Link
              to="/"
              className="panel-card mt-6 inline-flex bg-[var(--color-primary)] px-5 py-3 font-display text-sm text-[var(--color-primary-foreground)]"
            >
              📖 Make a comic
            </Link>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => (
              <article key={c.id} className="panel-card overflow-hidden p-0">
                {c.panels?.[0]?.imageUrl && (
                  <Link
                    to="/c/$shareId"
                    params={{ shareId: c.share_id }}
                    className="block aspect-square w-full bg-[var(--color-muted)]"
                  >
                    <img
                      src={c.panels[0].imageUrl}
                      alt={c.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </Link>
                )}
                <div className="border-t-[3px] border-foreground bg-[var(--color-card)] p-4">
                  <h3 className="font-display text-lg leading-tight">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.panels.length} panels · {new Date(c.created_at).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to="/c/$shareId"
                      params={{ shareId: c.share_id }}
                      className="rounded-full border-2 border-foreground bg-[var(--color-primary)] px-3 py-1 text-xs font-display text-[var(--color-primary-foreground)]"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => copyShare(c.share_id)}
                      className="rounded-full border-2 border-foreground bg-[var(--color-card)] px-3 py-1 text-xs font-display"
                    >
                      🔗 Share
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-full border-2 border-foreground bg-[var(--color-muted)] px-3 py-1 text-xs font-display"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
