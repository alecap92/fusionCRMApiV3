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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ejecutarNodo = ejecutarNodo;
const handlers_1 = require("./handlers");
function ejecutarNodo(nodoId, nodesMap, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const nodo = nodesMap[nodoId];
        if (!nodo) {
            console.warn(`⚠️ Nodo no encontrado: ${nodoId}`);
            return;
        }
        if (nodo.type === "trigger") {
            console.log("⏭️ Nodo trigger, saltando ejecución. Pasando al siguiente...");
            const siguientes = nodo.next || [];
            for (const nextId of siguientes) {
                yield ejecutarNodo(nextId, nodesMap, context);
            }
            return;
        }
        const handler = handlers_1.handlers[nodo.type];
        if (!handler) {
            console.warn(`⚠️ Tipo de nodo no soportado: ${nodo.type}`);
            return;
        }
        console.log(`▶️ Ejecutando nodo: ${nodo.id} [${nodo.type}]`);
        const resultado = yield handler(nodo, context);
        let siguientes = [];
        if (nodo.type === "condition") {
            siguientes = resultado ? nodo.trueNext || [] : nodo.falseNext || [];
        }
        else {
            siguientes = nodo.next || [];
        }
        for (const siguienteId of siguientes) {
            yield ejecutarNodo(siguienteId, nodesMap, context);
        }
    });
}
