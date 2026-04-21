import { createServerFn } from "@tanstack/react-start";

type Panel = {
  scene: string; // visual description for image gen
  caption: string; // narration text
  dialogue?: { speaker: string; text: string };
};

type ComicResult = {
  title: string;
  panels: Array<Panel & { imageUrl: string }>;
};

const OPENROUTER_STORY_MODELS = [
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-4-31b-it:free",
] as const;

async function generateStoryPanels(
  storyTitle: string,
  customIdea?: string,
): Promise<{ title: string; panels: Panel[] }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const isCustom = !!customIdea?.trim();
  const systemPrompt = isCustom
    ? `You are a delightful children's storyteller making a fun, faith-friendly 6-panel comic for kids ages 5-10. Use the kid's idea as the spark. Keep it warm, kind, age-appropriate, and full of wonder — gentle Bible/Christian values are welcome but never preachy. Invent a short, playful comic title. For each panel provide:
- "scene": a vivid one-sentence visual description (characters, setting, action) for an illustrator. NO text/words in the image description.
- "caption": 1-2 short sentences of kid-friendly narration.
- "dialogue" (optional): a single short line a character says, with their name.
Return ONLY valid JSON.`
    : `You are a delightful children's Bible storyteller. Create a 6-panel comic strip from a Bible story for kids ages 5-10. Keep language simple, warm, age-appropriate, and faithful to the Bible. For each panel provide:
- "scene": a vivid one-sentence visual description (characters, setting, action) for an illustrator. NO text/words in the image description.
- "caption": 1-2 short sentences of kid-friendly narration.
- "dialogue" (optional): a single short line a character says, with their name.
Return ONLY valid JSON.`;

  let lastError = "Unknown OpenRouter error";

  for (const model of OPENROUTER_STORY_MODELS) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lovable.dev",
        "X-Title": "Kids Bible Comics",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: isCustom
              ? `Kid's story idea: "${customIdea!.trim()}". Turn it into a fun, kind 6-panel comic now.`
              : `Bible story: "${storyTitle}". Create the 6-panel comic now.`,
          },
        ],
        response_format: { type: "json_object" },
        tools: [
          {
            type: "function",
            function: {
              name: "create_comic",
              description: "Return a 6-panel kids Bible comic.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  panels: {
                    type: "array",
                    minItems: 6,
                    maxItems: 6,
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
      lastError = `OpenRouter error ${res.status}: ${t.slice(0, 300)}`;
      if (res.status === 404 || res.status === 410) {
        continue;
      }
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
    throw new Error(`Image gen error ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("No image returned");
  return url;
}

export const generateComic = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { storyTitle: string; styleHint: string; customIdea?: string }) => {
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
      return input;
    },
  )
  .handler(async ({ data }): Promise<ComicResult> => {
    const story = await generateStoryPanels(data.storyTitle, data.customIdea);
    const images = await Promise.all(
      story.panels.map((p) => generatePanelImage(p.scene, data.styleHint)),
    );
    return {
      title: story.title,
      panels: story.panels.map((p, i) => ({ ...p, imageUrl: images[i] })),
    };
  });
