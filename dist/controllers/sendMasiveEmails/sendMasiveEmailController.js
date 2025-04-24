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
exports.sendEmailCampaign = void 0;
const OrganizationModel_1 = __importDefault(require("../../models/OrganizationModel"));
const EmailMarketingModel_1 = __importDefault(require("../../models/EmailMarketingModel"));
const EmailTemplates_1 = __importDefault(require("../../models/EmailTemplates"));
const ListModel_1 = __importDefault(require("../../models/ListModel"));
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const SibApiV3Sdk = require("sib-api-v3-sdk");
// ✅ Función para extraer el email de un contacto desde `properties`
const getEmailFromContact = (contact) => {
    const emailProperty = contact.properties.find((prop) => prop.key === "email");
    return (emailProperty === null || emailProperty === void 0 ? void 0 : emailProperty.value) || null;
};
// ✅ Controlador para enviar una campaña de email de forma masiva con lotes de 300
const sendEmailCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { campaignId } = req.params;
        // 📌 1️⃣ Validar la campaña
        const campaign = yield EmailMarketingModel_1.default.findById(campaignId)
            .populate("emailTemplateId")
            .populate("recipients");
        if (!campaign) {
            return res.status(404).json({ message: "Campaña no encontrada" });
        }
        if (campaign.status !== "scheduled") {
            return res
                .status(400)
                .json({ message: "La campaña no está programada para enviar" });
        }
        // 📌 2️⃣ Validar la organización y configuración de Brevo
        const organization = yield OrganizationModel_1.default.findById(campaign.organizationId);
        if (!organization) {
            return res.status(404).json({ message: "Organización no encontrada" });
        }
        const { masiveEmails } = organization.settings;
        if (!masiveEmails ||
            !masiveEmails.apiKey ||
            !masiveEmails.senderEmail ||
            !masiveEmails.senderName) {
            return res
                .status(400)
                .json({ message: "Falta configuración de Brevo en la organización" });
        }
        // 📌 3️⃣ Obtener la plantilla de correo
        const template = yield EmailTemplates_1.default.findById(campaign.emailTemplateId);
        if (!template) {
            return res
                .status(404)
                .json({ message: "Plantilla de correo no encontrada" });
        }
        // 📌 4️⃣ Obtener la lista de contactos
        const list = yield ListModel_1.default.findById(campaign.recipients);
        if (!list) {
            return res
                .status(400)
                .json({ message: "Lista de destinatarios no encontrada" });
        }
        if (!list.contactIds || list.contactIds.length === 0) {
            return res
                .status(400)
                .json({ message: "La lista de destinatarios está vacía" });
        }
        // 📌 5️⃣ Buscar los contactos en la base de datos
        const contacts = yield ContactModel_1.default.find({ _id: { $in: list.contactIds } });
        if (!contacts || contacts.length === 0) {
            return res
                .status(400)
                .json({ message: "No se encontraron contactos en la lista" });
        }
        // 📌 6️⃣ Extraer correos electrónicos válidos
        const recipients = contacts
            .map(getEmailFromContact)
            .filter((email) => email !== null)
            .map((email) => ({ email }));
        if (recipients.length === 0) {
            return res
                .status(400)
                .json({ message: "No hay correos electrónicos válidos en la lista" });
        }
        // 📌 7️⃣ Configurar la API de Brevo
        const client = new SibApiV3Sdk.ApiClient();
        client.authentications["api-key"].apiKey = masiveEmails.apiKey;
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi(client);
        // 📌 8️⃣ Verificar si hay más de 300 destinatarios y dividir en lotes
        const batchSize = 300;
        if (recipients.length > batchSize) {
            console.log(`⚡ Se detectaron ${recipients.length} destinatarios, enviando en lotes de 300...`);
            for (let i = 0; i < recipients.length; i += batchSize) {
                const batch = recipients.slice(i, i + batchSize);
                const emailData = {
                    sender: {
                        name: masiveEmails.senderName,
                        email: masiveEmails.senderEmail,
                    },
                    to: batch,
                    subject: campaign.name,
                    htmlContent: template.emailHtml,
                };
                console.log(`📤 Enviando lote de ${batch.length} correos...`);
                yield apiInstance.sendTransacEmail(emailData);
            }
        }
        else {
            // 📌 9️⃣ Si hay 300 o menos, enviar en una sola petición
            const emailData = {
                sender: {
                    name: masiveEmails.senderName,
                    email: masiveEmails.senderEmail,
                },
                to: recipients,
                subject: campaign.name,
                htmlContent: template.emailHtml,
            };
            console.log(`📤 Enviando ${recipients.length} correos en una sola petición...`);
            yield apiInstance.sendTransacEmail(emailData);
        }
        // 📌 🔟 Marcar la campaña como "sent"
        campaign.status = "sent";
        yield campaign.save();
        res.status(200).json({ message: "Campaña enviada exitosamente" });
    }
    catch (error) {
        console.error("❌ Error enviando campaña:", error);
        res.status(500).json({ message: "Error en el servidor", error });
    }
});
exports.sendEmailCampaign = sendEmailCampaign;
