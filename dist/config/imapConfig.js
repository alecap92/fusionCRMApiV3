"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToInbox = void 0;
const imap_1 = __importDefault(require("imap"));
const connectToInbox = (config, callback) => {
    const imap = new imap_1.default(config);
    imap.once("ready", () => {
        imap.openBox("INBOX", true, callback);
    });
    imap.once("error", (err) => {
        console.error("IMAP error:", err);
    });
    imap.once("end", () => {
        console.log("Connection ended");
    });
    imap.connect();
    return imap;
};
exports.connectToInbox = connectToInbox;
