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
const axios_1 = __importDefault(require("axios"));
const chatGPT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messages } = req.body;
        // Instrucciones personalizadas para mejorar el tono y brevedad
        const systemMessage = {
            role: "system",
            content: "Eres un asistente de atención al cliente para 'Manillas de Control'. Responde solo preguntas relacionadas con la empresa, sus productos y servicios. Sé breve, profesional y amable, unicamente respuestas cortas. No inventes información. Proporciona información sobre opciones de pago, tiempos de entrega y direcciones de nuestras oficinas. Responde con un flujo conversacional natural, asegurando que las respuestas sean claras y directas sin parecer repetitivas. Si el cliente solicita una cotización, pregunta por el tipo de producto y la cantidad. Una vez tengamos esta información, debes preguntar si las manillas serán marcadas o sin marcar antes de proporcionar precios. Finalizando la conversación y una vez enviado el precio, confirma colores y revisa con el cliente detalles del pago antes de finalizar con el pedido. Si te piden informacion para el pago, entonces debes saber que los pagos son 100% anticipados, y debes dar esta cuenta bancaria que es el unico medio de pago que manejamos: Por favor consignar en Bancolombia ahorros número 052 1972 9539 a nombre de ALLCANYOUBUY SAS . NIT 900.694.948 - 9. Si te preguntan sobre el diseño, debes responder: Que te gustaria que llevaran las manillas? Puede ser: Logo, Texto, Direccion, Teléfonos, WhatsApp, Redes Sociales, Códigos QR, entre otros. Si te piden el correo de contacto es ventas@manillasdecontrol.com",
        };
        const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4o-mini",
            messages: [systemMessage, ...messages],
            temperature: 0.9,
            max_tokens: 150, // Ajustado para permitir respuestas completas pero concisas
        }, {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
        });
        res.status(200).json(response.data);
    }
    catch (error) {
        console.error("Error al conectar con OpenAI:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});
exports.default = chatGPT;
