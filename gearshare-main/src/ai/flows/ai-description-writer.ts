'use server';
/**
 * @fileOverview An AI assistant flow for generating item descriptions for marketplace listings.
 *
 * - generateItemDescription - A function that generates a descriptive listing for an item.
 * - AIDescriptionWriterInput - The input type for the generateItemDescription function.
 * - AIDescriptionWriterOutput - The return type for the generateItemDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIDescriptionWriterInputSchema = z.object({
  itemName: z.string().describe('The name of the item.'),
  category: z.string().optional().describe('The category of the item.'),
  keywords: z.array(z.string()).optional().describe('Additional keywords to include in the description.'),
});
export type AIDescriptionWriterInput = z.infer<typeof AIDescriptionWriterInputSchema>;

const AIDescriptionWriterOutputSchema = z.object({
  description: z.string().describe('The generated descriptive listing for the item.'),
});
export type AIDescriptionWriterOutput = z.infer<typeof AIDescriptionWriterOutputSchema>;

export async function generateItemDescription(
  input: AIDescriptionWriterInput
): Promise<AIDescriptionWriterOutput> {
  return aiDescriptionWriterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiDescriptionWriterPrompt',
  input: {schema: AIDescriptionWriterInputSchema},
  output: {schema: AIDescriptionWriterOutputSchema},
  prompt: `You are an AI assistant specialized in writing compelling and informative marketplace listings for a college campus.
Your goal is to create an attractive description for an item being listed for rent by a student to other students.

Generate a detailed and engaging description for the item based on the following information:

Item Name: {{{itemName}}}
{{#if category}}Category: {{{category}}}{{/if}}
{{#if keywords.length}}Keywords/Condition: {{#each keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}

Focus on highlighting its features, its usefulness for campus life, and its overall condition. Keep the tone friendly, trustworthy, and helpful. Avoid overly formal language; speak like a helpful peer.

Description:`,
});

const aiDescriptionWriterFlow = ai.defineFlow(
  {
    name: 'aiDescriptionWriterFlow',
    inputSchema: AIDescriptionWriterInputSchema,
    outputSchema: AIDescriptionWriterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
