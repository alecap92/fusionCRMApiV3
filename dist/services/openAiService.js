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
exports.analyseContactDetails = exports.openAIService = void 0;
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
/**
 * Analyse contact details with AI: Deals, contact info, etc.
 *
 */
const analyseContactDetails = (contactId, organizationId, details) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const openai = yield getOpenAIClient(organizationId);
        // Extraer información relevante
        const contactProperties = ((_a = details.details) === null || _a === void 0 ? void 0 : _a.properties) || [];
        const deals = details.deals || [];
        const activities = details.activities || [];
        // Ordenar los deals por fecha de cierre (del más reciente al más antiguo)
        const sortedDeals = [...deals].sort((a, b) => new Date(b.closingDate).getTime() - new Date(a.closingDate).getTime());
        // Calcular métricas relevantes
        const totalDeals = deals.length;
        const totalRevenue = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
        const currentDate = new Date();
        // Obtener la fecha del último deal
        const lastDealDate = sortedDeals.length > 0 ? new Date(sortedDeals[0].closingDate) : null;
        // Calcular días desde la última compra
        const daysSinceLastPurchase = lastDealDate
            ? Math.floor((currentDate.getTime() - lastDealDate.getTime()) / (1000 * 3600 * 24))
            : null;
        // Crear un objeto con información consolidada
        const analysisData = {
            contactInfo: Object.fromEntries(contactProperties.map((prop) => [prop.key, prop.value])),
            dealsInfo: {
                totalDeals,
                totalRevenue,
                deals: sortedDeals.map((deal) => ({
                    title: deal.title,
                    amount: deal.amount,
                    closingDate: deal.closingDate,
                    status: deal.status,
                })),
            },
            metrics: {
                daysSinceLastPurchase,
                lastDealDate: lastDealDate ? lastDealDate.toISOString() : null,
                currentDate: currentDate.toISOString(),
            },
        };
        // Prompt especializado para el análisis
        const prompt = `
    Eres un asistente de ventas y análisis de clientes para un negocio. Analiza los siguientes datos de cliente y proporciona información comercial valiosa y procesable. NO repitas información básica como nombre, correo o teléfono que ya aparece en la interfaz.

    DATOS DEL CLIENTE:
    ${JSON.stringify(analysisData, null, 2)}

    Genera un análisis CONCISO (máximo 3 puntos) con información de ALTO VALOR como:
    
    1. Patrones de compra: Identifica ciclos o temporalidad en las compras del cliente basado en los closingDate. ¿Compra mensualmente? ¿Trimestralmente?
    
    2. Próximo contacto: Han pasado ${daysSinceLastPurchase} días desde la última compra. Basándote en su patrón histórico de intervalos entre compras, calcula específicamente CUÁNDO sería el momento óptimo para contactarlos para una nueva venta (fecha aproximada).

    
    3. Valor promedio: Calcula el ticket promedio y si sus compras aumentan o disminuyen en valor.
    
    4. Proyección: Basado en el historial, predice específicamente cuándo sería probable su próxima compra (fecha) y por qué monto. Incluye el razonamiento detrás de esta predicción.

    
    5. Oportunidad: Identifica productos complementarios o servicios adicionales que podría necesitar basado en sus compras anteriores.
    
    6. Estatus de relación: Determina si es un cliente activo, en riesgo de abandono o inactivo basado en su frecuencia de compra.

    7. Calcula el Lifetime Value (LTV) del cliente del ultimo año, en caso que falte informacion, usa el año anterior y calcula el promedio de este año. CAMPO IMPORTANTE.
    
    Formato de respuesta:
    - Incluye SOLO información procesable y relevante para ventas.
    - Sé específico con fechas y montos cuando sea posible.
    - Si no hay suficientes datos para algún punto, NO lo inventes ni lo menciones.
    - Responde en español.
    - Responde en formato HTML.
    - IMPORTANTE: Calcula con precisión los intervalos entre compras y usa esos datos para proyectar la fecha de la próxima compra.
    - No incluyas comillas dobles, comillas simples, etc. ni la palabra html
    `;
        const response = yield openai.chat.completions.create({
            model: "gpt-4-turbo", // Recomiendo usar un modelo más avanzado para este análisis
            messages: [
                {
                    role: "system",
                    content: "Eres un asistente especializado en análisis de clientes y ventas que proporciona insights comerciales de alto valor.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.2, // Temperatura baja para respuestas más precisas
        });
        return response.choices[0].message.content || "";
    }
    catch (error) {
        console.log(error);
        throw new Error("Failed to analyse contact");
    }
});
exports.analyseContactDetails = analyseContactDetails;
