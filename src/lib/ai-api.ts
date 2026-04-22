/**
 * AI Comic Generation API
 * Uses Groq for text/story generation and Hugging Face for image generation.
 * Replaces the Lovable AI gateway.
 */

import { ART_STYLES, type ArtStyle } from "./comic-data";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Panel = {
  scene: string;
  caption: string;
  dialogue?: { speaker: string; text: string };
};

export type ComicResult = {
  title: string;
  panels: Array<Panel & { imageUrl: string }>;
};

type GenerateOpts = {
  storyTitle: string;
  styleHint: string;
  customIdea?: string;
  language?: string;
  twist?: string;
  hero?: string;
};

type ExtendOpts = {
  previousTitle: string;
  previousPanels: Panel[];
  whatHappensNext: string;
  styleHint: string;
  language?: string;
};

// ─── Config ──────────────────────────────────────────────────────────────────

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const HF_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY || "";

const STORY_MODEL = "llama-3.3-70b-versatile";
const HF_IMAGE_MODEL = "stabilityai/stable-diffusion-3.5-large";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  sw: "Swahili",
  zh: "Simplified Chinese",
  ar: "Arabic",
  hi: "Hindi",
};

function languageName(code?: string) {
  if (!code) return "English";
  return LANGUAGE_NAMES[code] ?? "English";
}

// ─── Story Prompt Builder ────────────────────────────────────────────────────

function buildSystemPrompt(opts: {
  isCustom: boolean;
  language: string;
  twist?: string;
  hero?: string;
  numPanels: number;
  continuation?: boolean;
}) {
  const { isCustom, language, twist, hero, numPanels, continuation } = opts;

  const base = isCustom
    ? `You are a delightful children's storyteller making a fun, faith-friendly comic for kids ages 5-10. Use the kid's idea as the spark. Keep it warm, kind, age-appropriate, and full of wonder — gentle Bible/Christian values are welcome but never preachy.`
    : `You are a delightful children's Bible storyteller. Create a comic strip from a Bible story for kids ages 5-10. Keep language simple, warm, age-appropriate, and faithful to the Bible.`;

  const twistLine = twist ? ` Apply this twist: ${twist}.` : "";
  const heroLine = hero
    ? ` Insert this kid as the main hero (or a prominent helper if the story already has a fixed protagonist like Moses): ${hero}. Use their name in captions and dialogue. In every "scene" description, describe their appearance consistently so the illustrator draws the SAME character every panel.`
    : "";
  const langLine = ` Write the title, captions, and dialogue in ${language}.`;
  const contLine = continuation
    ? ` This is a CONTINUATION — pick up exactly where the previous story ended and continue naturally. Reuse the same characters, setting, and tone.`
    : "";

  return `${base}${twistLine}${heroLine}${langLine}${contLine} Invent a short, playful comic title (also in ${language}). For each of ${numPanels} panels provide:
- "scene": a vivid one-sentence visual description (characters, setting, action) for an illustrator, IN ENGLISH (illustrator only understands English). NO text/words in the image description.
- "caption": 1-2 short sentences of kid-friendly narration in ${language}.
- "dialogue" (optional): a single short line a character says in ${language}, with their name.
Return ONLY valid JSON.`;
}

// ─── Groq Story Generation ───────────────────────────────────────────────────

async function generateStoryPanels(args: {
  storyTitle: string;
  customIdea?: string;
  language?: string;
  twist?: string;
  hero?: string;
  numPanels?: number;
  previousPanels?: Panel[];
  previousTitle?: string;
}): Promise<{ title: string; panels: Panel[] }> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured. Add it to your .env file.");

  const numPanels = args.numPanels ?? 6;
  const language = languageName(args.language);
  const isCustom = !!args.customIdea?.trim();
  const continuation = !!args.previousPanels?.length;

  const systemPrompt = buildSystemPrompt({
    isCustom,
    language,
    twist: args.twist,
    hero: args.hero?.trim() || undefined,
    numPanels,
    continuation,
  });

  const userContent = continuation
    ? `Previous story title: "${args.previousTitle ?? ""}"
Previous panels (in order):
${args.previousPanels!.map((p, i) => `${i + 1}. ${p.caption}${p.dialogue ? ` [${p.dialogue.speaker}: "${p.dialogue.text}"]` : ""}`).join("\n")}

The kid wants to know what happens next. Continue the story with ${numPanels} new panels.`
    : isCustom
      ? `Kid's story idea: "${args.customIdea!.trim()}". Turn it into a fun, kind ${numPanels}-panel comic now.`
      : `Bible story: "${args.storyTitle}". Create the ${numPanels}-panel comic now.`;

  const toolDef = {
    type: "function" as const,
    function: {
      name: "create_comic",
      description: `Return a ${numPanels}-panel kids comic.`,
      parameters: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          panels: {
            type: "array" as const,
            minItems: numPanels,
            maxItems: numPanels,
            items: {
              type: "object" as const,
              properties: {
                scene: { type: "string" as const },
                caption: { type: "string" as const },
                dialogue: {
                  type: "object" as const,
                  properties: {
                    speaker: { type: "string" as const },
                    text: { type: "string" as const },
                  },
                },
              },
              required: ["scene", "caption"],
            },
          },
        },
        required: ["title", "panels"],
      },
    },
  };

  let lastError = "Unknown AI error";

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: STORY_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: "create_comic" } },
        temperature: 0.85,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      lastError = `Groq error ${res.status}: ${t.slice(0, 300)}`;
      if (res.status === 429) {
        throw new Error("Whoa, too many comics at once! Please wait a moment and try again.");
      }
      if (attempt === 0 && res.status >= 500) continue;
      throw new Error(lastError);
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { title: string; panels: Panel[] } | null = null;
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        // ignore parse error
      }
    }
    if (!parsed) {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          parsed = JSON.parse(content);
        } catch {
          // ignore parse error
        }
      }
    }
    if (!parsed?.panels?.length) throw new Error("Story generation returned no panels");
    return parsed;
  }

  throw new Error(lastError);
}

