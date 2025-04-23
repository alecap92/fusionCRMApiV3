import OpenAI from "openai";
import IntegrationsModel from "../models/IntegrationsModel";

/**
 * OpenAI Chat completion request message type
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Options for chat completion requests
 */
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

// Default model to use for completions
const DEFAULT_MODEL = "gpt-3.5-turbo";

/**
 * Get an OpenAI client instance with the correct API key
 *
 * @param organizationId - The organization ID to get credentials for
 * @returns OpenAI client instance
 */
async function getOpenAIClient(organizationId: string): Promise<OpenAI> {
  try {
    const integration = await IntegrationsModel.findOne({
      service: "openai",
      organizationId,
    });

    if (!integration?.credentials?.apiKey) {
      throw new Error("No API key found for this organization");
    }

    return new OpenAI({ apiKey: integration.credentials.apiKey });
  } catch (error) {
    console.error("Error fetching OpenAI integration:", error);
    throw new Error("Failed to get OpenAI credentials");
  }
}

/**
 * Generate content using OpenAI
 *
 * @param messages - Array of messages for the conversation
 * @param organizationId - Organization ID to get API key
 * @param options - Additional options for the completion
 * @returns Generated text response
 */
export async function generateContent(
  messages: ChatMessage[],
  organizationId: string,
  options: ChatCompletionOptions = {}
): Promise<string> {
  try {
    const openai = await getOpenAIClient(organizationId);

    const response = await openai.chat.completions.create({
      model: options.model || DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
    });

    // Log token usage for monitoring
    if (response.usage) {
      console.log(`OpenAI tokens used: ${response.usage.total_tokens}`);
    }

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new Error("Failed to generate content with OpenAI");
  }
}

/**
 * Generate social media content
 *
 * @param prompt - User query about the content to generate
 * @param organizationId - Organization ID to get API key
 * @param platform - Social media platform (instagram, facebook, etc.)
 * @param contentType - Type of content (post, caption, hashtags)
 * @returns Generated social media content
 */
export async function generateSocialContent(
  prompt: string,
  organizationId: string,

  contentType?: string
): Promise<string> {
  // Base system prompt for social media content
  let systemPrompt = `You are an expert social media manager. Write an engaging and conversational social media post for [PLATFORM: Instagram or Facebook] about [TOPIC]. Use a friendly and relatable tone. Include relevant emojis to enhance expression 🎯. Optimize for likes, comments, and shares. Keep it concise and eye-catching. Add a strong call to action appropriate for the platform (e.g., “Tag a friend 👇”, “Save this for later 🔖”, “Comment your thoughts 💬”).
Optional Inputs:
- Target audience: [e.g., Gen Z entrepreneurs, fitness lovers, dog owners]
- Brand voice/style: [e.g., playful, bold, inspiring]
- Promotion or event (if applicable): [e.g., sale, product launch, giveaway]";`;

  // Create messages array
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  // Generate content
  return generateContent(messages, organizationId, {
    temperature: 0.7,
    max_tokens: 500,
  });
}

// Export functions
export const openAIService = {
  generateContent,
  generateSocialContent,
};
