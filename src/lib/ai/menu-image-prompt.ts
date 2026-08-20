/**
 * Custom parameterized prompt builder for studio-quality commercial food photography.
 */
export function buildDishImagePrompt(dishName: string, category?: string, description?: string): string {
  const cleanName = dishName.trim();
  const descPart = description && description.trim().length > 0 ? ` (${description.trim()})` : '';
  const categoryContext = category && category.trim().length > 0 ? ` [Category: ${category.trim()}]` : '';

  return (
    `Ultra-realistic premium commercial food photography of ${cleanName}${descPart}${categoryContext}, ` +
    `served on modern matte black tableware. Shot at a 45-degree angled top-down perspective with soft directional lighting from one side. ` +
    `Center composition with the full dish and plating clearly visible, occupying around 60–70% of the frame. ` +
    `Slightly zoomed out to include comfortable negative space on all sides. Ensure the entire rim and edges of the tableware are fully visible within the frame. ` +
    `Background dark, minimal, and elegant with subtle texture. ` +
    `Food should look glossy, high contrast, with rich colors (deep reds, warm oranges, vibrant greens). ` +
    `Slight depth of field with soft background blur. ` +
    `Natural imperfections: uneven sauce coating, slight charring, fresh garnish, varied realistic textures. ` +
    `High resolution, sharp details, cinematic lighting, realistic shadows.`
  );
}

export const SUPPORTED_AI_IMAGE_MODELS = [
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (Fast & Economical)', cost: '~₹1.20' },
  { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image (Latest)', cost: '~₹1.65' },
  { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image (Ultra HD Studio)', cost: '~₹2.50' },
] as const;

export type SupportedImageModel = typeof SUPPORTED_AI_IMAGE_MODELS[number]['id'];
