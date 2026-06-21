
'use server';

/**
 * @fileOverview A Genkit flow for generating images from a text prompt.
 * 
 * - generateImage - A function that takes a text prompt and returns an image data URI.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { uploadImageToStorage as uploadImageUtil } from '@/lib/client-utils'; // Renamed to avoid conflict

const GenerateImageInputSchema = z.object({
  prompt: z.string(),
  promptType: z.enum(['food', 'offer', 'logo', 'shop', 'category']).default('food'),
  vendorUsername: z.string().optional(),
});

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe("The generated image as a data URI."),
});

export async function generateImage(input: z.infer<typeof GenerateImageInputSchema>): Promise<z.infer<typeof GenerateImageOutputSchema>> {
    return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async ({ prompt, promptType, vendorUsername }) => {
    
    let fullPrompt = prompt;

    if (promptType === 'food') {
      fullPrompt = `A cinematic, web-optimized, photorealistic image of the following food item on a simple, dark background: ${prompt}`;
    } else if (promptType === 'offer') {
        fullPrompt = `Create a visually stunning, web-optimized promotional image for a food delivery company. The image's theme should be inspired by: "${prompt}". The image MUST creatively embed the exact text "From HyperDelivery" into a design element. Do NOT include the theme's text (e.g., "${prompt}") or any other words in the image. Only "From HyperDelivery" should appear as text.`;
    } else if (promptType === 'logo') {
        fullPrompt = `A modern, vector-style logo for a company. The logo should be on a clean, white background. The prompt for the logo is: "${prompt}". The logo should be iconic, simple, and memorable.`;
    } else if (promptType === 'shop') {
        fullPrompt = `A professional, web-optimized, photorealistic image of a storefront for a local food shop. The prompt for the image is: "${prompt}". The image should look inviting and represent the category of food sold. Avoid text in the image.`;
    } else if (promptType === 'category') {
        fullPrompt = `A vibrant, professional, web-optimized, photorealistic banner image representing a food category. The prompt for the image is: "${prompt}". The image should be visually appealing and clearly represent the food type. Avoid any text in the image. Image should be landscape orientation.`;
    }

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: fullPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed to produce an image.');
    }
    
    // The flow now just returns the raw data URI from the AI model.
    // The calling function is responsible for uploading to storage if needed.
    return {
      imageUrl: media.url,
    };
  }
);
