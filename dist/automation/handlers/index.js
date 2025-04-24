"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlers = void 0;
const send_email_1 = __importDefault(require("./send_email"));
const http_request_1 = __importDefault(require("./http_request"));
const condition_1 = __importDefault(require("./condition"));
exports.handlers = {
    send_email: send_email_1.default,
    http_request: http_request_1.default,
    condition: condition_1.default,
};
