import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { STORIES, ART_STYLES, type Story, type ArtStyle } from "@/lib/comic-data";
import { generateComic, extendComic } from "@/server/comic.functions";
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
type Panel = Comic["panels"][number];

const FUN_IDEAS = [
  "A friendly dragon learns to share at Sunday school",
  "Astronaut kids pray on the moon",
  "A talking lamb leads a parade through Bethlehem",
  "Two best friends build the world's tallest sandcastle for God",
  "A kind robot helps Noah feed all the animals",
];

const TWISTS = [
  "told from the donkey's point of view",
  "but everyone is a tiny mouse",
  "set in outer space",
  "as a musical with songs",
  "where the hero is a brave little kid",
  "but it rains glitter the whole time",
  "told backwards, ending first",
  "where animals can talk",
];

type Language = { code: string; label: string; flag: string; bcp47: string };
const LANGUAGES: Language[] = [
  { code: "en", label: "English", flag: "🇬🇧", bcp47: "en-US" },
  { code: "es", label: "Español", flag: "🇪🇸", bcp47: "es-ES" },
  { code: "fr", label: "Français", flag: "🇫🇷", bcp47: "fr-FR" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", bcp47: "de-DE" },
  { code: "pt", label: "Português", flag: "🇵🇹", bcp47: "pt-PT" },
  { code: "it", label: "Italiano", flag: "🇮🇹", bcp47: "it-IT" },
  { code: "sw", label: "Kiswahili", flag: "🇰🇪", bcp47: "sw-KE" },
  { code: "zh", label: "中文", flag: "🇨🇳", bcp47: "zh-CN" },
  { code: "ar", label: "العربية", flag: "🇸🇦", bcp47: "ar-SA" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳", bcp47: "hi-IN" },
];

function Home() {
  const [story, setStory] = useState<Story | null>(null);
  const [style, setStyle] = useState<ArtStyle>(ART_STYLES[0]);
  const [customIdea, setCustomIdea] = useState("");
  const [mode, setMode] = useState<"pick" | "write">("pick");
  const [comic, setComic] = useState<Comic | null>(null);
  const [language, setLanguage] = useState<Language>(LANGUAGES[0]);
  const [twist, setTwist] = useState("");

  const canGenerate = mode === "write" ? customIdea.trim().length > 3 : !!story;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!canGenerate) throw new Error("Pick a story or write your own idea!");
      return generateComic({
        data: {
          storyTitle: mode === "pick" && story ? story.title : "Custom Adventure",
          styleHint: style.promptHint,
          customIdea: mode === "write" ? customIdea.trim() : undefined,
          language: language.code,
          twist: twist.trim() || undefined,
        },
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
    setCustomIdea("");
    setTwist("");
    setMode("pick");
  };

  const surpriseMeIdea = () => {
    const idea = FUN_IDEAS[Math.floor(Math.random() * FUN_IDEAS.length)];
    setCustomIdea(idea);
    setMode("write");
  };

  const fullRemix = () => {
    const pickStory = Math.random() < 0.6;
    if (pickStory) {
      setMode("pick");
      setStory(STORIES[Math.floor(Math.random() * STORIES.length)]);
    } else {
      setMode("write");
      setCustomIdea(FUN_IDEAS[Math.floor(Math.random() * FUN_IDEAS.length)]);
    }
    setStyle(ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)]);
    setTwist(TWISTS[Math.floor(Math.random() * TWISTS.length)]);
    toast.success("🎲 Remixed! Hit the big button to draw it.");
  };

  const appendPanels = (newPanels: Panel[]) => {
    setComic((c) => (c ? { ...c, panels: [...c.panels, ...newPanels] } : c));
    setTimeout(() => {
      document.getElementById(`panel-${(comic?.panels.length ?? 0)}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <Toaster position="top-center" />
      <div className="mx-auto max-w-6xl">
        <Header />

        {!comic && (
          <>
            <section className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={fullRemix}
                className="panel-card inline-flex items-center gap-2 bg-[var(--color-berry)] px-5 py-3 font-display text-base text-white transition-transform hover:-translate-y-1"
              >
                🎲 Surprise me — full remix!
              </button>
              <LanguagePicker value={language} onChange={setLanguage} />
            </section>

            <section className="mt-8">
              <SectionTitle step={1} title="Choose your adventure" />

              <div className="mt-5 inline-flex rounded-full border-2 border-foreground bg-[var(--color-card)] p-1 font-display text-sm">
                <button
                  onClick={() => setMode("pick")}
                  className={`rounded-full px-4 py-2 transition-colors ${
                    mode === "pick"
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  📖 Pick a Bible story
                </button>
                <button
                  onClick={() => setMode("write")}
                  className={`rounded-full px-4 py-2 transition-colors ${
                    mode === "write"
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  ✍️ Write my own
                </button>
              </div>

              {mode === "pick" ? (
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
              ) : (
                <div className="mt-5">
                  <div className="panel-card p-4">
                    <label className="font-display text-sm" htmlFor="ideaBox">
                      What should the comic be about? ✨
                    </label>
                    <textarea
                      id="ideaBox"
                      value={customIdea}
                      onChange={(e) => setCustomIdea(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="e.g. A brave little lamb who helps a lost shepherd find his way home…"
                      className="mt-2 w-full resize-none rounded-xl border-2 border-foreground bg-[var(--color-background)] p-3 font-sans text-base outline-none focus:ring-4 focus:ring-[var(--color-primary)]/40"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{customIdea.length}/500</span>
                      <button
                        onClick={surpriseMeIdea}
                        className="font-display text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
                      >
                        🎲 Surprise me!
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {FUN_IDEAS.map((idea) => (
                      <button
                        key={idea}
                        onClick={() => setCustomIdea(idea)}
                        className="rounded-full border-2 border-foreground bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold transition-transform hover:-translate-y-0.5"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

            <section className="mt-12">
              <SectionTitle step={3} title="Add a fun twist (optional)" />
              <div className="mt-5">
                <input
                  value={twist}
                  onChange={(e) => setTwist(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. told from the donkey's POV, set in space, as a musical…"
                  className="w-full rounded-xl border-2 border-foreground bg-[var(--color-card)] p-3 font-sans text-base outline-none focus:ring-4 focus:ring-[var(--color-berry)]/40"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {TWISTS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTwist(t)}
                      className={`rounded-full border-2 border-foreground px-3 py-1 text-xs font-semibold transition-transform hover:-translate-y-0.5 ${
                        twist === t
                          ? "bg-[var(--color-berry)] text-white"
                          : "bg-[var(--color-card)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  {twist && (
                    <button
                      onClick={() => setTwist("")}
                      className="rounded-full border-2 border-foreground bg-[var(--color-muted)] px-3 py-1 text-xs font-semibold"
                    >
                      ✕ clear
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-12 flex flex-col items-center">
              <button
                disabled={!canGenerate || mutation.isPending}
                onClick={() => mutation.mutate()}
                className="panel-card group inline-flex items-center gap-3 px-8 py-5 font-display text-xl text-[var(--color-primary-foreground)] transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ background: "var(--gradient-sunset)" }}
              >
                <span className="text-2xl">{mutation.isPending ? "✨" : "📖"}</span>
                {mutation.isPending
                  ? "Drawing your comic…"
                  : mode === "write"
                    ? canGenerate
                      ? "Make MY comic!"
                      : "Write your idea above"
                    : story
                      ? `Make my "${story.title}" comic!`
                      : "Pick a story above"}
              </button>
              {mutation.isPending && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Writing the story and painting 6 panels — about 30–60 seconds. Worth the wait! 🎨
                </p>
              )}
            </section>
          </>
        )}

        {comic && (
          <ComicView
            comic={comic}
            language={language}
            styleHint={style.promptHint}
            onReset={reset}
            onAppend={appendPanels}
          />
        )}

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          Stories generated with AI. Always read the real Bible too! ✨
        </footer>
      </div>
    </main>
  );
}

function LanguagePicker({
  value,
  onChange,
}: {
  value: Language;
  onChange: (l: Language) => void;
}) {
  return (
    <label className="panel-card flex items-center gap-2 px-3 py-2 font-display text-sm">
      🌍
      <select
        value={value.code}
        onChange={(e) => {
          const next = LANGUAGES.find((l) => l.code === e.target.value);
          if (next) onChange(next);
        }}
        className="bg-transparent font-display text-sm outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </label>
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

async function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadImageUrl(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    await downloadDataUrl(objUrl, filename);
    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
  } catch {
    await downloadDataUrl(url, filename);
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "comic";
}

async function downloadStrip(comic: Comic) {
  const cols = 3;
  const rows = Math.ceil(comic.panels.length / cols);
  const tile = 600;
  const cap = 110;
  const gap = 16;
  const pad = 24;
  const titleH = 80;
  const W = pad * 2 + cols * tile + (cols - 1) * gap;
  const H = pad * 2 + titleH + rows * (tile + cap) + (rows - 1) * gap;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff8ec";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(comic.title, W / 2, pad + 50);

  const imgs = await Promise.all(comic.panels.map((p) => loadImg(p.imageUrl).catch(() => null)));

  for (let i = 0; i < comic.panels.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = pad + c * (tile + gap);
    const y = pad + titleH + r * (tile + cap + gap);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, tile, tile + cap);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, tile, tile + cap);
    const img = imgs[i];
    if (img) ctx.drawImage(img, x, y, tile, tile);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.textAlign = "left";
    const caption = comic.panels[i].caption;
    const words = caption.split(" ");
    let line = "";
    let yy = y + tile + 32;
    const maxW = tile - 24;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, x + 12, yy);
        line = w;
        yy += 26;
        if (yy > y + tile + cap - 8) break;
      } else line = test;
    }
    if (line) ctx.fillText(line, x + 12, yy);
  }

  const dataUrl = canvas.toDataURL("image/png");
  await downloadDataUrl(dataUrl, `${slug(comic.title)}-comic.png`);
}

