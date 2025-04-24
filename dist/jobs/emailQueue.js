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
const bull_1 = __importDefault(require("bull"));
const EmailModel_1 = __importDefault(require("../models/EmailModel"));
const mailparser_1 = require("mailparser");
const mongoose_1 = __importDefault(require("mongoose"));
const imap_1 = __importDefault(require("imap")); // Importa la clase Imap para manejar la conexión
// Crear una cola para el procesamiento de correos electrónicos
const emailProcessingQueue = new bull_1.default("email-processing");
// Procesar el trabajo en la cola
emailProcessingQueue.process((job) => __awaiter(void 0, void 0, void 0, function* () {
    const { results, imapConfig, userId } = job.data;
    console.log(`Job started for userId: ${userId}, processing ${results.length} emails`);
    const imapConnection = new imap_1.default(imapConfig); // Renombrado a imapConnection
    imapConnection.once("ready", () => {
        console.log("IMAP connection ready");
        for (const uid of results) {
            console.log(`Fetching email with UID: ${uid}`);
            const fetch = imapConnection.fetch(uid.toString(), {
                bodies: "",
                struct: true,
            });
            fetch.on("message", (msg) => {
                console.log(`Processing message with UID: ${uid}`);
                let emailData = {
                    userId: new mongoose_1.default.Types.ObjectId(userId),
                    attachments: [],
                };
                msg.on("body", (stream) => {
                    console.log(`Reading body of message UID: ${uid}`);
                    (0, mailparser_1.simpleParser)(stream, (err, parsed) => __awaiter(void 0, void 0, void 0, function* () {
                        var _a, _b;
                        if (err) {
                            console.error("Error parsing email body:", err);
                            return;
                        }
                        console.log(`Email body parsed for UID: ${uid}`);
                        let toText = "";
                        if (Array.isArray(parsed.to)) {
                            toText = parsed.to.map((addr) => addr.text).join(", ");
                        }
                        else if (parsed.to && "text" in parsed.to) {
                            toText = parsed.to.text;
                        }
                        emailData = {
                            userId: new mongoose_1.default.Types.ObjectId(userId),
                            from: ((_a = parsed.from) === null || _a === void 0 ? void 0 : _a.text) || "",
                            to: toText.split(", "),
                            subject: parsed.subject || "",
                            body: parsed.text || "",
                            htmlBody: parsed.html || "",
                            date: parsed.date || new Date(),
                            attachments: ((_b = parsed.attachments) === null || _b === void 0 ? void 0 : _b.map((attachment) => ({
                                filename: attachment.filename,
                                contentType: attachment.contentType,
                                content: attachment.content.toString("base64"),
                            }))) || [],
                            uid,
                            flags: msg.flags || [],
                        };
                        console.log(`Saving email to database with UID: ${uid}`);
                        // Guardar el correo en la base de datos
                        const email = new EmailModel_1.default(emailData);
                        yield email.save();
                        console.log(`Email UID: ${uid} saved successfully`);
                    }));
                });
                msg.once("attributes", (attrs) => {
                    emailData.uid = attrs.uid;
                    emailData.modseq = attrs.modseq;
                    console.log(`Attributes received for UID: ${attrs.uid}`);
                });
            });
            fetch.once("end", () => {
                console.log(`Finished processing message with UID: ${uid}`);
            });
            fetch.once("error", (err) => {
                console.error(`Error fetching message with UID: ${uid}`, err);
            });
        }
        imapConnection.once("end", () => {
            console.log("IMAP connection ended");
        });
        console.log("Ending IMAP connection after processing all messages");
        imapConnection.end(); // Cerrar la conexión después de procesar los correos
    });
    imapConnection.once("error", (err) => {
        console.error("IMAP connection error", err);
    });
    console.log("Connecting to IMAP server...");
    imapConnection.connect(); // Conectar al servidor IMAP
}));
exports.default = emailProcessingQueue;
