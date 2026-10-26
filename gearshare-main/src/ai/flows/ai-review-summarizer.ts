'use server';
/**
 * @fileOverview An AI assistant that summarizes user reviews for an item.
 *
 * - aiReviewSummarizer - A function that handles the review summarization process.
 * - AiReviewSummarizerInput - The input type for the aiReviewSummarizer function.
 * - AiReviewSummarizerOutput - The return type for the aiReviewSummarizer function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiReviewSummarizerInputSchema = z.object({
  reviews: z.array(z.string()).describe('A list of reviews for an item.'),
});
export type AiReviewSummarizerInput = z.infer<typeof AiReviewSummarizerInputSchema>;

const AiReviewSummarizerOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the key points and general sentiment from the reviews.'),
});
export type AiReviewSummarizerOutput = z.infer<typeof AiReviewSummarizerOutputSchema>;

export async function aiReviewSummarizer(
  input: AiReviewSummarizerInput
): Promise<AiReviewSummarizerOutput> {
  return aiReviewSummarizerFlow(input);
}

const summarizeReviewsPrompt = ai.definePrompt({
  name: 'summarizeReviewsPrompt',
  input: { schema: AiReviewSummarizerInputSchema },
  output: { schema: AiReviewSummarizerOutputSchema },
  prompt: `You are an AI assistant tasked with summarizing user reviews for an item.
Read the following reviews and provide a concise summary that captures the key points and general sentiment.
The summary should be structured and easy to read and focus on common feedback.

Reviews:
{{#each reviews}}
- {{{this}}}
{{/each}}`,
});

const aiReviewSummarizerFlow = ai.defineFlow(
  {
    name: 'aiReviewSummarizerFlow',
    inputSchema: AiReviewSummarizerInputSchema,
    outputSchema: AiReviewSummarizerOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeReviewsPrompt(input);
    return output!;
  }
);
