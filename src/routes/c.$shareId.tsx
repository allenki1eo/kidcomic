import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getSharedComic } from "@/server/library.functions";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { downloadStorybookPDF, downloadColoringBookPDF } from "@/lib/comic-export";
import { useState } from "react";

export const Route = createFileRoute("/c/$shareId")({
  loader: async ({ params }) => {
    try {
      const comic = await getSharedComic({ data: { shareId: params.shareId } });
      return { comic };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const c = loaderData?.comic;
    const title = c ? `${c.title} — Bible Buddies` : "Comic — Bible Buddies";
    const desc = c ? `A kid-friendly AI Bible comic: ${c.title}` : "Shared comic";
    const img =
      (c?.panels as Array<{ imageUrl: string }> | undefined)?.[0]?.imageUrl ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(img ? [{ property: "og:image", content: img }] : []),
        ...(img ? [{ name: "twitter:image", content: img }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SharedComic,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel-card bg-[var(--color-card)] p-8 text-center">
        <h1 className="font-display text-3xl">😕 Comic not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link may have been removed or made private.
        </p>
        <Link to="/" className="panel-card mt-6 inline-block bg-[var(--color-primary)] px-5 py-2 font-display text-sm text-[var(--color-primary-foreground)]">
          Make your own →
        </Link>
      </div>
    </div>
  ),
});

type Panel = {
  scene: string;
  caption: string;
  dialogue?: { speaker: string; text: string };
  imageUrl: string;
};

function SharedComic() {
  const { comic } = Route.useLoaderData();
  const panels = comic.panels as unknown as Panel[];
  const [busy, setBusy] = useState<"pdf" | "color" | null>(null);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("🔗 Link copied!");
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <Toaster position="top-center" />
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="font-display text-sm text-muted-foreground hover:underline">
          ← Make your own
        </Link>
        <header className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-4xl">{comic.title}</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyLink}
              className="panel-card bg-[var(--color-sun)] px-4 py-2 font-display text-sm transition-transform hover:-translate-y-0.5"
            >
              🔗 Copy link
            </button>
            <button
              disabled={busy !== null}
              onClick={async () => {
                setBusy("pdf");
                try {
                  await downloadStorybookPDF({ title: comic.title, panels });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "PDF failed");
                } finally {
                  setBusy(null);
                }
              }}
              className="panel-card bg-[var(--color-primary)] px-4 py-2 font-display text-sm text-[var(--color-primary-foreground)] disabled:opacity-50"
            >
              {busy === "pdf" ? "📖 Building…" : "📖 PDF storybook"}
            </button>
            <button
              disabled={busy !== null}
              onClick={async () => {
                setBusy("color");
                try {
                  await downloadColoringBookPDF({ title: comic.title, panels });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Coloring book failed");
                } finally {
                  setBusy(null);
                }
              }}
              className="panel-card bg-[var(--color-card)] px-4 py-2 font-display text-sm disabled:opacity-50"
            >
              {busy === "color" ? "🖍️ Tracing…" : "🖍️ Coloring book"}
            </button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {panels.map((p, i) => (
            <article key={i} className="panel-card overflow-hidden p-0">
              <div className="relative aspect-square w-full bg-[var(--color-muted)]">
                <img src={p.imageUrl} alt={p.scene} className="h-full w-full object-cover" loading={i < 2 ? "eager" : "lazy"} />
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground bg-[var(--color-sun)] font-display text-sm">
                  {i + 1}
                </span>
                {p.dialogue && (
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="speech-bubble text-sm">
                      <span className="mr-1 text-[var(--color-primary)]">{p.dialogue.speaker}:</span>
                      {p.dialogue.text}
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t-[3px] border-foreground bg-[var(--color-card)] p-4">
                <p className="text-sm font-semibold leading-snug">{p.caption}</p>
              </div>
            </article>
          ))}
        </div>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Made with Bible Buddies — AI comics for kids ✨
        </footer>
      </div>
    </main>
  );
}
