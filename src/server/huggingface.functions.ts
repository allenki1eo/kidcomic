import { createServerFn } from "@tanstack/react-start";
import {
  generateImage,
  getModelForStyle,
  HF_IMAGE_MODELS,
} from "@/integrations/huggingface";

/**
 * Generate a single comic panel image using Hugging Face
 */
export const generatePanelImageHF = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      scene: string;
      styleHint: string;
      width?: number;
      height?: number;
    }) => {
      if (!input?.scene || !input?.styleHint) {
        throw new Error("scene and styleHint required");
      }
      if (input.scene.length > 1000) throw new Error("scene too long");
      if (input.styleHint.length > 500) throw new Error("styleHint too long");
      return input;
    },
  )
  .handler(
    async ({
      data,
    }): Promise<{
      imageUrl: string;
      modelUsed: string;
    }> => {
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "HUGGINGFACE_API_KEY is not configured. Please add your Hugging Face API token.",
        );
      }

      const model = getModelForStyle(data.styleHint);

      // Build a kid-friendly, safe prompt
      const prompt = `${data.styleHint}. ${data.scene}. Children's book illustration style, warm and friendly, age-appropriate for kids. High quality, detailed but not scary. NO text, NO words, NO letters in the image. Square composition.`;

      try {
        const imageUrl = await generateImage(apiKey, {
          prompt,
          negativePrompt:
            "text, words, letters, watermark, signature, blurry, low quality, scary, horror, violent, adult content, nudity",
          width: data.width ?? 512,
          height: data.height ?? 512,
          numInferenceSteps: 25,
          guidanceScale: 7.5,
          model,
        });

        return {
          imageUrl,
          modelUsed: HF_IMAGE_MODELS[model as keyof typeof HF_IMAGE_MODELS] || model,
        };
      } catch (error) {
        console.error("Hugging Face image generation failed:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to generate image with Hugging Face");
      }
    },
  );

/**
 * Generate multiple comic panel images in parallel using Hugging Face
 */
export const generatePanelImagesBatchHF = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      scenes: string[];
      styleHint: string;
      width?: number;
      height?: number;
    }) => {
      if (!Array.isArray(input?.scenes) || input.scenes.length === 0) {
        throw new Error("scenes array required");
      }
      if (input.scenes.length > 20) throw new Error("too many panels");
      if (!input.styleHint || input.styleHint.length > 500) {
        throw new Error("styleHint required");
      }
      return input;
    },
  )
  .handler(
    async ({
      data,
    }): Promise<{
      imageUrls: string[];
      modelUsed: string;
    }> => {
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "HUGGINGFACE_API_KEY is not configured. Please add your Hugging Face API token.",
        );
      }

      const model = getModelForStyle(data.styleHint);

      // Generate images in parallel
      const imagePromises = data.scenes.map((scene) => {
        const prompt = `${data.styleHint}. ${scene}. Children's book illustration style, warm and friendly, age-appropriate for kids. High quality, detailed but not scary. NO text, NO words, NO letters in the image.`;

        return generateImage(apiKey, {
          prompt,
          negativePrompt:
            "text, words, letters, watermark, signature, blurry, low quality, scary, horror, violent, adult content, nudity",
          width: data.width ?? 512,
          height: data.height ?? 512,
          numInferenceSteps: 25,
          guidanceScale: 7.5,
          model,
        });
      });

      try {
        const imageUrls = await Promise.all(imagePromises);

        return {
          imageUrls,
          modelUsed: HF_IMAGE_MODELS[model as keyof typeof HF_IMAGE_MODELS] || model,
        };
      } catch (error) {
        console.error("Hugging Face batch image generation failed:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to generate images with Hugging Face");
      }
    },
  );

/**
 * Regenerate a comic with a new style using Hugging Face
 */
export const restyleComicHF = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { scenes: string[]; styleHint: string; width?: number; height?: number }) => {
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
  .handler(
    async ({
      data,
    }): Promise<{
      imageUrls: string[];
      modelUsed: string;
    }> => {
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "HUGGINGFACE_API_KEY is not configured. Please add your Hugging Face API token.",
        );
      }

      const model = getModelForStyle(data.styleHint);

      const imagePromises = data.scenes.map((scene) => {
        const prompt = `${data.styleHint}. ${scene}. Children's book illustration style, warm and friendly, age-appropriate. NO text, NO words, NO letters in the image.`;

        return generateImage(apiKey, {
          prompt,
          negativePrompt:
            "text, words, letters, watermark, signature, blurry, low quality, scary, horror",
          width: data.width ?? 512,
          height: data.height ?? 512,
          model,
        });
      });

      try {
        const imageUrls = await Promise.all(imagePromises);
        return {
          imageUrls,
          modelUsed: HF_IMAGE_MODELS[model as keyof typeof HF_IMAGE_MODELS] || model,
        };
      } catch (error) {
        console.error("Restyle failed:", error);
        throw error instanceof Error ? error : new Error("Failed to restyle comic");
      }
    },
  );

/**
 * Test Hugging Face API connection
 */
export const testHFConnection = createServerFn({ method: "POST" })
  .inputValidator((input: { test?: boolean }) => input)
  .handler(async (): Promise<{ success: boolean; message: string }> => {
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        message: "HUGGINGFACE_API_KEY is not set in environment variables",
      };
    }

    try {
      // Test with a simple request
      const response = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
          method: "HEAD",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (response.status === 401) {
        return {
          success: false,
          message: "Invalid API key. Please check your HUGGINGFACE_API_KEY.",
        };
      }

      if (response.status === 200 || response.status === 503) {
        // 503 means model is loading, which is fine
        return {
          success: true,
          message: "Hugging Face API is accessible and ready to use!",
        };
      }

      return {
        success: true,
        message: `Hugging Face API responded with status ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  });

/**
 * Get available Hugging Face models info
 */
export const getHFModelsInfo = createServerFn({ method: "POST" })
  .inputValidator((input: { dummy?: boolean }) => input)
  .handler(
    async (): Promise<{
      models: { id: string; name: string; description: string }[];
    }> => {
      return {
        models: [
          {
            id: "stableDiffusionXL",
            name: "Stable Diffusion XL",
            description: "High quality images, best overall quality",
          },
          {
            id: "sdxlTurbo",
            name: "SDXL Turbo",
            description: "Fast generation (fewer steps needed)",
          },
          {
            id: "openjourney",
            name: "Openjourney",
            description: "Midjourney-like style, great for artistic comics",
          },
          {
            id: "anime",
            name: "Anime Style",
            description: "Anime/manga style illustrations",
          },
          {
            id: "dreamlike",
            name: "Dreamlike",
            description: "Disney/Pixar-like 3D style",
          },
        ],
      };
    },
  );
