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
exports.default = httpRequest;
const axios_1 = __importDefault(require("axios"));
const handlebars_1 = __importDefault(require("handlebars"));
function httpRequest(nodo, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = handlebars_1.default.compile(nodo.url || "")(context);
        const body = JSON.parse(handlebars_1.default.compile(JSON.stringify(nodo.body || {}))(context));
        const headers = nodo.headers || {};
        const method = nodo.method || "POST";
        console.log(`🌐 HTTP ${method} ➝ ${url}`);
        console.log("Payload:", body);
        yield (0, axios_1.default)({ method, url, headers, data: body });
    });
}
