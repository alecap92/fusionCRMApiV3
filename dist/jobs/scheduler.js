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
// cron/scheduler.ts
const node_cron_1 = __importDefault(require("node-cron"));
const ScheduledPost_1 = __importDefault(require("../models/ScheduledPost"));
const publisherService_1 = require("../services/publisherService");
// Ejecutar cada minuto
node_cron_1.default.schedule("* * * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("⏰ Ejecutando cron para publicaciones programadas");
    const now = new Date();
    try {
        const posts = yield ScheduledPost_1.default.find({
            status: "scheduled",
            scheduledFor: { $lte: now },
        });
        for (const post of posts) {
            console.log(`➡️ Publicando post ID: ${post._id}`);
            const result = yield (0, publisherService_1.publishScheduledPost)(post._id.toString());
            console.log(`✅ Resultado:`, result);
        }
    }
    catch (err) {
        console.error("❌ Error en cron job:", err);
    }
}));
