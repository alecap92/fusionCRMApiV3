"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/utils/logger.ts
const winston_1 = __importDefault(require("winston"));
// Configuración básica de logger
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
        // En producción, podrías agregar transports adicionales como archivos, Elasticsearch, etc.
    ],
});
exports.default = logger;
