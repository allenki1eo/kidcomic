// Hugging Face Inference API integration for image generation
// Docs: https://huggingface.co/docs/api-inference/index

const HF_API_BASE = "https://api-inference.huggingface.co/models";

// Popular free image generation models on Hugging Face
export const HF_IMAGE_MODELS = {
  // Stable Diffusion models (fast, good quality)
  stableDiffusionXL: "stabilityai/stable-diffusion-xl-base-1.0",
  stableDiffusion2: "stabilityai/stable-diffusion-2-1",
  // Specialized anime/cartoon styles
  anime: "Linaqruf/anything-v3.0",
  // Comic/cartoon style
  openjourney: "prompthero/openjourney-v4",
  // Fast model for quick results
  sdxlTurbo: "stabilityai/sdxl-turbo",
  // Disney/pixar style
  dreamlike: "dreamlike-art/dreamlike-diffusion-1.0",
} as const;

type ImageModel = keyof typeof HF_IMAGE_MODELS;

interface GenerateImageOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  model?: ImageModel | string;
}

interface HFResponse {
  error?: string;
  estimated_time?: number;
}

/**
 * Generate an image using Hugging Face Inference API
 * Returns a data URL (base64) or blob URL
 */
export async function generateImage(
  apiKey: string,
  options: GenerateImageOptions,
): Promise<string> {
  const {
    prompt,
    negativePrompt = "text, words, letters, watermark, signature, blurry, low quality",
    width = 512,
    height = 512,
    numInferenceSteps = 25,
    guidanceScale = 7.5,
    seed,
    model = "stableDiffusionXL",
  } = options;

  const modelId = HF_IMAGE_MODELS[model as ImageModel] || model;
  const url = `${HF_API_BASE}/${modelId}`;

  const payload = {
    inputs: prompt,
    parameters: {
      negative_prompt: negativePrompt,
      width,
      height,
      num_inference_steps: numInferenceSteps,
      guidance_scale: guidanceScale,
      ...(seed !== undefined && { seed }),
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as HFResponse;

    // Handle model loading state
    if (response.status === 503 && errorData.estimated_time) {
      throw new Error(
        `Model is loading. Please wait ${Math.ceil(errorData.estimated_time)} seconds and try again.`,
      );
    }

    // Handle rate limiting
    if (response.status === 429) {
      throw new Error(
        "Rate limit reached. Please wait a moment before generating more images.",
      );
    }

    throw new Error(
      `Hugging Face API error: ${response.status} - ${errorData.error || response.statusText}`,
    );
  }

  // Response is binary image data
  const blob = await response.blob();

  // Convert to data URL for easy use in img tags
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate an image and return as blob URL (more memory efficient)
 */
export async function generateImageBlob(
  apiKey: string,
  options: GenerateImageOptions,
): Promise<string> {
  const {
    prompt,
    negativePrompt = "text, words, letters, watermark, signature, blurry, low quality",
    width = 512,
    height = 512,
    numInferenceSteps = 25,
    guidanceScale = 7.5,
    seed,
    model = "stableDiffusionXL",
  } = options;

  const modelId = HF_IMAGE_MODELS[model as ImageModel] || model;
  const url = `${HF_API_BASE}/${modelId}`;

  const payload = {
    inputs: prompt,
    parameters: {
      negative_prompt: negativePrompt,
      width,
      height,
      num_inference_steps: numInferenceSteps,
      guidance_scale: guidanceScale,
      ...(seed !== undefined && { seed }),
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as HFResponse;

    if (response.status === 503 && errorData.estimated_time) {
      throw new Error(
        `Model is loading. Please wait ${Math.ceil(errorData.estimated_time)} seconds and try again.`,
      );
    }

    if (response.status === 429) {
      throw new Error(
        "Rate limit reached. Please wait a moment before generating more images.",
      );
    }

    throw new Error(
      `Hugging Face API error: ${response.status} - ${errorData.error || response.statusText}`,
    );
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Check if Hugging Face API key is valid
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${HF_API_BASE}/stabilityai/stable-diffusion-xl-base-1.0`, {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return response.status !== 401;
  } catch {
    return false;
  }
}

/**
 * Map art style hints to Hugging Face models
 */
export function getModelForStyle(styleHint: string): ImageModel | string {
  const hint = styleHint.toLowerCase();

  if (hint.includes("anime") || hint.includes("manga")) {
    return "anime";
  }
  if (hint.includes("cartoon") || hint.includes("comic")) {
    return "openjourney";
  }
  if (hint.includes("disney") || hint.includes("pixar") || hint.includes("3d")) {
    return "dreamlike";
  }
  if (hint.includes("fast") || hint.includes("quick")) {
    return "sdxlTurbo";
  }

  // Default to SDXL
  return "stableDiffusionXL";
}