// ─── Hugging Face Image Generation ───────────────────────────────────────────

async function generatePanelImage(scene: string, styleHint: string): Promise<string> {
  if (!HF_API_KEY) throw new Error("HUGGINGFACE_API_KEY is not configured. Add it to your .env file.");

  const prompt = `${styleHint}. Single comic book panel illustration. Scene: ${scene}. Reverent, joyful, warm and kid-friendly. NO text, NO words, NO letters in the image. Square composition.`;

  const res = await fetch(
    `https://api-inference.huggingface.co/models/${HF_IMAGE_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width: 1024,
          height: 1024,
          num_inference_steps: 28,
          guidance_scale: 7.5,
        },
      }),
    }
  );

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) {
      throw new Error("Too many image requests — please wait a moment and try again.");
    }
    throw new Error(`Image gen error ${res.status}: ${t.slice(0, 200)}`);
  }

  // Hugging Face returns raw image bytes
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a complete comic: story panels + images.
 */
export async function generateComic(opts: GenerateOpts): Promise<ComicResult> {
  if (!opts.styleHint || typeof opts.styleHint !== "string") {
    throw new Error("styleHint required");
  }
  const hasCustom = typeof opts.customIdea === "string" && opts.customIdea.trim().length > 0;
  const hasTitle = typeof opts.storyTitle === "string" && opts.storyTitle.trim().length > 0;
  if (!hasCustom && !hasTitle) {
    throw new Error("Pick a story or write your own idea!");
  }

  const story = await generateStoryPanels({
    storyTitle: opts.storyTitle,
    customIdea: opts.customIdea,
    language: opts.language,
    twist: opts.twist,
    hero: opts.hero,
    numPanels: 6,
  });

  const images = await Promise.all(
    story.panels.map((p) => generatePanelImage(p.scene, opts.styleHint)),
  );

  return {
    title: story.title,
    panels: story.panels.map((p, i) => ({ ...p, imageUrl: images[i] })),
  };
}

/**
 * Regenerate a single panel image.
 */
export async function regeneratePanelImage(opts: {
  scene: string;
  styleHint: string;
}): Promise<{ imageUrl: string }> {
  if (!opts.scene || !opts.styleHint) throw new Error("scene and styleHint required");
  const url = await generatePanelImage(opts.scene, opts.styleHint);
  return { imageUrl: url };
}

/**
 * Restyle all panels of a comic with a new art style.
 */
export async function restyleComic(opts: {
  scenes: string[];
  styleHint: string;
}): Promise<{ imageUrls: string[] }> {
  if (!Array.isArray(opts.scenes) || opts.scenes.length === 0) {
    throw new Error("scenes required");
  }
  if (opts.scenes.length > 20) throw new Error("too many panels");
  if (!opts.styleHint || opts.styleHint.length > 500) {
    throw new Error("styleHint required");
  }

  const imageUrls = await Promise.all(
    opts.scenes.map((s) => generatePanelImage(s, opts.styleHint)),
  );
  return { imageUrls };
}

/**
 * Extend an existing comic with new panels.
 */
export async function extendComic(opts: ExtendOpts): Promise<ComicResult> {
  if (!opts.styleHint) throw new Error("styleHint required");
  if (!Array.isArray(opts.previousPanels) || opts.previousPanels.length === 0) {
    throw new Error("Previous panels required");
  }
  if (!opts.whatHappensNext || opts.whatHappensNext.trim().length < 2) {
    throw new Error("Tell us what happens next!");
  }

  const story = await generateStoryPanels({
    storyTitle: opts.previousTitle,
    customIdea: opts.whatHappensNext,
    language: opts.language,
    numPanels: 3,
    previousPanels: opts.previousPanels,
    previousTitle: opts.previousTitle,
  });

  const images = await Promise.all(
    story.panels.map((p) => generatePanelImage(p.scene, opts.styleHint)),
  );

  return {
    title: story.title,
    panels: story.panels.map((p, i) => ({ ...p, imageUrl: images[i] })),
  };
}
