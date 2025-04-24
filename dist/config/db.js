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
exports.connect = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// Cargar variables de entorno desde el archivo .env
dotenv_1.default.config();
// Definir el tipo de la función connect
const connect = () => __awaiter(void 0, void 0, void 0, function* () {
    const mongoUri = process.env.MONGODB_CONNECTION;
    if (!mongoUri) {
        console.error("MONGODB_CONNECTION is not defined in the environment variables");
        process.exit(1);
    }
    try {
        yield mongoose_1.default.connect(mongoUri);
        console.log("Connected to the database");
    }
    catch (error) {
        console.error("Connection error:", error);
        process.exit(1);
    }
});
exports.connect = connect;
