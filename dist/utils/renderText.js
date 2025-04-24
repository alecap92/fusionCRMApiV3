"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderText = renderText;
const handlebars_1 = __importDefault(require("handlebars"));
function renderText(template, context) {
    const compiled = handlebars_1.default.compile(template || "");
    return compiled(context);
}
