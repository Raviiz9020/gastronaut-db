import { genkit, z } from 'genkit';

//port { genkit, z } from '@genkit-ai/core';

import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-pro',
});
