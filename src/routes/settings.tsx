import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Bible Buddies" },
      { name: "description", content: "Configure your Bible Buddies settings" },
    ],
  }),
});

const HF_TOKEN_KEY = "kidcomic_hf_token";

function SettingsPage() {
  const [hfToken, setHfToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(HF_TOKEN_KEY);
    if (stored) {
      setSavedToken(stored);
    }
  }, []);

  const saveToken = () => {
    if (!hfToken.trim()) {
      toast.error("Please enter a token");
      return;
    }

    setSaving(true);

    const trimmed = hfToken.trim();
    if (trimmed.length < 10) {
      toast.error("Token seems too short. Please check and try again.");
      setSaving(false);
      return;
    }

    localStorage.setItem(HF_TOKEN_KEY, trimmed);
    setSavedToken(trimmed);
    setHfToken("");
    toast.success("Hugging Face token saved!");
    setSaving(false);
  };

  const clearToken = () => {
    localStorage.removeItem(HF_TOKEN_KEY);
    setSavedToken("");
    toast.success("Token removed");
  };

  const maskedToken = savedToken
    ? savedToken.slice(0, 8) + "••••••••••••" + savedToken.slice(-4)
    : "";

  return (
    <main className="min-h-screen px-4 py-12">
      <Toaster position="top-center" />
      <div className="mx-auto max-w-lg">
        <Link to="/" className="font-display text-sm text-muted-foreground hover:underline">
          ← Back home
        </Link>

        <div className="panel-card mt-6 bg-[var(--color-card)] p-6">
          <h1 className="font-display text-3xl">⚙️ Settings</h1>
        </div>

        <div className="panel-card mt-4 bg-[var(--color-card)] p-6">
          <h2 className="font-display text-xl">🤗 Hugging Face API</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your Hugging Face token to generate custom images instead of using default AI.
          </p>

          <div className="mt-4 rounded-xl border-2 border-foreground bg-[var(--color-background)] p-4">
            <h3 className="font-display text-sm">How to get a token:</h3>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>
                Go to{" "}
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] underline"
                >
                  huggingface.co/settings/tokens
                </a>
              </li>
              <li>Click "Generate new token"</li>
              <li>Copy the token and paste it below</li>
            </ol>
          </div>

          {savedToken ? (
            <div className="mt-4">
              <div className="flex items-center justify-between rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-success)]/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span className="font-display text-sm">Token configured</span>
                </div>
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="font-mono text-xs text-muted-foreground"
                >
                  {showToken ? savedToken : maskedToken}
                </button>
              </div>
              <button
                onClick={clearToken}
                className="mt-2 text-sm text-muted-foreground underline"
              >
                Remove token
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <input
                type={showToken ? "text" : "password"}
                value={hfToken}
                onChange={(e) => setHfToken(e.target.value)}
                placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-xl border-2 border-foreground bg-[var(--color-background)] p-3 font-mono text-sm outline-none focus:ring-4 focus:ring-[var(--color-primary)]/40"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showToken}
                  onChange={(e) => setShowToken(e.target.checked)}
                  className="h-4 w-4"
                />
                Show token
              </label>
              <button
                onClick={saveToken}
                disabled={saving || !hfToken.trim()}
                className="panel-card w-full bg-[var(--color-primary)] px-4 py-3 font-display text-sm text-[var(--color-primary-foreground)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Token"}
              </button>
            </div>
          )}

          <div className="mt-6 rounded-xl border-2 border-foreground bg-[var(--color-accent)] p-4">
            <h3 className="font-display text-sm">💡 How it works</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              When you add your Hugging Face token, your comics will use the Hugging Face
              Inference API for image generation. This gives you access to models like
              Stable Diffusion XL, Openjourney (for comic styles), and anime models.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              <strong>Note:</strong> Using your own token means you use your own HF API quota.
              Free tier has limits but works great for testing!
            </p>
          </div>
        </div>

        <div className="panel-card mt-4 bg-[var(--color-card)] p-6">
          <h2 className="font-display text-xl">❓ Help</h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>What is this for?</strong>
              <br />
              Hugging Face is an AI platform with many free image generation models.
              Adding your token lets the app use these models for your comics.
            </p>
            <p>
              <strong>Is it free?</strong>
              <br />
              Hugging Face has a free tier with 1000+ HF Credits/month. Image generation
              typically uses just a few credits per image.
            </p>
            <p>
              <strong>What if I don't add a token?</strong>
              <br />
              The app uses the default AI generator powered by Lovable, which works great
              for most cases!
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}