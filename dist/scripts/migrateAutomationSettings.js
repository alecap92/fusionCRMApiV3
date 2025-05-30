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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const ConversationModel_1 = __importDefault(require("../models/ConversationModel"));
dotenv_1.default.config();
const migrateAutomationSettings = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Conectar a MongoDB
        yield mongoose_1.default.connect(process.env.MONGODB_CONNECTION);
        console.log("Conectado a MongoDB");
        // Buscar todas las conversaciones que no tienen automationSettings
        const conversationsWithoutSettings = yield ConversationModel_1.default.find({
            automationSettings: { $exists: false },
        });
        console.log(`Encontradas ${conversationsWithoutSettings.length} conversaciones sin automationSettings`);
        if (conversationsWithoutSettings.length === 0) {
            console.log("Todas las conversaciones ya tienen automationSettings");
            return;
        }
        // Actualizar conversaciones en lotes
        const batchSize = 100;
        let updated = 0;
        for (let i = 0; i < conversationsWithoutSettings.length; i += batchSize) {
            const batch = conversationsWithoutSettings.slice(i, i + batchSize);
            const batchIds = batch.map((conv) => conv._id);
            yield ConversationModel_1.default.updateMany({ _id: { $in: batchIds } }, {
                $set: {
                    automationSettings: {
                        isPaused: false,
                        automationHistory: [],
                    },
                },
            });
            updated += batch.length;
            console.log(`Actualizadas ${updated}/${conversationsWithoutSettings.length} conversaciones`);
        }
        console.log("✅ Migración completada exitosamente");
        console.log(`Total de conversaciones actualizadas: ${updated}`);
    }
    catch (error) {
        console.error("❌ Error durante la migración:", error);
    }
    finally {
        yield mongoose_1.default.disconnect();
        console.log("Desconectado de MongoDB");
    }
});
// Ejecutar la migración si el script se ejecuta directamente
if (require.main === module) {
    migrateAutomationSettings()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
exports.default = migrateAutomationSettings;
