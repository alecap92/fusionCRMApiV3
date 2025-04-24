"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIService = void 0;
exports.generateContent = generateContent;
exports.generateSocialContent = generateSocialContent;
const openai_1 = __importDefault(require("openai"));
const IntegrationsModel_1 = __importDefault(require("../models/IntegrationsModel"));
// Default model to use for completions
const DEFAULT_MODEL = "gpt-3.5-turbo";
/**
 * Get an OpenAI client instance with the correct API key
 *
 * @param organizationId - The organization ID to get credentials for
 * @returns OpenAI client instance
 */
function getOpenAIClient(organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const integration = yield IntegrationsModel_1.default.findOne({
                service: "openai",
                organizationId,
            });
            if (!((_a = integration === null || integration === void 0 ? void 0 : integration.credentials) === null || _a === void 0 ? void 0 : _a.apiKey)) {
                throw new Error("No API key found for this organization");
            }
            return new openai_1.default({ apiKey: integration.credentials.apiKey });
        }
        catch (error) {
            console.error("Error fetching OpenAI integration:", error);
            throw new Error("Failed to get OpenAI credentials");
        }
    });
}
/**
 * Generate content using OpenAI
 *
 * @param messages - Array of messages for the conversation
 * @param organizationId - Organization ID to get API key
 * @param options - Additional options for the completion
 * @returns Generated text response
 */
function generateContent(messages_1, organizationId_1) {
    return __awaiter(this, arguments, void 0, function* (messages, organizationId, options = {}) {
        var _a;
        try {
            const openai = yield getOpenAIClient(organizationId);
            const response = yield openai.chat.completions.create({
                model: options.model || DEFAULT_MODEL,
                messages,
                temperature: (_a = options.temperature) !== null && _a !== void 0 ? _a : 0.7,
                max_tokens: options.max_tokens,
            });
            // Log token usage for monitoring
            if (response.usage) {
                console.log(`OpenAI tokens used: ${response.usage.total_tokens}`);
            }
            return response.choices[0].message.content || "";
        }
        catch (error) {
            console.error("Error calling OpenAI API:", error);
            throw new Error("Failed to generate content with OpenAI");
        }
    });
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
function generateSocialContent(prompt, organizationId, contentType) {
    return __awaiter(this, void 0, void 0, function* () {
        // Base system prompt for social media content
        let systemPrompt = `You are an expert social media manager. Write an engaging and conversational social media post for [PLATFORM: Instagram or Facebook] about [TOPIC]. Use a friendly and relatable tone. Include relevant emojis to enhance expression 🎯. Optimize for likes, comments, and shares. Keep it concise and eye-catching. Add a strong call to action appropriate for the platform (e.g., “Tag a friend 👇”, “Save this for later 🔖”, “Comment your thoughts 💬”).
Optional Inputs:
- Target audience: [e.g., Gen Z entrepreneurs, fitness lovers, dog owners]
- Brand voice/style: [e.g., playful, bold, inspiring]
- Promotion or event (if applicable): [e.g., sale, product launch, giveaway]";`;
        // Create messages array
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
        ];
        // Generate content
        return generateContent(messages, organizationId, {
            temperature: 0.7,
            max_tokens: 500,
        });
    });
}
// Export functions
exports.openAIService = {
    generateContent,
    generateSocialContent,
};
