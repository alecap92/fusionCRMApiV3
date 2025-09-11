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
exports.createN8nAutomation = createN8nAutomation;
exports.getN8nAutomations = getN8nAutomations;
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = "http://localhost:3001/api/v1";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NTk0YTc0OTgzZGU1OGNhNTU0N2I5NDUiLCJlbWFpbCI6ImFsZWphbmRyby5jYWJyZWpvQGdtYWlsLmNvbSIsImZpcnN0TmFtZSI6IkFsZWphbmRybyIsImxhc3ROYW1lIjoiQ2FicmVqbyIsIm1vYmlsZSI6IjMxNDMwMDcyNjMiLCJvcmdhbml6YXRpb25JZCI6IjY1OWQ4OWI3M2M2YWE4NjVmMWU3ZDZmYiIsInJlbWVtYmVyTWUiOmZhbHNlLCJyb2xlIjoiIiwiaWF0IjoxNzU2NDgzMDQxLCJleHAiOjE3NTY1Njk0NDF9.zv3_ovXyxeZrqhSO2CqRSyhDPvMI8LT239joQ0aF0Bo";
const automationData = {
    name: "Create Contact",
    endpoint: "https://automata.alecap922.site/webhook-test/create-contact",
    apiKey: "optional-api-key-here", // Opcional
};
function createN8nAutomation() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🚀 Creando automatización n8n...");
            console.log("📋 Datos:", automationData);
            const response = yield axios_1.default.post(`${API_BASE_URL}/n8n`, automationData, {
                headers: {
                    Authorization: `Bearer ${TOKEN}`,
                    "Content-Type": "application/json",
                },
            });
            console.log("✅ Automatización creada exitosamente!");
            console.log("📊 Respuesta:", response.data);
            return response.data;
        }
        catch (error) {
            console.error("❌ Error al crear automatización:");
            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("Data:", error.response.data);
            }
            else {
                console.error("Error:", error.message);
            }
            throw error;
        }
    });
}
function getN8nAutomations() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🔍 Obteniendo automatizaciones n8n...");
            const response = yield axios_1.default.get(`${API_BASE_URL}/n8n`, {
                headers: {
                    Authorization: `Bearer ${TOKEN}`,
                    "Content-Type": "application/json",
                },
            });
            console.log("✅ Automatizaciones obtenidas exitosamente!");
            console.log("📊 Respuesta:", response.data);
            return response.data;
        }
        catch (error) {
            console.error("❌ Error al obtener automatizaciones:");
            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("Data:", error.response.data);
            }
            else {
                console.error("Error:", error.message);
            }
            throw error;
        }
    });
}
// Función principal
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🎯 Iniciando prueba de N8N...\n");
            // Primero obtener las automatizaciones existentes
            yield getN8nAutomations();
            console.log("\n" + "=".repeat(50) + "\n");
            // Crear nueva automatización
            yield createN8nAutomation();
            console.log("\n" + "=".repeat(50) + "\n");
            // Obtener automatizaciones después de crear
            yield getN8nAutomations();
            console.log("\n🎉 Prueba completada exitosamente!");
        }
        catch (error) {
            console.error("\n💥 Prueba falló:", error);
            process.exit(1);
        }
    });
}
// Ejecutar si es el archivo principal
if (require.main === module) {
    main();
}
