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
exports.migrateN8nData = migrateN8nData;
exports.verifyMigration = verifyMigration;
exports.revertMigration = revertMigration;
const mongoose_1 = __importDefault(require("mongoose"));
const N8nModel_1 = __importDefault(require("../models/N8nModel"));
const AutomationModel_1 = __importDefault(require("../models/AutomationModel"));
// Configuración de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/fusioncol";
function migrateN8nData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🚀 Iniciando migración de datos N8N...");
            // Conectar a MongoDB
            yield mongoose_1.default.connect(MONGODB_URI);
            console.log("✅ Conectado a MongoDB");
            // Obtener todas las automatizaciones del modelo antiguo
            const oldAutomations = yield N8nModel_1.default.find({});
            console.log(`📊 Encontradas ${oldAutomations.length} automatizaciones para migrar`);
            if (oldAutomations.length === 0) {
                console.log("ℹ️ No hay automatizaciones para migrar");
                return;
            }
            let migratedCount = 0;
            let errorCount = 0;
            for (const oldAutomation of oldAutomations) {
                try {
                    console.log(`🔄 Migrando automatización: ${oldAutomation.name}`);
                    // Crear nueva automatización con el modelo actualizado
                    const newAutomation = new AutomationModel_1.default({
                        name: oldAutomation.name,
                        description: `Migrada desde modelo anterior - ${oldAutomation.name}`,
                        category: "custom", // Categoría por defecto
                        webhooks: [
                            {
                                name: "Webhook Principal",
                                endpoint: oldAutomation.endpoint,
                                method: oldAutomation.method || "POST",
                                headers: {},
                                bodyTemplate: "",
                                authentication: {
                                    type: oldAutomation.apiKey ? "api_key" : "none",
                                    credentials: oldAutomation.apiKey
                                        ? { apiKey: oldAutomation.apiKey }
                                        : undefined,
                                },
                                isActive: true,
                                timeout: 30000,
                                retryCount: 0,
                            },
                        ],
                        forms: [], // Sin formularios por defecto
                        triggers: [
                            {
                                type: "custom",
                                conditions: [],
                                isActive: true,
                                priority: 1,
                            },
                        ],
                        isActive: true,
                        organizationId: oldAutomation.organizationId,
                        createdBy: oldAutomation.userId,
                        tags: ["migrated", "legacy"],
                        executionStats: {
                            totalExecutions: 0,
                            successfulExecutions: 0,
                            failedExecutions: 0,
                        },
                        executionConfig: {
                            maxConcurrentExecutions: 1,
                            retryOnFailure: false,
                            maxRetries: 3,
                            executionTimeout: 60000,
                            pauseOnError: false,
                        },
                    });
                    yield newAutomation.save();
                    migratedCount++;
                    console.log(`✅ Automatización migrada exitosamente: ${oldAutomation.name}`);
                }
                catch (error) {
                    errorCount++;
                    console.error(`❌ Error migrando automatización ${oldAutomation.name}:`, error.message);
                }
            }
            console.log("\n" + "=".repeat(50));
            console.log("📊 RESUMEN DE MIGRACIÓN");
            console.log("=".repeat(50));
            console.log(`✅ Automatizaciones migradas: ${migratedCount}`);
            console.log(`❌ Errores: ${errorCount}`);
            console.log(`📝 Total procesadas: ${oldAutomations.length}`);
            if (errorCount === 0) {
                console.log("\n🎉 ¡Migración completada exitosamente!");
                // Opcional: Eliminar datos antiguos después de migración exitosa
                const shouldDeleteOld = process.argv.includes("--delete-old");
                if (shouldDeleteOld) {
                    console.log("\n🗑️ Eliminando datos antiguos...");
                    yield N8nModel_1.default.deleteMany({});
                    console.log("✅ Datos antiguos eliminados");
                }
                else {
                    console.log("\n💡 Para eliminar datos antiguos, ejecuta con --delete-old");
                }
            }
            else {
                console.log("\n⚠️ La migración se completó con errores. Revisa los logs.");
            }
        }
        catch (error) {
            console.error("💥 Error durante la migración:", error);
            process.exit(1);
        }
        finally {
            yield mongoose_1.default.disconnect();
            console.log("🔌 Desconectado de MongoDB");
        }
    });
}
// Función para verificar la migración
function verifyMigration() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🔍 Verificando migración...");
            yield mongoose_1.default.connect(MONGODB_URI);
            const oldCount = yield N8nModel_1.default.countDocuments();
            const newCount = yield AutomationModel_1.default.countDocuments();
            console.log(`📊 Modelo antiguo: ${oldCount} automatizaciones`);
            console.log(`📊 Modelo nuevo: ${newCount} automatizaciones`);
            if (newCount >= oldCount) {
                console.log("✅ Migración verificada exitosamente");
            }
            else {
                console.log("❌ La migración no se completó correctamente");
            }
        }
        catch (error) {
            console.error("💥 Error verificando migración:", error);
        }
        finally {
            yield mongoose_1.default.disconnect();
        }
    });
}
// Función para revertir la migración (solo para desarrollo)
function revertMigration() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🔄 Revirtiendo migración...");
            yield mongoose_1.default.connect(MONGODB_URI);
            yield AutomationModel_1.default.deleteMany({ tags: { $in: ["migrated"] } });
            console.log("✅ Migración revertida");
        }
        catch (error) {
            console.error("💥 Error revirtiendo migración:", error);
        }
        finally {
            yield mongoose_1.default.disconnect();
        }
    });
}
// Función principal
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const command = process.argv[2];
        switch (command) {
            case "migrate":
                yield migrateN8nData();
                break;
            case "verify":
                yield verifyMigration();
                break;
            case "revert":
                yield revertMigration();
                break;
            default:
                console.log("📋 Comandos disponibles:");
                console.log("  npm run ts-node src/scripts/migrateN8nData.ts migrate    # Migrar datos");
                console.log("  npm run ts-node src/scripts/migrateN8nData.ts verify    # Verificar migración");
                console.log("  npm run ts-node src/scripts/migrateN8nData.ts revert    # Revertir migración");
                console.log("\n💡 Para migrar y eliminar datos antiguos:");
                console.log("  npm run ts-node src/scripts/migrateN8nData.ts migrate --delete-old");
        }
    });
}
// Ejecutar si es el archivo principal
if (require.main === module) {
    main().catch(console.error);
}
