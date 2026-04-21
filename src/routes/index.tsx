import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { STORIES, ART_STYLES, type Story, type ArtStyle } from "@/lib/comic-data";
import { generateComic } from "@/server/comic.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Bible Buddies — AI Comic Stories for Kids" },
      {
        name: "description",
        content:
          "Pick a Bible story and an art style — we'll draw a brand-new comic just for you, powered by AI.",
      },
      { property: "og:title", content: "Bible Buddies — AI Comic Stories for Kids" },
      {
        property: "og:description",
        content: "Kid-friendly AI Bible comics. Pick a story, pick a style, watch it come to life!",
      },
    ],
  }),
});

type Comic = Awaited<ReturnType<typeof generateComic>>;

function Home() {
  const [story, setStory] = useState<Story | null>(null);
  const [style, setStyle] = useState<ArtStyle>(ART_STYLES[0]);
  const [comic, setComic] = useState<Comic | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!story) throw new Error("Pick a story first!");
      return generateComic({
        data: { storyTitle: story.title, styleHint: style.promptHint },
      });
    },
    onSuccess: (data) => {
      setComic(data);
      setTimeout(() => {
        document.getElementById("comic-top")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Couldn't make the comic. Try again!");
    },
  });

  const reset = () => {
    setComic(null);
    setStory(null);
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <Toaster position="top-center" />
      <div className="mx-auto max-w-6xl">
        <Header />

        {!comic && (
          <>
            <section className="mt-10">
              <SectionTitle step={1} title="Pick a Bible story" />
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {STORIES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStory(s)}
                    className={`panel-card group flex flex-col items-center gap-2 p-4 text-center transition-transform hover:-translate-y-1 ${
                      story?.id === s.id
                        ? "ring-4 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-background)]"
                        : ""
                    }`}
                  >
                    <span className="text-4xl transition-transform group-hover:scale-110">
                      {s.emoji}
                    </span>
                    <span className="font-display text-base leading-tight">{s.title}</span>
                    <span className="text-xs text-muted-foreground">{s.blurb}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-12">
              <SectionTitle step={2} title="Pick an art style" />
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ART_STYLES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setStyle(a)}
                    className={`panel-card flex flex-col items-center gap-2 p-4 text-center transition-transform hover:-translate-y-1 ${
                      style.id === a.id
                        ? "ring-4 ring-[var(--color-berry)] ring-offset-2 ring-offset-[var(--color-background)]"
                        : ""
                    }`}
                  >
                    <span className="text-3xl">{a.emoji}</span>
                    <span className="font-display text-sm">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{a.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-12 flex flex-col items-center">
              <button
                disabled={!story || mutation.isPending}
                onClick={() => mutation.mutate()}
                className="panel-card group inline-flex items-center gap-3 bg-[var(--color-primary)] px-8 py-5 font-display text-xl text-[var(--color-primary-foreground)] transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ background: "var(--gradient-sunset)" }}
              >
                <span className="text-2xl">{mutation.isPending ? "✨" : "📖"}</span>
                {mutation.isPending
                  ? "Drawing your comic…"
                  : story
                    ? `Make my "${story.title}" comic!`
                    : "Pick a story above"}
              </button>
              {mutation.isPending && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Writing the story and painting 6 panels — this takes about 30–60 seconds. Worth
                  the wait! 🎨
                </p>
              )}
            </section>
          </>
        )}

        {comic && <ComicView comic={comic} onReset={reset} />}

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          Stories generated with AI. Always read the real Bible too! ✨
        </footer>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-[var(--color-accent)] px-4 py-1 font-display text-xs uppercase tracking-wider">
        <span>📖</span> Bible Buddies
      </div>
      <h1 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">
        AI Bible Comics for{" "}
        <span className="inline-block -rotate-2 rounded-2xl bg-[var(--color-primary)] px-3 py-1 text-[var(--color-primary-foreground)]">
          kids!
        </span>
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
        Pick a story, pick a style — we'll draw a brand-new comic just for you. ✨🎨
      </p>
    </header>
  );
}

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-[var(--color-sun)] font-display text-lg">
        {step}
      </span>
      <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
    </div>
  );
}

function ComicView({ comic, onReset }: { comic: Comic; onReset: () => void }) {
  return (
    <section id="comic-top" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl sm:text-4xl">{comic.title}</h2>
        <button
          onClick={onReset}
          className="panel-card bg-[var(--color-secondary)] px-5 py-2 font-display text-sm text-[var(--color-secondary-foreground)] transition-transform hover:-translate-y-0.5"
        >
          ← Make another
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {comic.panels.map((p, i) => (
          <article key={i} className="panel-card overflow-hidden p-0">
            <div className="relative aspect-square w-full bg-[var(--color-muted)]">
              <img
                src={p.imageUrl}
                alt={p.scene}
                className="h-full w-full object-cover"
                loading={i < 2 ? "eager" : "lazy"}
              />
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
    </section>
  );
}
