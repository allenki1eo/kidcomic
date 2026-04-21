import { createServerFn } from "@tanstack/react-start";

type Panel = {
  scene: string;
  caption: string;
  dialogue?: { speaker: string; text: string };
};

type ComicResult = {
  title: string;
  panels: Array<Panel & { imageUrl: string }>;
};

const STORY_MODEL = "google/gemini-3-flash-preview";

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
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

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

  let lastError = "Unknown AI gateway error";

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: STORY_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_comic",
              description: `Return a ${numPanels}-panel kids comic.`,
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  panels: {
                    type: "array",
                    minItems: numPanels,
                    maxItems: numPanels,
                    items: {
                      type: "object",
                      properties: {
                        scene: { type: "string" },
                        caption: { type: "string" },
                        dialogue: {
                          type: "object",
                          properties: {
                            speaker: { type: "string" },
                            text: { type: "string" },
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
          },
        ],
        tool_choice: { type: "function", function: { name: "create_comic" } },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      lastError = `AI gateway error ${res.status}: ${t.slice(0, 300)}`;
      if (res.status === 429) {
        throw new Error("Whoa, too many comics at once! Please wait a moment and try again.");
      }
      if (res.status === 402) {
        throw new Error("AI credits are out — please add credits in Settings → Workspace → Usage.");
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
      } catch {}
    }
    if (!parsed) {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          parsed = JSON.parse(content);
        } catch {}
      }
    }
    if (!parsed?.panels?.length) throw new Error("Story generation returned no panels");
    return parsed;
  }

  throw new Error(lastError);
}

async function generatePanelImage(scene: string, styleHint: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const prompt = `${styleHint}. Single comic book panel illustration. Scene: ${scene}. Reverent, joyful, warm and kid-friendly. NO text, NO words, NO letters in the image. Square composition.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) {
      throw new Error("Too many image requests — please wait a moment and try again.");
    }
    if (res.status === 402) {
      throw new Error("AI credits are out — please add credits in Settings → Workspace → Usage.");
    }
    throw new Error(`Image gen error ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("No image returned");
  return url;
}

export const generateComic = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      storyTitle: string;
      styleHint: string;
      customIdea?: string;
      language?: string;
      twist?: string;
      hero?: string;
    }) => {
      if (!input?.styleHint || typeof input.styleHint !== "string") {
        throw new Error("styleHint required");
      }
      const hasCustom = typeof input.customIdea === "string" && input.customIdea.trim().length > 0;
      const hasTitle = typeof input.storyTitle === "string" && input.storyTitle.trim().length > 0;
      if (!hasCustom && !hasTitle) {
        throw new Error("Pick a story or write your own idea!");
      }
      if ((input.storyTitle?.length ?? 0) > 200 || input.styleHint.length > 500) {
        throw new Error("input too long");
      }
      if ((input.customIdea?.length ?? 0) > 500) {
        throw new Error("Your story idea is too long — keep it under 500 characters!");
      }
      if ((input.twist?.length ?? 0) > 200) {
        throw new Error("Twist too long");
      }
      if ((input.hero?.length ?? 0) > 300) {
        throw new Error("Hero description too long — keep it under 300 characters!");
      }
      return input;
    },
  )
  .handler(async ({ data }): Promise<ComicResult> => {
    const story = await generateStoryPanels({
      storyTitle: data.storyTitle,
      customIdea: data.customIdea,
      language: data.language,
      twist: data.twist,
      hero: data.hero,
      numPanels: 6,
    });
    const images = await Promise.all(
      story.panels.map((p) => generatePanelImage(p.scene, data.styleHint)),
    );
    return {
      title: story.title,
      panels: story.panels.map((p, i) => ({ ...p, imageUrl: images[i] })),
    };
  });

export const regeneratePanelImage = createServerFn({ method: "POST" })
  .inputValidator((input: { scene: string; styleHint: string }) => {
    if (!input?.scene || !input?.styleHint) throw new Error("scene and styleHint required");
    if (input.scene.length > 1000) throw new Error("scene too long");
    if (input.styleHint.length > 500) throw new Error("styleHint too long");
    return input;
  })
  .handler(async ({ data }): Promise<{ imageUrl: string }> => {
    const url = await generatePanelImage(data.scene, data.styleHint);
    return { imageUrl: url };
  });

export const restyleComic = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { scenes: string[]; styleHint: string }) => {
      if (!Array.isArray(input?.scenes) || input.scenes.length === 0) {
        throw new Error("scenes required");
      }
      if (input.scenes.length > 20) throw new Error("too many panels");
      if (!input.styleHint || input.styleHint.length > 500) {
        throw new Error("styleHint required");
      }
      return input;
    },
  )
  .handler(async ({ data }): Promise<{ imageUrls: string[] }> => {
    const imageUrls = await Promise.all(
      data.scenes.map((s) => generatePanelImage(s, data.styleHint)),
    );
    return { imageUrls };
  });

export const extendComic = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      previousTitle: string;
      previousPanels: Array<{
        scene: string;
        caption: string;
        dialogue?: { speaker: string; text: string };
      }>;
      whatHappensNext: string;
      styleHint: string;
      language?: string;
    }) => {
      if (!input?.styleHint) throw new Error("styleHint required");
      if (!Array.isArray(input.previousPanels) || input.previousPanels.length === 0) {
        throw new Error("Previous panels required");
      }
      if (!input.whatHappensNext || input.whatHappensNext.trim().length < 2) {
        throw new Error("Tell us what happens next!");
      }
      if (input.whatHappensNext.length > 400) {
        throw new Error("Keep it under 400 characters!");
      }
      return input;
    },
  )
  .handler(
    async ({
      data,
    }): Promise<{ panels: Array<Panel & { imageUrl: string }> }> => {
      const story = await generateStoryPanels({
        storyTitle: data.previousTitle,
        customIdea: data.whatHappensNext,
        language: data.language,
        numPanels: 3,
        previousPanels: data.previousPanels,
        previousTitle: data.previousTitle,
      });
      const images = await Promise.all(
        story.panels.map((p) => generatePanelImage(p.scene, data.styleHint)),
      );
      return {
        panels: story.panels.map((p, i) => ({ ...p, imageUrl: images[i] })),
      };
    },
  );
