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
exports.eventEmitter = void 0;
const AutomationModel_1 = __importDefault(require("../models/AutomationModel"));
const automation_service_1 = require("./automation.service");
const events_1 = require("events");
exports.eventEmitter = new events_1.EventEmitter(); // Idealmente se mueve a utils/events.ts
exports.eventEmitter.on("deals.status_changed", (payload) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("🔔 Evento recibido: deals.status_changed");
    console.log("📦 Payload recibido:", payload);
    try {
        const automations = yield AutomationModel_1.default.find({ isActive: true });
        console.log(`📋 Automatizaciones activas encontradas: ${automations.length}`);
        for (const automation of automations) {
            console.log(`➡️ Evaluando automatización: ${automation.name}`);
            const nodesMap = Object.fromEntries(automation.nodes.map((n) => [n.id, n]));
            const triggerNode = nodesMap["1"];
            if (!triggerNode) {
                console.warn("⚠️ Automatización sin nodo 1 (trigger). Saltando.");
                continue;
            }
            if (triggerNode.type === "trigger" &&
                triggerNode.module === "deals" &&
                triggerNode.event === "status_changed") {
                console.log("✅ Trigger válido. Verificando payloadMatch...");
                const match = Object.entries(triggerNode.payloadMatch || {}).every(([key, val]) => {
                    var _a;
                    const match = ((_a = payload[key]) === null || _a === void 0 ? void 0 : _a.toString()) === (val === null || val === void 0 ? void 0 : val.toString());
                    console.log(`🔍 Comparando payload[${key}] = ${payload[key]} con`, val, "→", match);
                    return match;
                });
                if (match) {
                    console.log(`🚀 Disparando automatización: ${automation.name}`);
                    yield (0, automation_service_1.ejecutarNodo)(triggerNode.id, nodesMap, payload);
                }
                else {
                    console.log(`❌ No coincidió payloadMatch en automatización: ${automation.name}`);
                }
            }
            else {
                console.log("⚠️ Nodo 1 no es trigger válido. Saltando.");
            }
        }
    }
    catch (error) {
        console.error("❌ Error ejecutando automatización:", error);
    }
}));
