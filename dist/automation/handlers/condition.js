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
exports.default = condition;
const lodash_1 = __importDefault(require("lodash"));
function condition(nodo, context) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const cond of nodo.conditions || []) {
            const value = lodash_1.default.get(context, cond.field);
            switch (cond.operator) {
                case "exists":
                    if (value === undefined || value === null)
                        return false;
                    break;
                case "equals":
                    if (value !== cond.value)
                        return false;
                    break;
                case "not_equals":
                    if (value === cond.value)
                        return false;
                    break;
                case "gt":
                    if (!(value > cond.value))
                        return false;
                    break;
                case "lt":
                    if (!(value < cond.value))
                        return false;
                    break;
            }
        }
        return true;
    });
}
