import { NextRequest, NextResponse } from 'next/server';
import { buildDishImagePrompt } from '@/lib/ai/menu-image-prompt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dishName, category, description, modelName: requestedModel } = body;

    if (!dishName || typeof dishName !== 'string') {
      return NextResponse.json(
        { error: 'dishName is required and must be a string' },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_IMAGE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Gemini API key is not configured. Please add GEMINI_API_KEY in your .env or .env.local file.',
        },
        { status: 500 }
      );
    }

    const modelName: string =
      requestedModel ||
      process.env.GEMINI_IMAGE_MODEL ||
      'gemini-2.5-flash-image';

    const prompt = buildDishImagePrompt(dishName, category, description);

    let imageDataUrl: string | null = null;

    // 1. Try Gemini generateContent endpoint (standard for gemini-2.5-flash-image, gemini-3.1-flash-image, gemini-3-pro-image)
    if (modelName.startsWith('gemini-')) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData?.error?.message || `Gemini Image API failed with status ${response.status}`;

        if (response.status === 429) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please wait a few moments.', isRateLimit: true },
            { status: 429 }
          );
        }

        return NextResponse.json(
          { error: errorMessage, details: errorData },
          { status: response.status }
        );
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData?.data);

      if (imagePart?.inlineData?.data) {
        const mimeType = imagePart.inlineData.mimeType || 'image/jpeg';
        imageDataUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;
      }
    } else {
      // 2. Imagen 3 predict endpoint
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '1:1',
            outputOptions: { mimeType: 'image/jpeg' },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData?.error?.message || `Imagen API failed with status ${response.status}`;
        return NextResponse.json(
          { error: errorMessage, details: errorData },
          { status: response.status }
        );
      }

      const data = await response.json();
      const prediction = data?.predictions?.[0];
      if (prediction?.bytesBase64Encoded) {
        const mimeType = prediction.mimeType || 'image/jpeg';
        imageDataUrl = `data:${mimeType};base64,${prediction.bytesBase64Encoded}`;
      }
    }

    if (!imageDataUrl) {
      return NextResponse.json(
        { error: 'No image data returned from AI model' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      imageDataUrl,
      modelUsed: modelName,
      dishName,
    });
  } catch (error: any) {
    console.error('Error generating AI menu image:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