function pickVoice(bcp47: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const lang = bcp47.toLowerCase();
  const langPrefix = lang.split("-")[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === lang) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
    null
  );
}

function ComicView({
  comic,
  language,
  styleHint,
  onReset,
  onAppend,
}: {
  comic: Comic;
  language: Language;
  styleHint: string;
  onReset: () => void;
  onAppend: (panels: Panel[]) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [readingIdx, setReadingIdx] = useState<number | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [whatsNext, setWhatsNext] = useState("");
  const [showNextBox, setShowNextBox] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const ttsSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Warm up voices list (some browsers load async)
  useEffect(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", handler);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", handler);
      window.speechSynthesis.cancel();
    };
  }, [ttsSupported]);

  const stopReading = () => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setReadingIdx(null);
    setAutoPlay(false);
  };

  const speakPanel = (idx: number, autoNext = false) => {
    if (!ttsSupported) {
      toast.error("Read-aloud isn't supported in this browser.");
      return;
    }
    const panel = comic.panels[idx];
    if (!panel) return;
    window.speechSynthesis.cancel();
    const text = panel.dialogue
      ? `${panel.caption}. ${panel.dialogue.speaker} says: ${panel.dialogue.text}`
      : panel.caption;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language.bcp47;
    const voice = pickVoice(language.bcp47);
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.pitch = 1.05;
    u.onend = () => {
      if (autoNext && idx + 1 < comic.panels.length) {
        setReadingIdx(idx + 1);
        setTimeout(() => speakPanel(idx + 1, true), 350);
      } else {
        setReadingIdx(null);
        setAutoPlay(false);
      }
    };
    u.onerror = () => {
      setReadingIdx(null);
      setAutoPlay(false);
    };
    utteranceRef.current = u;
    setReadingIdx(idx);
    document.getElementById(`panel-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.speechSynthesis.speak(u);
  };

  const handleStrip = async () => {
    setDownloading(true);
    try {
      await downloadStrip(comic);
    } catch {
      toast.error("Couldn't build the comic strip. Try downloading single panels instead.");
    } finally {
      setDownloading(false);
    }
  };

  const extendMutation = useMutation({
    mutationFn: async () => {
      return extendComic({
        data: {
          previousTitle: comic.title,
          previousPanels: comic.panels.map((p) => ({
            scene: p.scene,
            caption: p.caption,
            dialogue: p.dialogue,
          })),
          whatHappensNext: whatsNext.trim(),
          styleHint,
          language: language.code,
        },
      });
    },
    onSuccess: (data) => {
      onAppend(data.panels);
      setWhatsNext("");
      setShowNextBox(false);
      toast.success("✨ 3 new panels added!");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Couldn't continue the story.");
    },
  });

  return (
    <section id="comic-top" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl sm:text-4xl">{comic.title}</h2>
        <div className="flex flex-wrap gap-2">
          {ttsSupported && (
            <button
              onClick={() => {
                if (readingIdx !== null) {
                  stopReading();
                } else {
                  setAutoPlay(true);
                  speakPanel(0, true);
                }
              }}
              className="panel-card bg-[var(--color-sun)] px-5 py-2 font-display text-sm transition-transform hover:-translate-y-0.5"
            >
              {readingIdx !== null && autoPlay ? "⏹️ Stop" : "🗣️ Read aloud"}
            </button>
          )}
          <button
            onClick={handleStrip}
            disabled={downloading}
            className="panel-card bg-[var(--color-primary)] px-5 py-2 font-display text-sm text-[var(--color-primary-foreground)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {downloading ? "📦 Packing…" : "⬇️ Download comic"}
          </button>
          <button
            onClick={onReset}
            className="panel-card bg-[var(--color-secondary)] px-5 py-2 font-display text-sm text-[var(--color-secondary-foreground)] transition-transform hover:-translate-y-0.5"
          >
            ← Make another
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {comic.panels.map((p, i) => (
          <article
            key={i}
            id={`panel-${i}`}
            className={`panel-card overflow-hidden p-0 transition-all ${
              readingIdx === i ? "ring-4 ring-[var(--color-sun)] ring-offset-2" : ""
            }`}
          >
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
              <div className="absolute right-3 top-3 flex gap-2">
                {ttsSupported && (
                  <button
                    onClick={() =>
                      readingIdx === i ? stopReading() : speakPanel(i, false)
                    }
                    title="Read this panel"
                    className="flex h-8 items-center gap-1 rounded-full border-2 border-foreground bg-[var(--color-card)] px-3 font-display text-xs transition-transform hover:-translate-y-0.5"
                  >
                    {readingIdx === i ? "⏹️" : "🗣️"}
                  </button>
                )}
                <button
                  onClick={() =>
                    downloadImageUrl(p.imageUrl, `${slug(comic.title)}-panel-${i + 1}.png`)
                  }
                  title="Download this panel"
                  className="flex h-8 items-center gap-1 rounded-full border-2 border-foreground bg-[var(--color-card)] px-3 font-display text-xs transition-transform hover:-translate-y-0.5"
                >
                  ⬇️
                </button>
              </div>
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

      <section className="mt-10">
        <div className="panel-card bg-[var(--color-accent)] p-6">
          <h3 className="font-display text-2xl">📜 What happens next?</h3>
          <p className="mt-1 text-sm text-foreground/80">
            Tell us what you think happens next and we'll draw 3 more panels!
          </p>

          {!showNextBox ? (
            <button
              onClick={() => setShowNextBox(true)}
              className="panel-card mt-4 inline-flex items-center gap-2 bg-[var(--color-card)] px-5 py-2 font-display text-sm transition-transform hover:-translate-y-0.5"
            >
              ✏️ Continue the story
            </button>
          ) : (
            <div className="mt-4">
              <textarea
                value={whatsNext}
                onChange={(e) => setWhatsNext(e.target.value)}
                maxLength={400}
                rows={3}
                placeholder="e.g. They find a hidden cave with a magical map inside…"
                className="w-full resize-none rounded-xl border-2 border-foreground bg-[var(--color-background)] p-3 font-sans text-base outline-none focus:ring-4 focus:ring-[var(--color-primary)]/40"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{whatsNext.length}/400</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNextBox(false);
                      setWhatsNext("");
                    }}
                    className="panel-card bg-[var(--color-muted)] px-4 py-2 font-display text-sm transition-transform hover:-translate-y-0.5"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={whatsNext.trim().length < 3 || extendMutation.isPending}
                    onClick={() => extendMutation.mutate()}
                    className="panel-card bg-[var(--color-primary)] px-5 py-2 font-display text-sm text-[var(--color-primary-foreground)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {extendMutation.isPending ? "✨ Drawing…" : "📖 Add 3 panels"}
                  </button>
                </div>
              </div>
              {extendMutation.isPending && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Painting 3 new panels — about 15–30 seconds…
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
